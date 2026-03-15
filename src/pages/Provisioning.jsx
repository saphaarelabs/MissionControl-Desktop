import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CheckCircle2, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { apiAuthFetch, probeBackendHealth, probeControlPlaneHealth } from '../lib/apiBase';

const steps = [
    'Allocating your agent environment',
    'Configuring secure container',
    'Setting up your workspace',
    'Almost ready',
];

export default function Provisioning() {
    const navigate = useNavigate();
    const { isLoaded: authLoaded } = useAuth();
    const { user, isLoaded: userLoaded } = useUser();
    const { signOut } = useClerk();
    const [stepIndex, setStepIndex] = useState(0);
    const [error, setError] = useState(null);
    const [completed, setCompleted] = useState(false);
    const [serviceStatus, setServiceStatus] = useState({
        backend: 'checking',
        controlPlane: 'checking',
    });

    useEffect(() => {
        const stepTimer = setInterval(() => {
            setStepIndex((i) => Math.min(i + 1, steps.length - 1));
        }, 5000);
        return () => clearInterval(stepTimer);
    }, []);

    useEffect(() => {
        if (!authLoaded || !userLoaded || !user) return;

        let stopped = false;

        const poll = async () => {
            while (!stopped) {
                try {
                    const res = await apiAuthFetch('/api/user/profile');
                    if (res.ok) {
                        const { profile } = await res.json();
                        if (profile?.operation_status === 'ready') {
                            setCompleted(true);
                            return;
                        }
                        if (profile?.operation_status === 'suspended') {
                            setError('Your account has been suspended. Contact support.');
                            return;
                        }
                    }
                } catch (err) {
                    console.error('[provisioning] poll error:', err);
                }
                await new Promise((r) => setTimeout(r, 3000));
            }
        };

        poll();
        return () => { stopped = true; };
    }, [navigate, authLoaded, userLoaded, user]);

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

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-dvh flex-col bg-white text-slate-900"
            style={{ fontFamily: '"Satoshi", sans-serif' }}
        >
            <header className="flex w-full items-center justify-between px-8 py-6">
                <div className="flex items-center gap-2" />
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => signOut(() => navigate('/'))}
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        <LogOut size={12} />
                        Sign Out
                    </button>
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 uppercase">
                        {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'D'}
                    </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
                <AnimatePresence mode="wait">
                    {error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-md text-center"
                        >
                            <div className="mb-6 flex justify-center text-red-500">
                                <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center ring-1 ring-red-100">
                                    <Bot size={40} />
                                </div>
                            </div>
                            <h2 className="mb-2 text-xl font-bold">Setup Issue</h2>
                            <p className="text-slate-500">{error}</p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-8 rounded-full bg-slate-100 px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-200"
                            >
                                Back to Home
                            </button>
                        </motion.div>
                    ) : completed ? (
                        <motion.div
                            key="completed"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
                            className="w-full max-w-md text-center"
                        >
                            <div className="mb-8 flex justify-center">
                                <motion.div
                                    initial={{ rotate: -10 }}
                                    animate={{ rotate: 0 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                    className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 shadow-xl shadow-blue-500/10"
                                >
                                    <CheckCircle2 size={48} strokeWidth={2.5} />
                                </motion.div>
                            </div>

                            <span className="mb-6 inline-block rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 ring-1 ring-blue-100">
                                Success
                            </span>

                            <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900">Welcome to Dashboard</h1>
                            <p className="mb-12 text-slate-500 text-lg font-medium leading-relaxed">Your AI workforce is ready and waiting for your commands.</p>

                            <button
                                onClick={() => navigate('/app')}
                                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-blue-600 px-8 py-4 text-lg font-black text-white transition-all hover:bg-blue-700 hover:shadow-[0_20px_40px_rgba(37,99,235,0.25)] active:scale-95"
                            >
                                Go to Dashboard
                                <ChevronRight className="transition-transform group-hover:translate-x-1" size={24} strokeWidth={3} />
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="provisioning"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-md text-center"
                        >

                            <span className="mb-6 inline-block rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-slate-100">
                                Provisioning
                            </span>

                            <h1 className="mb-4 text-3xl font-black tracking-tight text-slate-900">Setting up your account</h1>
                            <p className="text-slate-500 font-medium leading-relaxed mb-12">
                                {steps[stepIndex]}... <br />
                                <span className="text-xs opacity-60">Deploying your intelligent workspace.</span>
                            </p>

                            <div className="flex flex-col items-center gap-4">
                                <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50">
                                    <motion.div
                                        animate={{
                                            x: [-200, 200]
                                        }}
                                        transition={{
                                            duration: 2.5,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        className="h-full w-full bg-blue-600 opacity-80"
                                    />
                                </div>
                                <div className="flex gap-1.5 mt-2">
                                    {steps.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-500 ${i < stepIndex ? 'w-4 bg-blue-600' :
                                                i === stepIndex ? 'w-8 bg-blue-500' : 'w-1.5 bg-slate-200'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className="mt-8 grid w-full gap-3 text-left sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Backend Proxy</div>
                                        <div className={`mt-2 text-sm font-bold ${serviceStatus.backend === 'online' ? 'text-emerald-600' : serviceStatus.backend === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>
                                            {serviceStatus.backend === 'online' ? 'Connected' : serviceStatus.backend === 'offline' ? 'Unavailable' : 'Checking'}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">Session auth, gateway routing, and profile polling run through this service.</div>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Control Plane</div>
                                        <div className={`mt-2 text-sm font-bold ${serviceStatus.controlPlane === 'online' ? 'text-blue-600' : serviceStatus.controlPlane === 'offline' ? 'text-amber-600' : 'text-slate-500'}`}>
                                            {serviceStatus.controlPlane === 'online' ? 'Reachable' : serviceStatus.controlPlane === 'offline' ? 'Unavailable' : 'Checking'}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">Provisioning capacity and node orchestration are monitored directly from the desktop app.</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </motion.div>
    );
}
