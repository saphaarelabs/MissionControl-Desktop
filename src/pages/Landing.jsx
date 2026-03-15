import React from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { ArrowRight, Bot, Zap, Globe, Calendar, Search, FileText, Users, Plane, Mail, ShoppingCart, Database, Bell, BarChart, ShieldCheck, LayoutDashboard, Home, MessageSquare, Settings, Crown, PenTool, Code, Info } from 'lucide-react';
import { motion, useScroll, useTransform, animate, useInView } from 'framer-motion';
import { probeBackendHealth, probeControlPlaneHealth } from '../lib/apiBase';

const Landing = () => {
    const { isSignedIn, isLoaded } = useUser();
    const location = useLocation();
    const loginState = location.state ? { from: location.state.from } : null;
    const [serviceStatus, setServiceStatus] = React.useState({
        backend: 'checking',
        controlPlane: 'checking',
    });

    React.useEffect(() => {
        let active = true;

        const checkServices = async () => {
            const [backend, controlPlane] = await Promise.all([
                probeBackendHealth(),
                probeControlPlaneHealth(),
            ]);

            if (!active) return;

            setServiceStatus({
                backend: backend.ok ? 'online' : 'offline',
                controlPlane: controlPlane.ok ? 'online' : 'offline',
            });
        };

        checkServices();
        return () => {
            active = false;
        };
    }, []);

    if (isLoaded && isSignedIn) {
        return <Navigate to="/app" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-200 selection:text-slate-900 overflow-hidden">
            {/* Background Shapes */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-6%] left-[8%] w-[18rem] h-[18rem] bg-blue-100/60 rounded-full" />
                <div className="absolute bottom-[4%] right-[6%] w-[16rem] h-[16rem] bg-emerald-100/70 rounded-full" />
                <div className="absolute top-[22%] right-[18%] w-[10rem] h-[10rem] bg-blue-100/70 rounded-full" />
            </div>

            {/* Navbar */}
            <nav className="relative z-10 container mx-auto flex items-center justify-between px-6 py-6">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Bot className="w-5 h-5 text-white" aria-hidden="true" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Magic Teams</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        to="/sign-in"
                        state={loginState}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Login
                    </Link>
                    <Link
                        to="/sign-up"
                        className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-full shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Sign Up
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 container mx-auto px-6 pt-20 pb-0 md:pt-28 text-center">
                <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <span className={`flex h-2 w-2 rounded-full ${serviceStatus.backend === 'online' ? 'bg-emerald-500' : serviceStatus.backend === 'offline' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                        <span className="text-xs font-medium text-slate-600">
                            Backend {serviceStatus.backend === 'online' ? 'Online' : serviceStatus.backend === 'offline' ? 'Offline' : 'Checking'}
                        </span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <span className={`flex h-2 w-2 rounded-full ${serviceStatus.controlPlane === 'online' ? 'bg-blue-500' : serviceStatus.controlPlane === 'offline' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                        <span className="text-xs font-medium text-slate-600">
                            Control Plane {serviceStatus.controlPlane === 'online' ? 'Online' : serviceStatus.controlPlane === 'offline' ? 'Offline' : 'Checking'}
                        </span>
                    </div>
                </div>

                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-slate-900">
                    Orchestrate Your
                    <br />
                    AI Workforce
                </h1>

                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
                    Assign tasks, monitor progress, and scale your operations with autonomous AI agents.
                    The command center for your digital workforce.
                </p>

                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link
                        to="/sign-up"
                        className="group relative rounded-full bg-blue-600 px-8 py-4 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Get Started
                        <ArrowRight className="ml-2 inline-block h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                    <Link
                        to="/sign-in"
                        state={loginState}
                        className="rounded-full bg-white px-8 py-4 font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                        Log In
                    </Link>
                </div>

                {/* Verification/Comparison Section */}
                <ComparisonSection />

                {/* Command Center Preview Section */}
                <CommandCenterSection />

                {/* How It Works Section */}
                <HowItWorksSection />

                {/* Use Cases Marquee Section */}
                <UseCasesSection />


            </main>
            {/* Footer */}
            <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-slate-200/60 mt-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm opacity-90">
                            <Bot className="w-4 h-4 text-white" aria-hidden="true" />
                        </div>
                        <span className="font-bold tracking-tight text-slate-900">Magic Teams</span>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Features</a>
                        <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Pricing</a>
                        <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Documentation</a>
                    </div>
                    <div className="text-sm text-slate-400 font-medium">
                        &copy; {new Date().getFullYear()} OpenClaw. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-slate-300">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
);

const CommandCenterSection = () => {
    const [activeView, setActiveView] = React.useState('home');
    const [progress, setProgress] = React.useState(0);
    const targetProgress = 75;
    const [hoverKey, setHoverKey] = React.useState(0);

    React.useEffect(() => {
        if (activeView === 'home') {
            setProgress(0); // reset before playing
            const timer = setTimeout(() => {
                setProgress(targetProgress);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setProgress(0);
        }
    }, [activeView, hoverKey]);

    const sidebarItems = [
        { id: 'home', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lucide lucide-home"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>, title: 'Home' },
        { id: 'teams', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></svg>, title: 'My Squad' },
        { id: 'chat', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lucide lucide-message-square"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path></svg>, title: 'Squad Chat' },
        { id: 'settings', icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lucide lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>, title: 'Settings' },
    ];

    return (
        <section
            className="command-center container mx-auto px-6 animate"
            onMouseEnter={() => setHoverKey(prev => prev + 1)}
        >
            <div className="command-center-header">
                <h2 className="section-title text-slate-900">Command Center</h2>
                <p className="section-subtitle">Real-time oversight of your autonomous workforce.</p>
            </div>

            <div className="mission-control-preview" key={`mc-preview-${hoverKey}`}>
                <div className="mc-header">
                    <div className="mc-title text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
                    </div>
                    <div className="mc-stats">
                        <div className="stat">
                            <span className="label">Active Tasks</span>
                            <span className="value">12</span>
                        </div>
                        <div className="stat">
                            <span className="label">Agents Online</span>
                            <span className="value">48</span>
                        </div>
                    </div>
                </div>

                <div className="mc-browser-frame flex-col md:flex-row">
                    {/* Sidebar Navigation */}
                    <div className="mc-sidebar border-b md:border-b-0 md:border-r">
                        {sidebarItems.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setActiveView(item.id)}
                                className={`sidebar-item ${activeView === item.id ? 'active' : ''}`}
                                data-view={item.id}
                                title={item.title}
                            >
                                {item.icon}
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Content Area */}
                    <div className="mc-content overflow-y-auto">
                        <motion.div
                            key={`${activeView}-${hoverKey}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="h-full"
                        >
                            {activeView === 'home' && (
                                <div className="mc-view active" id="view-home">
                                    <div className="mc-dashboard-grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="mc-card agent-status">
                                            <h4 className="font-bold text-slate-900 mb-6 font-sans">Squad Activity</h4>
                                            <div className="activity-list">
                                                <ActivityItem dotClass="lead" agent="Luffy" text="Delegated search task to Sanji" delay={300} />
                                                <ActivityItem dotClass="writer" agent="Nami" text="Finished drafting blog post #4" delay={1800} />
                                                <ActivityItem dotClass="researcher" agent="Sanji" text="Analyzing competitor pricing..." delay={3500} />
                                                <ActivityItem dotClass="dev" agent="Zoro" text="Optimized technical stack latency" delay={5200} />
                                            </div>
                                        </div>

                                        <div className="mc-card task-progress">
                                            <h4 className="font-bold text-slate-900 mb-6 font-sans">Task: Market Expansion</h4>
                                            <div className="progress-bar-container">
                                                <div
                                                    className="progress-bar"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <p className="text-sm font-medium text-slate-500 mt-4">
                                                <span className="progress-val font-bold text-slate-900 tabular-nums">
                                                    <SmoothCounter target={progress} />
                                                </span>% Complete · 4 agents engaged
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeView === 'teams' && (
                                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm h-full flex flex-col justify-center">
                                    <h4 className="text-sm font-bold text-slate-900 mb-12">Squad Census</h4>

                                    <div className="grid grid-cols-3 gap-8 mb-16">
                                        <div className="text-center">
                                            <div className="text-4xl font-extrabold text-blue-600 mb-2 tabular-nums">
                                                <SmoothCounter target={48} />
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Agents</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-4xl font-extrabold text-blue-600 mb-2 tabular-nums">
                                                <SmoothCounter target={12} />
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dedicated Teams</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-4xl font-extrabold text-blue-600 mb-2 tabular-nums">
                                                <SmoothCounter target={1.2} isFloat={true} />M
                                            </div>
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tasks Handled</div>
                                        </div>
                                    </div>

                                    <h5 className="text-xs font-bold text-slate-900 mb-6 font-sans">Key Command Members</h5>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm hover:border-slate-300 transition-all cursor-default group">
                                            <Crown className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-bold text-slate-700">Luffy</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm hover:border-slate-300 transition-all cursor-default group">
                                            <PenTool className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-bold text-slate-700">Nami</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm hover:border-slate-300 transition-all cursor-default group">
                                            <Search className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-bold text-slate-700">Sanji</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full shadow-sm hover:border-slate-300 transition-all cursor-default group">
                                            <Code className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                                            <span className="text-sm font-bold text-slate-700">Zoro (Tech Wizard)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeView === 'chat' && (
                                <div className="flex flex-col gap-4 max-w-md">
                                    <ChatMessage agent="Luffy" text="Sanji, update on the competitor analysis?" isMe={false} delay={500} />
                                    <ChatMessage agent="Sanji" text="Almost done, Zoro found some interesting latency issues in their stack." isMe={false} delay={2500} />
                                    <ChatMessage agent="Zoro" text="Fixed. Stack is now 40% faster." isMe={false} delay={5500} />
                                    <ChatMessage agent="System" text="Task 'Market Research' progress updated to 75%" isMe={true} delay={8000} />
                                </div>
                            )}

                            {activeView === 'settings' && (
                                <div className="space-y-6">
                                    <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                                        <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-8 text-center">Channel Configuration</h5>
                                        <div className="space-y-6 max-w-2xl mx-auto">
                                            <SettingToggle label="Telegram Notifications" initialValue={true} />
                                            <SettingToggle label="WhatsApp Bridge" initialValue={false} />
                                            <SettingToggle label="Auto-Scaling Tasks" initialValue={true} />
                                            <SettingToggle label="iMessage Sync" initialValue={false} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const SmoothCounter = ({ target, isFloat = false }) => {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
        const controls = animate(count, target, {
            duration: 3.5,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => setCount(isFloat ? value.toFixed(1) : Math.round(value))
        });
        return controls.stop;
    }, [target, isFloat]);

    return <span>{count}</span>;
};

const SettingToggle = ({ label, initialValue }) => {
    const [isOn, setIsOn] = React.useState(initialValue);

    return (
        <div className="flex items-center justify-between group cursor-pointer" onClick={() => setIsOn(!isOn)}>
            <span className="text-base font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
            <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${isOn ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <motion.div
                    className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ x: isOn ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </div>
        </div>
    );
};

const ActivityItem = ({ dotClass, agent, text, delay = 0 }) => {
    const [displayedText, setDisplayedText] = React.useState('');
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setShow(true);
            let i = 0;
            const interval = setInterval(() => {
                setDisplayedText(text.slice(0, i + 1));
                i++;
                if (i >= text.length) {
                    clearInterval(interval);
                }
            }, 30);
            return () => clearInterval(interval);
        }, delay);
        return () => clearTimeout(timeout);
    }, [text, delay]);

    if (!show) return <div className="h-5" />; // maintain height while hidden

    return (
        <div className="activity-item animate-in fade-in slide-in-from-left-2 duration-500">
            <div className={`activity-dot ${dotClass} shrink-0`} />
            <span><strong className="text-slate-900">{agent}:</strong> {displayedText}</span>
        </div>
    );
};

const AgentCard = ({ name, role, status, color }) => (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center gap-4 hover:border-slate-300 transition-colors">
        <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-xs`}>{name[0]}</div>
        <div className="flex-1">
            <h5 className="text-sm font-bold text-slate-900">{name}</h5>
            <p className="text-[10px] text-slate-500 font-medium">{role}</p>
        </div>
        <div className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-400 uppercase tracking-tighter shadow-sm">{status}</div>
    </div>
);

const ChatMessage = ({ agent, text, isMe, delay = 0 }) => {
    const [displayedText, setDisplayedText] = React.useState('');
    const [status, setStatus] = React.useState('hidden'); // hidden, typing, displaying, done

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setStatus('typing');

            const dotsTimeout = setTimeout(() => {
                setStatus('displaying');
                let i = 0;
                const interval = setInterval(() => {
                    setDisplayedText(text.slice(0, i + 1));
                    i++;
                    if (i >= text.length) {
                        clearInterval(interval);
                        setStatus('done');
                    }
                }, 30);
                return () => clearInterval(interval);
            }, 1000); // show typing dots for 1s

            return () => clearTimeout(dotsTimeout);
        }, delay);

        return () => clearTimeout(timeout);
    }, [text, delay]);

    if (status === 'hidden') return null;

    return (
        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
            {!isMe && <span className="text-[10px] font-bold text-slate-400 ml-2">{agent}</span>}
            <div className={`px-4 py-2 rounded-2xl text-xs max-w-[90%] shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200'}`}>
                {status === 'typing' ? (
                    <div className="flex gap-1 py-1 px-1">
                        <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                ) : (
                    <>
                        {displayedText}
                        {status === 'displaying' && <span className="ml-1 inline-block w-1 h-3 bg-blue-400 animate-pulse">|</span>}
                    </>
                )}
            </div>
        </div>
    );
};

export default Landing;

const HowItWorksSection = () => {
    const containerRef = React.useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end center"]
    });

    const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

    const steps = [
        {
            num: 1,
            title: "Define Your Task",
            desc: "Enter your goal. Whether it's marketing, research, or development—we'll build the squad."
        },
        {
            num: 2,
            title: "Select Your Squad",
            desc: "Pick specialized agents like Luffy (Lead), Nami (Architect), Sanji (Researcher), or Zoro (Builder) for your team."
        },
        {
            num: 3,
            title: "Connect Channel",
            desc: "Seamlessly integrate with Telegram or WhatsApp for real-time task updates."
        },
        {
            num: 4,
            title: "Launch Control",
            desc: "One-click deploy to launch your 24/7 active AI squad. No servers to manage."
        },
        {
            num: 5,
            title: "Monitor Progress",
            desc: "Track your squad's activity and task status in your secure Task Control dashboard."
        }
    ];

    return (
        <div className="mt-32 border-t border-slate-200/60 pt-24 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900">How It Works</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-20 leading-relaxed font-medium">
                From zero to AI assistant in minutes. No DevOps required.
            </p>

            <div ref={containerRef} className="relative max-w-4xl mx-auto px-6 pb-20 text-left">
                {/* Background line */}
                <div className="absolute left-[3.25rem] md:left-1/2 top-0 bottom-0 w-1 bg-slate-200 -translate-x-1/2 rounded-full" />

                {/* Animated fill line */}
                <motion.div
                    className="absolute left-[3.25rem] md:left-1/2 top-0 bottom-0 w-1 bg-blue-600 -translate-x-1/2 origin-top rounded-full z-0"
                    style={{ scaleY }}
                />

                <div className="space-y-24">
                    {steps.map((step, index) => (
                        <HowItWorksStep key={step.num} step={step} index={index} />
                    ))}
                </div>
            </div>
        </div>
    );
};

const HowItWorksStep = ({ step, index }) => {
    const isEven = index % 2 !== 0; // Alternate layout

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "5000px 0px -50% 0px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`relative flex flex-col md:flex-row items-center md:items-stretch justify-start md:justify-center w-full min-h-[160px] ${isEven ? 'md:flex-row-reverse' : ''}`}
        >
            {/* Desktop spacer for alternating layout */}
            <div className="hidden md:block w-1/2" />

            {/* Content box */}
            <div className={`w-full pl-24 md:pl-0 md:w-1/2 relative z-10 flex flex-col justify-center ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'}`}>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                    <h3 className="text-2xl font-bold mb-3 text-slate-900">{step.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-lg">{step.desc}</p>
                </div>
            </div>

            {/* Center Node / Dot */}
            <motion.div
                initial={{ scale: 0, opacity: 0, backgroundColor: "#ffffff", color: "#2563eb", borderColor: "#cbd5e1" }}
                whileInView={{ scale: 1, opacity: 1, backgroundColor: "#ffffff", color: "#2563eb", borderColor: "#2563eb" }}
                viewport={{ once: false, margin: "5000px 0px -50% 0px" }}
                transition={{ duration: 0.3, ease: "backOut" }}
                className="absolute left-[3.25rem] md:left-1/2 top-1/2 -translate-y-1/2 w-12 h-12 border-2 rounded-full flex items-center justify-center font-bold text-xl shadow-sm -translate-x-1/2 z-20"
            >
                {step.num}
            </motion.div>
        </motion.div>
    );
};

const UseCasesSection = () => {
    const row1 = [
        { icon: <Calendar className="w-5 h-5" />, text: "Schedule meetings" },
        { icon: <Search className="w-5 h-5" />, text: "Research competitors" },
        { icon: <FileText className="w-5 h-5" />, text: "Write contracts" },
        { icon: <Users className="w-5 h-5" />, text: "Manage leads" },
        { icon: <Plane className="w-5 h-5" />, text: "Book flights" },
        { icon: <Mail className="w-5 h-5" />, text: "Draft emails" },
    ];

    const row2 = [
        { icon: <ShoppingCart className="w-5 h-5" />, text: "Track expenses" },
        { icon: <Globe className="w-5 h-5" />, text: "Translate messages" },
        { icon: <Database className="w-5 h-5" />, text: "Organize data" },
        { icon: <Bell className="w-5 h-5" />, text: "Setup alerts" },
        { icon: <BarChart className="w-5 h-5" />, text: "Analyze markets" },
        { icon: <ShieldCheck className="w-5 h-5" />, text: "Screen outreach" },
    ];

    return (
        <section className="mt-32 py-16 overflow-hidden">
            <div className="container mx-auto px-6 text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">What can MagicTeams do for you?</h2>
                <p className="text-xl text-slate-500 font-medium">One assistant, thousands of use cases</p>
            </div>

            <div className="flex flex-col gap-8 pause-marquee">
                {/* Row 1: Left */}
                <div className="flex overflow-hidden marquee-mask select-none gap-6 py-4 -my-4">
                    <div className="flex shrink-0 items-center justify-around min-w-full gap-6 animate-marquee-left">
                        {row1.map((item, i) => (
                            <UseCaseCard key={i} icon={item.icon} text={item.text} />
                        ))}
                    </div>
                    {/* Seamless Loop Duplicate */}
                    <div className="flex shrink-0 items-center justify-around min-w-full gap-6 animate-marquee-left" aria-hidden="true">
                        {row1.map((item, i) => (
                            <UseCaseCard key={`dup-${i}`} icon={item.icon} text={item.text} />
                        ))}
                    </div>
                </div>

                {/* Row 2: Right */}
                <div className="flex overflow-hidden marquee-mask select-none gap-6 py-4 -my-4">
                    <div className="flex shrink-0 items-center justify-around min-w-full gap-6 animate-marquee-right">
                        {row2.map((item, i) => (
                            <UseCaseCard key={i} icon={item.icon} text={item.text} />
                        ))}
                    </div>
                    {/* Seamless Loop Duplicate */}
                    <div className="flex shrink-0 items-center justify-around min-w-full gap-6 animate-marquee-right" aria-hidden="true">
                        {row2.map((item, i) => (
                            <UseCaseCard key={`dup-${i}`} icon={item.icon} text={item.text} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

const UseCaseCard = ({ icon, text }) => (
    <div className="use-case-card bg-white border border-slate-100 rounded-full px-7 py-3 flex items-center gap-3 whitespace-nowrap shadow-sm hover:border-blue-500 hover:text-blue-600 transition-all cursor-default">
        <div className="text-blue-600">
            {icon}
        </div>
        <span className="text-slate-900 font-bold tracking-tight">{text}</span>
    </div>
);

const AnimListItem = ({ text, time, delay, isInView, itemVariants }) => {
    const [count, setCount] = React.useState(0);

    React.useEffect(() => {
        if (isInView) {
            const controls = animate(0, time, {
                duration: 1,
                delay: delay,
                ease: "easeOut",
                onUpdate: (v) => setCount(Math.round(v))
            });
            return controls.stop;
        }
    }, [isInView, time, delay]);

    return (
        <motion.li variants={itemVariants}>
            <span className="step-text">{text}</span>
            <span className="step-time">{count}m</span>
        </motion.li>
    );
};

const ComparisonSection = () => {
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const [hoverKey, setHoverKey] = React.useState(0);

    const totalTarget = 60;
    const [totalCount, setTotalCount] = React.useState(0);

    React.useEffect(() => {
        if (isInView) {
            setTotalCount(0); // reset
            const totalControls = animate(0, totalTarget, {
                duration: 1.5,
                delay: 1.5, // Start after list items
                ease: "easeOut",
                onUpdate: (v) => setTotalCount(Math.round(v))
            });
            return () => {
                totalControls.stop();
            };
        }
    }, [isInView, hoverKey]);

    const items = [
        { text: "Creating & Securing SSH Keys", time: 10 },
        { text: "Manual Server Configuration", time: 15 },
        { text: "Node.js & Environment Setup", time: 10 },
        { text: "AI Engine Installation", time: 15 },
        { text: "Channel Integration (Telegram/WA)", time: 10 },
    ];

    const listVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.25,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <section
            className="comparison container mx-auto px-6 mt-32"
            ref={ref}
            onMouseEnter={() => setHoverKey(prev => prev + 1)}
        >
            <div className="comparison-header text-center mb-16">
                <h2 className="section-title text-3xl md:text-5xl font-bold tracking-tight mb-4 text-slate-900">The Effort vs. The Magic</h2>
                <p className="section-subtitle text-xl text-slate-500 font-medium max-w-2xl mx-auto">Why wait hours when you can start in seconds?</p>
            </div>

            <div className="comparison-cards">
                {/* The Hard Way Card */}
                <div className="comp-card manual-way">
                    <div className="card-tag">The Hard Way</div>
                    <motion.ul
                        key={`ul-${hoverKey}`}
                        className="pain-points"
                        variants={listVariants}
                        initial="hidden"
                        animate={isInView ? "visible" : "hidden"}
                    >
                        {items.map((item, idx) => (
                            <AnimListItem
                                key={idx}
                                text={item.text}
                                time={item.time}
                                delay={0.1 + idx * 0.25}
                                isInView={isInView}
                                itemVariants={itemVariants}
                            />
                        ))}
                    </motion.ul>
                    <div className="card-footer">
                        <div className="total-label">Approx. Setup Time</div>
                        <div className="total-value">{totalCount}+ min</div>
                    </div>
                </div>

                {/* MagicTeams Card */}
                <div className="comp-card magic-way">
                    <div className="card-tag magic">MagicTeams</div>
                    <div className="magic-content">
                        <div className="speed-glance">
                            <span className="time-value">&lt;1</span>
                            <span className="time-unit">min</span>
                        </div>
                        <h3 className="magic-title">One Click. Zero Friction.</h3>
                        <p className="magic-text">Everything is pre-configured. We handle the servers, the SSH, and the AI environment. You just pick your model and channel.</p>
                        <div className="benefit-pills">
                            <span>Instant Deploy</span>
                            <span>Auto-Scaling</span>
                            <span>Secure SSH</span>
                        </div>
                    </div>
                    <div className="magic-decoration"><div className="glow-orb"></div></div>
                </div>
            </div>

            <div className="flex justify-center mt-12">
                <p className="non-tech-warning">
                    <Info className="w-5 h-5" />
                    <span>Non-technical? Multiply the manual time by <strong className="text-slate-900">10x</strong> for learning curve.</span>
                </p>
            </div>
        </section>
    );
};
