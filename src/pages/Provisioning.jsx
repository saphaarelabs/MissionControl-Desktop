import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Loader2,
    LogOut,
    ServerCog,
    ShieldAlert,
} from 'lucide-react';
import { apiAuthFetch, probeBackendHealth, probeControlPlaneHealth } from '../lib/apiBase';

const STAGES = [
    {
        id: 'profile',
        title: 'Profile synced',
        description: 'Your onboarding data has been stored and the control plane has enough context to start deployment.',
    },
    {
        id: 'infra',
        title: 'Infrastructure allocation',
        description: 'We are assigning VPS capacity or queueing a new node if the current fleet is full.',
    },
    {
        id: 'workspace',
        title: 'Workspace preparation',
        description: 'The OpenClaw instance is being configured so you can enter the dashboard with a ready environment.',
    },
];

function serviceTone(status, onlineClass) {
    if (status === 'online') return onlineClass;
    if (status === 'offline') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-slate-200 bg-white text-slate-500';
}

function progressForStatus(status) {
    if (status === 'ready') return 3;
    if (status === 'provisioning') return 2;
    if (status === 'onboarded') return 1;
    return 1;
}

function headlineForStatus(status) {
    if (status === 'ready') {
        return {
            eyebrow: 'Ready',
            title: 'Your workspace is live',
            body: 'Provisioning completed successfully. You can move straight into Mission Control.',
        };
    }

    if (status === 'provisioning') {
        return {
            eyebrow: 'Provisioning',
            title: 'Infrastructure is being prepared',
            body: 'The control plane has picked up your request and is currently configuring the workspace.',
        };
    }

    if (status === 'onboarded') {
        return {
            eyebrow: 'Queued',
            title: 'Your deployment request is queued',
            body: 'We have your onboarding data and are waiting for the provisioning pipeline to allocate the instance.',
        };
    }

    return {
        eyebrow: 'Provisioning',
        title: 'Checking workspace status',
        body: 'We are waiting for the backend to report the current state of your deployment.',
    };
}

export default function Provisioning() {
    const navigate = useNavigate();
    const { signOut } = useClerk();
    const { isLoaded: authLoaded } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();
    const [profileStatus, setProfileStatus] = useState('checking');
    const [error, setError] = useState('');
    const [completed, setCompleted] = useState(false);
    const [lastCheckedAt, setLastCheckedAt] = useState(null);
    const [serviceStatus, setServiceStatus] = useState({
        backend: 'checking',
        controlPlane: 'checking',
    });

    useEffect(() => {
        if (!authLoaded || !userLoaded || !user) return;

        let stopped = false;

        const poll = async () => {
            while (!stopped) {
                try {
                    const res = await apiAuthFetch('/api/user/profile');
                    if (res.ok) {
                        const { profile } = await res.json();
                        const status = profile?.operation_status || 'checking';
                        setProfileStatus(status);
                        setLastCheckedAt(new Date());

                        if (status === 'ready') {
                            setCompleted(true);
                            setError('');
                            return;
                        }

                        if (status === 'suspended') {
                            setError('Your account is suspended, so provisioning cannot continue until support resolves the account state.');
                            return;
                        }
                    } else {
                        setLastCheckedAt(new Date());
                    }
                } catch (pollError) {
                    console.error('[provisioning] poll error:', pollError);
                    setLastCheckedAt(new Date());
                }

                await new Promise((resolve) => setTimeout(resolve, 4000));
            }
        };

        poll();
        return () => {
            stopped = true;
        };
    }, [authLoaded, userLoaded, user]);

    useEffect(() => {
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
        const timer = setInterval(checkServices, 10000);
        return () => {
            active = false;
            clearInterval(timer);
        };
    }, []);

    const statusCopy = useMemo(() => headlineForStatus(profileStatus), [profileStatus]);
    const completedStages = progressForStatus(profileStatus);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] text-slate-900"
            style={{ fontFamily: '"Satoshi", sans-serif' }}
        >
            <header className="px-6 py-6 sm:px-8">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 shadow-[0_14px_30px_rgba(37,99,235,0.24)] ring-1 ring-white/40">
                            <span className="text-sm font-black tracking-[0.2em] text-white">MT</span>
                        </div>
                        <div>
                            <div className="text-sm font-black uppercase tracking-[0.24em] text-slate-900">Magic Teams</div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Provisioning</div>
                        </div>
                    </div>

                    <button
                        onClick={() => signOut(() => navigate('/'))}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                        <LogOut size={14} />
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="px-6 pb-16 sm:px-8">
                <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <section className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
                        <AnimatePresence mode="wait">
                            {error ? (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                >
                                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        Attention required
                                    </div>
                                    <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900">Provisioning is paused</h1>
                                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{error}</p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="mt-8 inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                                    >
                                        Return home
                                    </button>
                                </motion.div>
                            ) : completed ? (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                >
                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Ready
                                    </div>
                                    <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900">Your command center is ready</h1>
                                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                                        The workspace is provisioned, the gateway is reachable, and you can move into the dashboard now.
                                    </p>

                                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                        {STAGES.map((stage) => (
                                            <div key={stage.id} className="rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5">
                                                <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {stage.title}
                                                </div>
                                                <p className="mt-3 text-sm leading-6 text-slate-600">{stage.description}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate('/app')}
                                        className="mt-10 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                                    >
                                        Go to dashboard
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="provisioning"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                >
                                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        {statusCopy.eyebrow}
                                    </div>
                                    <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900">{statusCopy.title}</h1>
                                    <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{statusCopy.body}</p>

                                    <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
                                        <Clock3 className="h-4 w-4 text-slate-400" />
                                        {lastCheckedAt
                                            ? `Last checked at ${lastCheckedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : 'Waiting for the first workspace status update'}
                                    </div>

                                    <div className="mt-10 grid gap-4">
                                        {STAGES.map((stage, index) => {
                                            const stageNumber = index + 1;
                                            const isComplete = completedStages > stageNumber;
                                            const isActive = completedStages === stageNumber;
                                            return (
                                                <div
                                                    key={stage.id}
                                                    className={`rounded-[28px] border p-5 transition-all ${
                                                        isComplete
                                                            ? 'border-emerald-200 bg-emerald-50/70'
                                                            : isActive
                                                                ? 'border-blue-200 bg-blue-50'
                                                                : 'border-slate-200 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                                                            isComplete
                                                                ? 'bg-emerald-600 text-white'
                                                                : isActive
                                                                    ? 'bg-blue-600 text-white'
                                                                    : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {isComplete ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : stageNumber}
                                                        </div>
                                                        <div>
                                                            <div className="text-base font-black text-slate-900">{stage.title}</div>
                                                            <div className="mt-2 text-sm leading-6 text-slate-600">{stage.description}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    <aside className="rounded-[32px] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur">
                        <div className="rounded-[28px] bg-slate-950 p-6 text-white">
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">Live service state</div>
                            <div className="mt-6 space-y-3">
                                <div className={`rounded-2xl border px-4 py-3 ${serviceTone(serviceStatus.backend, 'border-emerald-200 bg-emerald-50 text-emerald-700')}`}>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em]">Backend proxy</div>
                                    <div className="mt-2 text-sm font-bold">
                                        {serviceStatus.backend === 'online' ? 'Connected' : serviceStatus.backend === 'offline' ? 'Unavailable' : 'Checking'}
                                    </div>
                                    <div className="mt-1 text-xs leading-5 opacity-80">
                                        Authenticated profile sync, gateway access, and app routing depend on this service.
                                    </div>
                                </div>

                                <div className={`rounded-2xl border px-4 py-3 ${serviceTone(serviceStatus.controlPlane, 'border-blue-200 bg-blue-50 text-blue-700')}`}>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em]">Control plane</div>
                                    <div className="mt-2 text-sm font-bold">
                                        {serviceStatus.controlPlane === 'online' ? 'Reachable' : serviceStatus.controlPlane === 'offline' ? 'Unavailable' : 'Checking'}
                                    </div>
                                    <div className="mt-1 text-xs leading-5 opacity-80">
                                        VPS capacity decisions and instance orchestration are reported from here.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                <ServerCog className="h-4 w-4 text-blue-600" />
                                What this screen does
                            </div>
                            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
                                <p>
                                    This flow now reflects the actual backend status instead of optimistic timers. If provisioning stalls, you will see a real state change rather than a fake “almost ready” message.
                                </p>
                                <p>
                                    Once the profile reports <span className="font-bold text-slate-900">ready</span>, we take you straight into the dashboard.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                <Activity className="h-4 w-4 text-blue-600" />
                                Workspace status
                            </div>
                            <div className="mt-4 text-2xl font-black text-slate-900">
                                {profileStatus === 'checking' ? 'Checking' : profileStatus}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                We poll your profile every few seconds so the handoff into the app stays current without forcing a refresh.
                            </p>
                        </div>
                    </aside>
                </div>
            </main>
        </motion.div>
    );
}
