import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import Header from './Header';
import AgentSidebar from './AgentSidebar';
import FeedSidebar from './FeedSidebar';
import BroadcastSidebar from './BroadcastSidebar';
import AgentSettingsModal from './AgentSettingsModal';
import { apiAuthFetch } from '../lib/apiBase';

const Layout = () => {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const didSyncRef = useRef(false);
    const isHomePage = location.pathname === '/app' || location.pathname === '/app/';
    const isBroadcastPage = location.pathname === '/app/groupchat';
    const isSettingsPage = location.pathname === '/app/settings';

    const shouldShowLeftSidebar = isHomePage || isBroadcastPage;
    const shouldShowRightSidebar = isHomePage || isBroadcastPage;

    const [selectedAgent, setSelectedAgent] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    const startResizing = useCallback((e) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const startResizingRight = useCallback((e) => {
        e.preventDefault();
        setIsResizingRight(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
        setIsResizingRight(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 450) {
                setSidebarWidth(newWidth);
            }
        } else if (isResizingRight) {
            const newWidth = window.innerWidth - e.clientX;
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

    // Check if user has completed onboarding - redirect to onboarding if not
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        if (!user?.id) return;
        if (didSyncRef.current) return;

        const checkProfile = async () => {
            try {
                const res = await apiAuthFetch('/api/user/profile');
                if (res.ok) {
                    const { profile } = await res.json();
                    
                    // If no profile exists, user hasn't completed onboarding
                    if (!profile) {
                        console.log('[Layout] No profile found, redirecting to onboarding');
                        navigate('/onboarding', { replace: true });
                        return;
                    }
                    
                    // If profile exists but no operation_status, redirect to onboarding
                    if (!profile.operation_status) {
                        console.log('[Layout] Profile exists but not onboarded, redirecting to onboarding');
                        navigate('/onboarding', { replace: true });
                        return;
                    }
                    
                    console.log('[Layout] User has valid profile with status:', profile.operation_status);
                } else {
                    console.error('[Layout] Failed to fetch profile:', res.status);
                    // On error, redirect to onboarding to be safe
                    navigate('/onboarding', { replace: true });
                }
            } catch (err) {
                console.error('[Layout] Error checking profile:', err);
                navigate('/onboarding', { replace: true });
            }
        };

        didSyncRef.current = true;
        checkProfile();
    }, [isLoaded, isSignedIn, navigate, user]);

    const handleAgentClick = (agent) => {
        setSelectedAgent(agent);
        setIsSettingsOpen(true);
    };

    const handleAgentUpdate = () => {
        window.location.reload();
    };

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-white text-slate-900">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
                Skip to content
            </a>

            {/* Global Header spans full width at the top */}
            <Header isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* Below Header: Sidebar and Main Content */}
            <div className="flex flex-1 min-h-0 flex-row relative">

                {/* Desktop Global Sidebar */}
                {shouldShowLeftSidebar && (
                    <div
                        className={`hidden lg:flex flex-col border-r border-slate-200 shrink-0 h-full relative overflow-hidden ${!isResizing ? 'transition-[width] duration-300' : ''}`}
                        style={{
                            width: isSidebarOpen ? `${sidebarWidth}px` : '68px',
                            backgroundColor: isSidebarOpen ? 'white' : '#f8fafc' // slate-50
                        }}
                    >
                        <AgentSidebar
                            onAgentClick={handleAgentClick}
                            selectedAgentId={selectedAgent?.id}
                            embedded={true}
                            isSidebarOpen={isSidebarOpen}
                            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                        />

                        {/* Resize Handle */}
                        {isSidebarOpen && (
                            <div
                                onMouseDown={startResizing}
                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-50 ${isResizing ? 'bg-blue-500' : 'bg-transparent'}`}
                            />
                        )}
                    </div>
                )}

                <main id="main" className="min-w-0 flex-1 relative bg-white overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.02)]">
                    {/* Render specific route content */}
                    <div className="h-full w-full overflow-y-auto bg-white">
                        <Outlet />
                    </div>
                </main>

                {/* Right Sidebar: Feed & Chat */}
                {shouldShowRightSidebar && (
                    <div
                        className={`hidden xl:flex flex-col shrink-0 h-full relative overflow-hidden ${!isResizingRight ? 'transition-[width] duration-300' : ''}`}
                        style={{ width: `${rightSidebarWidth}px` }}
                    >
                        {/* Resize Handle (Left edge of right sidebar) */}
                        <div
                            onMouseDown={startResizingRight}
                            className={`absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50 transition-colors z-50 ${isResizingRight ? 'bg-blue-500' : 'bg-transparent'}`}
                        />
                        {isHomePage ? <FeedSidebar /> : <BroadcastSidebar />}
                    </div>
                )}
            </div>

            {/* Global Modals */}
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
