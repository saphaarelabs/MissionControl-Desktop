import React, { useEffect, useMemo, useState } from 'react';
import { UserButton } from '@clerk/clerk-react';
import {
    Activity,
    Home,
    MessageSquare,
    Plus,
    Settings as SettingsIcon,
    ShieldCheck,
    X,
    Menu,
} from 'lucide-react';
import { apiAuthFetch, probeControlPlaneHealth } from '../lib/apiBase';
import CreateAgentModal from './CreateAgentModal';
import { desktopRouteHref, isDesktopApp } from '../lib/desktop';

function StatusPill({ label, status, tone = 'blue' }) {
    const palette = {
        blue: {
            online: 'border-blue-200 bg-blue-50 text-blue-700',
            offline: 'border-slate-200 bg-slate-100 text-slate-600',
            checking: 'border-slate-200 bg-white text-slate-500',
        },
        green: {
            online: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            offline: 'border-amber-200 bg-amber-50 text-amber-700',
            checking: 'border-slate-200 bg-white text-slate-500',
        },
    };

    const style = palette[tone]?.[status] || palette.blue.checking;
    const text =
        status === 'online' ? 'Online' :
        status === 'offline' ? 'Offline' :
        'Checking';

    return (
        <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] sm:flex ${style}`}>
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            {label} {text}
        </div>
    );
}

const Header = () => {
    const [gatewayStatus, setGatewayStatus] = useState('checking');
    const [controlPlaneStatus, setControlPlaneStatus] = useState('checking');
    const [workspaceStatus, setWorkspaceStatus] = useState('checking');
    const [agentCount, setAgentCount] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isSpawnOpen, setIsSpawnOpen] = useState(false);

    useEffect(() => {
        let active = true;

        const fetchGatewayStatus = async () => {
            try {
                const response = await apiAuthFetch('/api/health');
                const data = await response.json().catch(() => null);
                if (!active) return;
                setGatewayStatus(data?.status === 'online' ? 'online' : 'offline');
            } catch {
                if (!active) return;
                setGatewayStatus('offline');
            }
        };

        const fetchControlPlaneStatus = async () => {
            const probe = await probeControlPlaneHealth();
            if (!active) return;
            setControlPlaneStatus(probe.ok ? 'online' : 'offline');
        };

        const fetchAgentCount = async () => {
            try {
                const response = await apiAuthFetch(`/api/subagents?t=${Date.now()}`);
                if (!response.ok) return;
                const data = await response.json().catch(() => null);
                if (!active) return;
                const count = Array.isArray(data?.subagents) ? data.subagents.length : 0;
                setAgentCount(count);
            } catch {
                // ignore
            }
        };

        const fetchWorkspaceStatus = async () => {
            try {
                const response = await apiAuthFetch('/api/user/profile');
                if (!response.ok) return;
                const data = await response.json().catch(() => null);
                if (!active) return;
                const status = data?.profile?.operation_status || 'checking';
                setWorkspaceStatus(status);
            } catch {
                if (!active) return;
                setWorkspaceStatus('checking');
            }
        };

        const refresh = () => {
            fetchGatewayStatus();
            fetchControlPlaneStatus();
            fetchAgentCount();
            fetchWorkspaceStatus();
        };

        refresh();

        const healthInterval = setInterval(fetchGatewayStatus, 5000);
        const controlPlaneInterval = setInterval(fetchControlPlaneStatus, 15000);
        const profileInterval = setInterval(fetchWorkspaceStatus, 10000);
        const agentInterval = setInterval(fetchAgentCount, 60000);

        return () => {
            active = false;
            clearInterval(healthInterval);
            clearInterval(controlPlaneInterval);
            clearInterval(profileInterval);
            clearInterval(agentInterval);
        };
    }, []);

    const workspaceLabel = useMemo(() => {
        if (workspaceStatus === 'ready') return 'Workspace Ready';
        if (workspaceStatus === 'provisioning') return 'Provisioning';
        if (workspaceStatus === 'onboarded') return 'Queued';
        if (workspaceStatus === 'suspended') return 'Attention Needed';
        return 'Syncing';
    }, [workspaceStatus]);

    const workspaceTone = workspaceStatus === 'ready'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : workspaceStatus === 'suspended'
            ? 'text-amber-700 bg-amber-50 border-amber-200'
            : 'text-slate-700 bg-white border-slate-200';

    return (
        <header className="desktop-window-header sticky top-0 z-50 shrink-0 border-b border-slate-200/80 bg-white/90 text-slate-900 shadow-sm backdrop-blur-xl">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-3">
                    <div className="desktop-no-drag flex min-w-0 items-center gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 shadow-[0_14px_30px_rgba(37,99,235,0.24)] ring-1 ring-white/40">
                                <span className="text-sm font-black tracking-[0.2em] text-white">MT</span>
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-base font-black uppercase tracking-[0.24em] text-slate-900 sm:text-lg">
                                    Magic Teams
                                </h1>
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    <span>Mission Control</span>
                                    {isDesktopApp ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">Desktop</span> : null}
                                    <span className={`rounded-full border px-2 py-0.5 ${workspaceTone}`}>
                                        {workspaceLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="desktop-no-drag flex items-center gap-3">
                        <StatusPill label="Gateway" status={gatewayStatus} tone="green" />
                        <StatusPill label="Control Plane" status={controlPlaneStatus} tone="blue" />

                        <button
                            type="button"
                            onClick={() => setIsSpawnOpen(true)}
                            className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:flex"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Create Agents
                        </button>

                        <div className="hidden rounded-xl bg-slate-950 px-3 py-2 sm:block">
                            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white">
                                {agentCount} Agent{agentCount !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:hidden"
                            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
                            onClick={() => setMobileOpen((value) => !value)}
                        >
                            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <UserButton
                            afterSignOutUrl={desktopRouteHref('/')}
                            appearance={{
                                elements: {
                                    footer: 'hidden',
                                    rootBox: 'flex items-center',
                                },
                            }}
                        >
                            <UserButton.MenuItems>
                                <UserButton.Link
                                    label="Home"
                                    labelIcon={<Home className="h-4 w-4" />}
                                    href={desktopRouteHref('/app')}
                                />
                                <UserButton.Link
                                    label="Group chat"
                                    labelIcon={<MessageSquare className="h-4 w-4" />}
                                    href={desktopRouteHref('/app/groupchat')}
                                />
                                <UserButton.Link
                                    label="Settings"
                                    labelIcon={<SettingsIcon className="h-4 w-4" />}
                                    href={desktopRouteHref('/app/settings')}
                                />
                                <UserButton.Action label="manageAccount" />
                                <UserButton.Action label="signOut" />
                            </UserButton.MenuItems>
                        </UserButton>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="border-t border-slate-100 py-4 sm:hidden">
                        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Gateway</span>
                                <span className={`text-xs font-bold ${gatewayStatus === 'online' ? 'text-emerald-600' : gatewayStatus === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>
                                    {gatewayStatus === 'online' ? 'Online' : gatewayStatus === 'offline' ? 'Offline' : 'Checking'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Control Plane</span>
                                <span className={`text-xs font-bold ${controlPlaneStatus === 'online' ? 'text-blue-600' : controlPlaneStatus === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>
                                    {controlPlaneStatus === 'online' ? 'Online' : controlPlaneStatus === 'offline' ? 'Offline' : 'Checking'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</span>
                                <span className="text-xs font-bold text-slate-700">{workspaceLabel}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Agents</span>
                                <span className="text-sm font-bold text-slate-900">{agentCount}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setMobileOpen(false);
                                    setIsSpawnOpen(true);
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                            >
                                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                                Create Agent
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreateAgentModal
                isOpen={isSpawnOpen}
                onClose={() => setIsSpawnOpen(false)}
                onCreated={() => {
                    setIsSpawnOpen(false);
                    window.dispatchEvent(new Event('agentCreated'));
                }}
            />
        </header>
    );
};

export default Header;
