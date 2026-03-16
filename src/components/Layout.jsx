import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Header from './Header';
import AgentSidebar from './AgentSidebar';
import FeedSidebar from './FeedSidebar';
import BroadcastSidebar from './BroadcastSidebar';
import AgentSettingsModal from './AgentSettingsModal';
import { apiAuthFetch } from '../lib/apiBase';

function AccessState({ title, body, actionLabel, onAction }) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 py-16">
            <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                    <AlertTriangle className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                >
                    <RefreshCcw className="h-4 w-4" />
                    {actionLabel}
                </button>
            </div>
        </div>
    );
}

const Layout = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isHomePage = location.pathname === '/app' || location.pathname === '/app/';
    const isBroadcastPage = location.pathname === '/app/groupchat';

    const shouldShowLeftSidebar = isHomePage || isBroadcastPage;
    const shouldShowRightSidebar = isHomePage || isBroadcastPage;

    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [accessState, setAccessState] = useState({
        loading: true,
        error: '',
        status: '',
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem('isSidebarOpen');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('isSidebarOpen', JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isResizing, setIsResizing] = useState(false);

    const [rightSidebarWidth, setRightSidebarWidth] = useState(320);
    const [isResizingRight, setIsResizingRight] = useState(false);

    const checkProfile = useCallback(async () => {
        if (!isLoaded || !isSignedIn || !user?.id) return;

        setAccessState((previous) => ({ ...previous, loading: true, error: '' }));

        try {
            const res = await apiAuthFetch('/api/user/profile');
            if (!res.ok) {
                throw new Error(`Profile request failed with ${res.status}`);
            }

            const { profile } = await res.json();
            const status = profile?.operation_status || '';

            if (!profile || !status) {
                navigate('/onboarding', { replace: true });
                return;
            }

            if (status === 'onboarded' || status === 'provisioning') {
                navigate('/provisioning', { replace: true });
                return;
            }

            if (status === 'suspended') {
                setAccessState({
                    loading: false,
                    error: '',
                    status: 'suspended',
                });
                return;
            }

            setAccessState({
                loading: false,
                error: '',
                status,
            });
        } catch (error) {
            setAccessState({
                loading: false,
                error: error?.message || 'Unable to verify workspace status.',
                status: '',
            });
        }
    }, [isLoaded, isSignedIn, navigate, user]);

    useEffect(() => {
        checkProfile();
    }, [checkProfile]);

    const startResizing = useCallback((event) => {
        event.preventDefault();
        setIsResizing(true);
    }, []);

    const startResizingRight = useCallback((event) => {
        event.preventDefault();
        setIsResizingRight(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
        setIsResizingRight(false);
    }, []);

    const resize = useCallback((event) => {
        if (isResizing) {
            const newWidth = event.clientX;
            if (newWidth >= 200 && newWidth <= 450) {
                setSidebarWidth(newWidth);
            }
        } else if (isResizingRight) {
            const newWidth = window.innerWidth - event.clientX;
            if (newWidth >= 250 && newWidth <= 600) {
                setRightSidebarWidth(newWidth);
            }
        }
    }, [isResizing, isResizingRight]);

    useEffect(() => {
        if (isResizing || isResizingRight) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, isResizingRight, resize, stopResizing]);

    const handleAgentClick = (agent) => {
        setSelectedAgent(agent);
        setIsSettingsOpen(true);
    };

    const handleAgentUpdate = () => {
        window.location.reload();
    };

    if (accessState.loading) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6">
                <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
                    </div>
                    <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">Loading your workspace</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        We are checking your current environment and routing you to the right place.
                    </p>
                </div>
            </div>
        );
    }

    if (accessState.status === 'suspended') {
        return (
            <AccessState
                title="Workspace needs attention"
                body="Your account is currently suspended, so we are holding access to the command center. If this is unexpected, contact support before retrying."
                actionLabel="Check again"
                onAction={checkProfile}
            />
        );
    }

    if (accessState.error) {
        return (
            <AccessState
                title="We could not confirm your workspace status"
                body={`${accessState.error} This usually means the backend is temporarily unavailable or your session needs another moment to settle.`}
                actionLabel="Retry"
                onAction={checkProfile}
            />
        );
    }

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#f8fafc] text-slate-900">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
                Skip to content
            </a>

            <Header />

            <div className="relative flex min-h-0 flex-1 flex-row">
                {shouldShowLeftSidebar && (
                    <div
                        className={`relative hidden h-full shrink-0 overflow-hidden border-r border-slate-200/80 bg-white lg:flex lg:flex-col ${!isResizing ? 'transition-[width] duration-300' : ''}`}
                        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '68px' }}
                    >
                        <AgentSidebar
                            onAgentClick={handleAgentClick}
                            selectedAgentId={selectedAgent?.id}
                            embedded={true}
                            isSidebarOpen={isSidebarOpen}
                            toggleSidebar={() => setIsSidebarOpen((value) => !value)}
                        />

                        {isSidebarOpen && (
                            <div
                                onMouseDown={startResizing}
                                className={`absolute right-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400/50'}`}
                            />
                        )}
                    </div>
                )}

                <main id="main" className="relative min-w-0 flex-1 overflow-hidden bg-[#f4f7fb]">
                    <div className="h-full w-full overflow-y-auto">
                        <Outlet />
                    </div>
                </main>

                {shouldShowRightSidebar && (
                    <div
                        className={`relative hidden h-full shrink-0 overflow-hidden border-l border-slate-200/80 bg-white xl:flex xl:flex-col ${!isResizingRight ? 'transition-[width] duration-300' : ''}`}
                        style={{ width: `${rightSidebarWidth}px` }}
                    >
                        <div
                            onMouseDown={startResizingRight}
                            className={`absolute left-0 top-0 z-50 h-full w-1 cursor-col-resize transition-colors ${isResizingRight ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-400/50'}`}
                        />
                        {isHomePage ? <FeedSidebar /> : <BroadcastSidebar />}
                    </div>
                )}
            </div>

            <AgentSettingsModal
                agent={selectedAgent}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onUpdate={handleAgentUpdate}
            />
        </div>
    );
};

export default Layout;
