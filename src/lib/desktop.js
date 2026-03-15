export const desktopBridge =
  typeof window !== 'undefined' ? window.missionControlDesktop : null;

export const isDesktopApp = Boolean(desktopBridge?.isDesktop);

export function desktopConfig() {
  return desktopBridge?.config || {
    backendBase: 'https://mission-control-backend-topaz.vercel.app',
    controlPlaneUrl: 'https://mission-control-control-plane.vercel.app',
    protocol: 'missioncontrol',
  };
}

function normalizeRoute(path) {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function desktopRouteHref(path) {
  const route = normalizeRoute(path);
  return isDesktopApp ? `#${route}` : route;
}

export function openExternal(url) {
  if (desktopBridge?.openExternal) {
    return desktopBridge.openExternal(url);
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return Promise.resolve(false);
}

function normalizeDesktopRoute(payload) {
  if (!payload?.route) return null;
  const route = payload.route.startsWith('/') ? payload.route : `/${payload.route}`;
  return {
    route,
    search: payload.search || '',
  };
}

export function clearDesktopSearch() {
  if (typeof window === 'undefined') return;
  const current = new URL(window.location.href);
  current.search = '';
  window.history.replaceState(window.history.state, '', current.toString());
}

export function clearPendingDesktopDeepLink() {
  if (!desktopBridge?.clearPendingDeepLink) return Promise.resolve(false);
  return desktopBridge.clearPendingDeepLink();
}

export function subscribeToDesktopDeepLinks(onRoute) {
  if (!desktopBridge?.onDeepLink || typeof onRoute !== 'function') return () => {};
  return desktopBridge.onDeepLink((payload) => {
    const normalized = normalizeDesktopRoute(payload);
    if (normalized) onRoute(normalized);
  });
}

export async function getInitialDesktopRoute() {
  if (!desktopBridge?.getLaunchContext) return null;
  const launchContext = await desktopBridge.getLaunchContext();
  return normalizeDesktopRoute(launchContext?.pendingDeepLink);
}
