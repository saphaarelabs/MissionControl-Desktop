import { desktopConfig } from './desktop';

const DEFAULT_BACKEND_BASE = 'https://mission-control-backend-topaz.vercel.app';
const DEFAULT_CONTROL_PLANE_BASE = 'https://mission-control-control-plane.vercel.app';

const API_BASE =
    desktopConfig().backendBase
    || import.meta.env.VITE_API_BASE
    || (typeof window !== 'undefined' && window.__API_BASE__)
    || DEFAULT_BACKEND_BASE;

const CONTROL_PLANE_BASE =
    desktopConfig().controlPlaneUrl
    || import.meta.env.VITE_CONTROL_PLANE_URL
    || (typeof window !== 'undefined' && window.__CONTROL_PLANE_URL__)
    || DEFAULT_CONTROL_PLANE_BASE;

export function apiUrl(path) {
    if (!path) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!API_BASE) return normalized;
    return `${API_BASE.replace(/\/$/, '')}${normalized}`;
}

export function controlPlaneUrl(path) {
    if (!path) return CONTROL_PLANE_BASE;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!CONTROL_PLANE_BASE) return normalized;
    return `${CONTROL_PLANE_BASE.replace(/\/$/, '')}${normalized}`;
}

export async function getClerkJwt() {
    try {
        if (typeof window === 'undefined') return null;
        const clerk = window.Clerk;
        if (!clerk?.session?.getToken) return null;
        const token = await clerk.session.getToken();
        return typeof token === 'string' && token.trim() ? token : null;
    } catch {
        return null;
    }
}

export async function apiAuthFetch(input, options = {}) {
    const token = await getClerkJwt();
    const headers = new Headers(options.headers || {});

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const target = typeof input === 'string' ? apiUrl(input) : input;
    const method = (options.method || 'GET').toUpperCase();
    const url = typeof target === 'string' ? target : String(target);

    if (!token) {
        console.warn(`[api] ${method} ${url} — no Clerk JWT (Clerk not ready yet?)`);
    }

    const res = await fetch(target, { ...options, headers });

    const flag = res.ok ? '✓' : res.status >= 500 ? '✗' : '!';
    console.log(`[api] ${flag} ${method} ${url} → ${res.status}`);

    return res;
}

export async function probeBackendHealth() {
    try {
        const res = await fetch(apiUrl('/api/health'));
        const data = await res.json().catch(() => null);
        return {
            ok: res.ok,
            status: res.status,
            data,
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            error,
        };
    }
}

export async function probeControlPlaneHealth() {
    try {
        const res = await fetch(controlPlaneUrl('/healthz'));
        const data = await res.json().catch(() => null);
        return {
            ok: res.ok && Boolean(data?.ok),
            status: res.status,
            data,
        };
    } catch (error) {
        return {
            ok: false,
            status: 0,
            error,
        };
    }
}
