import React, { useState, useEffect } from 'react';

import { UserButton } from "@clerk/clerk-react";
import { apiAuthFetch, probeControlPlaneHealth } from '../lib/apiBase';
import { Menu, X, Plus, Home, MessageSquare, Settings as SettingsIcon, Activity } from 'lucide-react';
import CreateAgentModal from './CreateAgentModal';
import { desktopRouteHref, isDesktopApp } from '../lib/desktop';

const Header = ({ isSidebarOpen, toggleSidebar }) => {
    const [gatewayStatus, setGatewayStatus] = useState('offline');
    const [controlPlaneStatus, setControlPlaneStatus] = useState('offline');
    const [agentCount, setAgentCount] = useState(0);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isSpawnOpen, setIsSpawnOpen] = useState(false);

    useEffect(() => {
        fetchGatewayStatus();
        fetchControlPlaneStatus();
        fetchAgentCount();

        const healthInterval = setInterval(fetchGatewayStatus, 5000);
        const controlPlaneInterval = setInterval(fetchControlPlaneStatus, 15000);
        const agentInterval = setInterval(fetchAgentCount, 60_000);
        return () => {
            clearInterval(healthInterval);
            clearInterval(controlPlaneInterval);
            clearInterval(agentInterval);
        };
    }, []);

    const fetchGatewayStatus = async () => {
        try {
            const response = await apiAuthFetch('/api/health');
            const data = await response.json().catch(() => null);
            setGatewayStatus(data?.status === 'online' ? 'online' : 'offline');
        } catch {
            setGatewayStatus('offline');
        }
    };

    const fetchControlPlaneStatus = async () => {
        try {
            const probe = await probeControlPlaneHealth();
            setControlPlaneStatus(probe.ok ? 'online' : 'offline');
        } catch {
            setControlPlaneStatus('offline');
        }
    };

    const fetchAgentCount = async () => {
        try {
            const response = await apiAuthFetch(`/api/subagents?t=${Date.now()}`);
            if (!response.ok) return;
            const data = await response.json().catch(() => null);
            const count = Array.isArray(data?.subagents) ? data.subagents.length : 0;
            setAgentCount(count);
        } catch {
            // ignore
        }
    };

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
                                <h1 className="min-w-0 text-base font-black tracking-[0.24em] text-slate-900 sm:text-lg uppercase">
                                    Magic Teams
                                </h1>
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    <span>Mission Control</span>
                                    {isDesktopApp ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">Desktop</span> : null}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="desktop-no-drag flex items-center gap-3">
                        <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] sm:flex ${
                            gatewayStatus === 'online'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}>
                            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                            {gatewayStatus === 'online' ? 'Gateway Online' : 'Gateway Offline'}
                        </div>
                        <div className={`hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] lg:flex ${
                            controlPlaneStatus === 'online'
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}>
                            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                            {controlPlaneStatus === 'online' ? 'Control Plane Online' : 'Control Plane Offline'}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsSpawnOpen(true)}
                            className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 uppercase tracking-wider"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Create Agents
                        </button>

                        <div className="hidden rounded-lg bg-blue-600 px-3 py-1.5 sm:block">
                            <span className="text-[11px] font-extrabold tabular-nums text-white uppercase tracking-wider">
                                {agentCount} Agent{agentCount !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:hidden"
                            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
                            onClick={() => setMobileOpen((v) => !v)}
                        >
                            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                        </button>

                        <UserButton
                            afterSignOutUrl={desktopRouteHref('/')}
                            appearance={{
                                elements: {
                                    footer: "hidden",
                                    rootBox: "flex items-center"
                                }
                            }}
                        >
                            <UserButton.MenuItems>
                                <UserButton.Link
                                    label="Home"
                                    labelIcon={<Home className="w-4 h-4" />}
                                    href={desktopRouteHref('/app')}
                                />
                                <UserButton.Link
                                    label="Group chat"
                                    labelIcon={<MessageSquare className="w-4 h-4" />}
                                    href={desktopRouteHref('/app/groupchat')}
                                />
                                <UserButton.Link
                                    label="Settings"
                                    labelIcon={<SettingsIcon className="w-4 h-4" />}
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
                        <div className="mb-3 flex flex-col gap-3 rounded-lg bg-slate-50 px-3 py-3 border border-slate-100" aria-live="polite">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold tabular-nums text-blue-600">
                                    {agentCount} {agentCount === 1 ? 'Agent' : 'Agents'}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setMobileOpen(false);
                                    setIsSpawnOpen(true);
                                }}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Create Agents
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
                    fetchAgentCount();
                    window.dispatchEvent(new Event('agentCreated'));
                }}
            />
        </header>
    );
};

export default Header;
