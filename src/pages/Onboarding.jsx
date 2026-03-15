import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiAuthFetch } from '../lib/apiBase';
import {
    User as UserIcon,
    Phone,
    Bot,
    Settings as SettingsIcon,
    CheckCircle2,
    ChevronRight,
    ArrowLeft,
    MessageSquare,
    Send,
    Sparkles,
    Zap,
    Globe,
    LogOut,
    // Database
} from 'lucide-react';

const steps = [
    { id: 'bio', title: 'Basic Info' },
    { id: 'llm', title: 'AI Configuration' },
    { id: 'channels', title: 'Channel Setup' },
    { id: 'verify', title: 'Verification' },
];

const providers = [
    {
        id: 'openai',
        name: 'OpenAI',
        models: [
            { id: 'gpt-5.3', name: 'ChatGPT 5.3 (Flagship)' },
            { id: 'gpt-4o', name: 'GPT-4o (Omni)' },
            { id: 'o1-preview', name: 'OpenAI o1-preview' }
        ]
    },
    {
        id: 'perplexity',
        name: 'Perplexity',
        models: [
            { id: 'sonar-reasoning', name: 'Sonar Reasoning' },
            { id: 'sonar-pro', name: 'Sonar Pro' },
            { id: 'sonar', name: 'Sonar Standard' }
        ]
    },
    {
        id: 'anthropic',
        name: 'Claude',
        models: [
            { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
            { id: 'claude-3-opus-latest', name: 'Claude 3 Opus' }
        ]
    },
    {
        id: 'x',
        name: 'Grok',
        models: [
            { id: 'grok-2', name: 'Grok-2' },
            { id: 'grok-2-128k', name: 'Grok-2 (Long Context)' },
            { id: 'grok-beta', name: 'Grok Beta' }
        ]
    },
    {
        id: 'google',
        name: 'Gemini',
        models: [
            { id: 'gemini-3-pro', name: 'Gemini 3 Pro' },
            { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' }
        ]
    },
    {
        id: 'deepseek',
        name: 'Deepseek',
        models: [
            { id: 'deepseek-v3', name: 'Deepseek V3' },
            { id: 'deepseek-chat', name: 'Deepseek Chat' },
            { id: 'deepseek-reasoner', name: 'Deepseek Reasoner' }
        ]
    },
    {
        id: 'moonshot',
        name: 'Kimi',
        models: [
            { id: 'moonshot-v1-128k', name: 'Kimi V1 (128k)' },
            { id: 'moonshot-v1-32k', name: 'Kimi V1 (32k)' }
        ]
    },
    {
        id: 'alibaba',
        name: 'Qwen',
        models: [
            { id: 'qwen-max', name: 'Qwen Max (2.5)' },
            { id: 'qwen-plus', name: 'Qwen Plus' },
            { id: 'qwen-turbo', name: 'Qwen Turbo' }
        ]
    },
];

export default function Onboarding() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        phoneNumber: '',
        llmType: 'default', // 'default' or 'custom'
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: '',
        channels: {
            whatsapp: false,
            telegram: false,
        },
    });

    useEffect(() => {
        const checkStatus = async () => {
            if (isLoaded && user) {
                try {
                    const res = await apiAuthFetch('/api/user/profile');
                    if (res.ok) {
                        const { profile } = await res.json();
                        // If user is already set up, skip onboarding
                        if (profile?.operation_status === 'ready') {
                            navigate('/app', { replace: true });
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Failed to check profile status:', err);
                }

                setFormData(prev => ({
                    ...prev,
                    fullName: user.fullName || '',
                    username: user.username || user.emailAddresses[0].emailAddress.split('@')[0],
                }));
            }
        };
        checkStatus();
    }, [isLoaded, user, navigate]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setDirection(1);
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setDirection(-1);
            setCurrentStep(currentStep - 1);
        }
    };

    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 40 : -40,
            opacity: 0,
            scale: 0.95,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 40 : -40,
            opacity: 0,
            scale: 0.95,
        }),
    };

    const startProvisioning = async () => {
        setLoading(true);
        try {
            // Sync profile with full data and trigger provisioning
            const res = await apiAuthFetch('/api/user/profile/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: formData.username,
                    fullName: formData.fullName,
                    phoneNumber: formData.phoneNumber,
                    onboardingData: {
                        llm: {
                            type: formData.llmType,
                            provider: formData.provider,
                            model: formData.model,
                            apiKey: formData.apiKey,
                        },
                        channels: formData.channels,
                    },
                    triggerProvision: true
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to sync profile');
            }

            // Navigate to the dedicated white-themed provisioning screen
            navigate('/provisioning');

        } catch (err) {
            console.error('[onboarding] Provisioning start failed:', err);
            alert(`Setup failed: ${err.message}`);
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-dvh flex-col bg-white text-[#1a1a2e]" style={{ fontFamily: '"Satoshi", sans-serif' }}>
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-6">
                <div className="flex items-center gap-2">
                    {/* Logo Removed */}
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => signOut(() => navigate('/'))}
                        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        <LogOut size={12} />
                        Sign Out
                    </button>
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 uppercase">
                        {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'S'}
                    </div>
                </div>
            </header>

            <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20">
                <div className="w-full max-w-md overflow-hidden min-h-[400px] flex flex-col items-center">
                    <AnimatePresence mode="wait" initial={false} custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                                scale: { duration: 0.3 }
                            }}
                            layout
                            className="w-full"
                        >
                            {/* Step 1: Identity */}
                            {currentStep === 0 && (
                                <div className="flex flex-col items-center text-center w-full">
                                    <span className="mb-6 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-slate-100">
                                        Account
                                    </span>
                                    <h1 className="mb-3 text-3xl font-bold tracking-tight">What's your name?</h1>
                                    <p className="mb-10 text-slate-500">You know, the one you were born with.</p>

                                    <div className="mb-10 w-full space-y-6">
                                        <div className="text-left">
                                            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Name</label>
                                            <input
                                                type="text"
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                className="w-full rounded-2xl bg-slate-50 px-6 py-4 text-lg text-[#1a1a1a] transition-all placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                                                placeholder="John Doe"
                                            />
                                        </div>

                                        <div className="text-left">
                                            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Username</label>
                                            <div className="relative">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg text-slate-400 font-medium">@</span>
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    className="w-full rounded-2xl bg-slate-50 py-4 pl-12 pr-6 text-lg text-[#1a1a1a] transition-all placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                                                    placeholder="johndoe"
                                                />
                                            </div>
                                        </div>

                                        <div className="text-left">
                                            <label className="mb-2 ml-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Phone Number</label>
                                            <input
                                                type="tel"
                                                value={formData.phoneNumber}
                                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                                className="w-full rounded-2xl bg-slate-50 px-6 py-4 text-lg text-[#1a1a1a] transition-all placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleNext}
                                        className="w-full rounded-full bg-blue-600 py-3.5 text-base font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                                    >
                                        Continue
                                    </button>
                                </div>
                            )}

                            {/* Step 2: AI Config */}
                            {currentStep === 1 && (
                                <div className="flex flex-col items-center text-center w-full">
                                    <span className="mb-6 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-slate-100">
                                        Intelligence
                                    </span>
                                    <h1 className="mb-3 text-3xl font-bold tracking-tight">Choose your AI</h1>
                                    <p className="mb-10 text-slate-500">Pick the brain that powers your workspace.</p>

                                    <div className="mb-10 w-full space-y-6">
                                        <div className="relative grid grid-cols-2 gap-3">
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setFormData({ ...formData, llmType: 'default' })}
                                                className={`relative z-10 rounded-2xl border-2 p-4 transition-colors duration-300 ${formData.llmType === 'default' ? 'border-blue-600' : 'border-slate-50 opacity-60'}`}
                                            >
                                                {formData.llmType === 'default' && (
                                                    <motion.div
                                                        layoutId="aiTypeHighlight"
                                                        className="absolute inset-0 bg-blue-50/50 rounded-[14px] -z-10"
                                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}
                                                <Zap className="mx-auto mb-2 text-blue-600" size={20} />
                                                <div className="text-sm font-bold">Default</div>
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setFormData({ ...formData, llmType: 'custom' })}
                                                className={`relative z-10 rounded-2xl border-2 p-4 transition-colors duration-300 ${formData.llmType === 'custom' ? 'border-blue-600' : 'border-slate-50 opacity-60'}`}
                                            >
                                                {formData.llmType === 'custom' && (
                                                    <motion.div
                                                        layoutId="aiTypeHighlight"
                                                        className="absolute inset-0 bg-blue-50/50 rounded-[14px] -z-10"
                                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                                    />
                                                )}
                                                <SettingsIcon className="mx-auto mb-2 text-blue-600" size={20} />
                                                <div className="text-sm font-bold">Custom</div>
                                            </motion.button>
                                        </div>

                                        <AnimatePresence>
                                            {formData.llmType === 'custom' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                                    transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
                                                    className="overflow-hidden space-y-4 pt-4"
                                                >
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {providers.slice(0, 8).map(p => (
                                                            <motion.button
                                                                key={p.id}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => setFormData({ ...formData, provider: p.id, model: p.models[0].id })}
                                                                className={`rounded-xl border py-2 text-[10px] font-bold transition-all ${formData.provider === p.id ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-80'}`}
                                                            >
                                                                {p.name}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                    <select
                                                        value={formData.model}
                                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                        className="w-full rounded-2xl bg-slate-50 px-6 py-4 text-base font-medium text-[#1a1a2e] focus:outline-none ring-1 ring-slate-100"
                                                    >
                                                        {providers.find(p => p.id === formData.provider)?.models.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="password"
                                                        value={formData.apiKey}
                                                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                                        className="w-full rounded-2xl bg-slate-50 px-6 py-4 text-lg text-[#1a1a1a] transition-all placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                                                        placeholder="sk-..."
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <button
                                        onClick={handleNext}
                                        className="w-full rounded-full bg-blue-600 py-3.5 text-base font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                                    >
                                        Continue
                                    </button>
                                    {currentStep > 0 && (
                                        <button onClick={handleBack} className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                                            Back
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Step 3: Channels */}
                            {currentStep === 2 && (
                                <div className="flex flex-col items-center text-center w-full">
                                    <span className="mb-6 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-slate-100">
                                        Connectivity
                                    </span>
                                    <h1 className="mb-3 text-3xl font-bold tracking-tight">Active channels</h1>
                                    <p className="mb-10 text-slate-500">Enable where your agents can reach you.</p>

                                    <div className="mb-10 w-full space-y-4">
                                        <button
                                            onClick={() => setFormData({ ...formData, channels: { ...formData.channels, whatsapp: !formData.channels.whatsapp } })}
                                            className={`flex w-full items-center justify-between rounded-2xl border-2 p-5 transition-all ${formData.channels.whatsapp ? 'border-blue-600 bg-slate-50' : 'border-slate-50 bg-white opacity-60'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="WhatsApp" className="h-8 w-8 object-contain" />
                                                <div className="text-left">
                                                    <div className="text-sm font-bold uppercase tracking-wider">WhatsApp</div>
                                                    <div className="text-xs text-slate-500">Official API Access</div>
                                                </div>
                                            </div>
                                            <div className={`h-4 w-4 rounded-full ${formData.channels.whatsapp ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                                        </button>

                                        <button
                                            onClick={() => setFormData({ ...formData, channels: { ...formData.channels, telegram: !formData.channels.telegram } })}
                                            className={`flex w-full items-center justify-between rounded-2xl border-2 p-5 transition-all ${formData.channels.telegram ? 'border-blue-600 bg-slate-50' : 'border-slate-50 bg-white opacity-60'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <img src="https://cdn.simpleicons.org/telegram/2CA5E0" alt="Telegram" className="h-8 w-8 object-contain" />
                                                <div className="text-left">
                                                    <div className="text-sm font-bold uppercase tracking-wider">Telegram</div>
                                                    <div className="text-xs text-slate-500">Custom Bot Setup</div>
                                                </div>
                                            </div>
                                            <div className={`h-4 w-4 rounded-full ${formData.channels.telegram ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleNext}
                                        className="w-full rounded-full bg-blue-600 py-3.5 text-base font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                                    >
                                        Continue
                                    </button>
                                    {currentStep > 0 && (
                                        <button onClick={handleBack} className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                                            Back
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Step 4: Verification */}
                            {currentStep === 3 && (
                                <div className="flex flex-col items-center text-center w-full">
                                    <span className="mb-6 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-slate-100">
                                        Finalize
                                    </span>
                                    <h1 className="mb-3 text-3xl font-bold tracking-tight">Ready to launch?</h1>
                                    <p className="mb-10 text-slate-500">Confirm your setup to deploy your workspace.</p>

                                    <div className="mb-10 w-full rounded-3xl bg-slate-50 p-6 text-left space-y-6 ring-1 ring-slate-100">
                                        <div className="flex justify-between items-start border-b border-slate-200/50 pb-4">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Identity</div>
                                                <div className="text-sm font-bold">@{formData.username}</div>
                                                <div className="text-xs text-slate-500 font-medium">{formData.fullName}</div>
                                                {formData.phoneNumber && (
                                                    <div className="text-[xs] text-blue-600 font-bold mt-1">{formData.phoneNumber}</div>
                                                )}
                                            </div>
                                            <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200">
                                                <UserIcon size={16} className="text-slate-400" />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-start border-b border-slate-200/50 pb-4">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">AI Processor</div>
                                                <div className="text-sm font-bold capitalize">{formData.llmType} Integration</div>
                                                <div className="text-xs text-slate-500 mt-0.5 font-medium">{formData.model}</div>
                                                {formData.llmType === 'custom' && (
                                                    <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tight mt-1">{formData.provider} enabled</div>
                                                )}
                                            </div>
                                            <div className="rounded-full bg-white p-2 shadow-sm ring-1 ring-slate-200">
                                                <Zap size={16} className="text-blue-600" />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Connectivity</div>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.channels.whatsapp && (
                                                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-100">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                                                        WhatsApp
                                                    </div>
                                                )}
                                                {formData.channels.telegram && (
                                                    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-100">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                                        Telegram
                                                    </div>
                                                )}
                                                {!formData.channels.whatsapp && !formData.channels.telegram && (
                                                    <div className="text-xs text-slate-400 italic">No channels selected</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={startProvisioning}
                                        disabled={loading}
                                        className="w-full rounded-full bg-blue-600 py-3.5 text-base font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {loading ? 'Deploying...' : 'Setup Account'}
                                    </button>
                                    {currentStep > 0 && (
                                        <button onClick={handleBack} className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                                            Back
                                        </button>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Progress Dots */}
                    <div className="mt-12 flex justify-center gap-3">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={`transition-all duration-300 ${idx === currentStep ? 'h-2 w-8 bg-blue-600 rounded-full' : 'h-2 w-2 bg-slate-200 rounded-full'}`}
                            ></div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-10 text-center">
                <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <span className="cursor-pointer hover:text-slate-900 transition-colors">Terms</span>
                    <span className="cursor-pointer hover:text-slate-900 transition-colors">Privacy</span>
                </div>
            </footer>
        </div>
    );
}
