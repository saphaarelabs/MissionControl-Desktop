import React, { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, RefreshCw, User, Mic, Plus, Workflow, Cpu, MessageSquareText } from 'lucide-react';
import { useBroadcast } from '../contexts/BroadcastContext';

const formatFeedTimestamp = (value) => {
    if (!value) return 'Recent';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
};

const getMessageKind = (message) => {
    if (message.role === 'user') return 'user';
    if (message.role === 'agent_message') return 'coordination';
    if (message.agentId === (message.managerAgentId || 'main')) return 'manager';
    return 'worker';
};

const getKindTone = (kind) => {
    if (kind === 'coordination') {
        return {
            bubble: 'border-amber-100 bg-amber-50/80',
            badge: 'bg-amber-100 text-amber-700',
            iconWrap: 'bg-amber-50 text-amber-600 border-amber-100'
        };
    }
    if (kind === 'manager') {
        return {
            bubble: 'border-blue-100 bg-blue-50/70',
            badge: 'bg-blue-100 text-blue-700',
            iconWrap: 'bg-white text-blue-600 border-slate-100'
        };
    }
    if (kind === 'user') {
        return {
            bubble: 'border-slate-800 bg-slate-900 text-white',
            badge: 'bg-white/15 text-white',
            iconWrap: 'bg-slate-900 text-white border-slate-800'
        };
    }
    return {
        bubble: 'border-slate-200 bg-white',
        badge: 'bg-slate-100 text-slate-700',
        iconWrap: 'bg-white text-slate-700 border-slate-200'
    };
};

const Broadcast = () => {
    const {
        created,
        createdIds,
        jobsById,
        loadingJobs,
        recentJobs,
        loadingRecent,
        fetchRecent,
        fetchJobs,
        sending,
        message,
        setMessage,
        handleBroadcast
    } = useBroadcast();

    const [isRecording, setIsRecording] = React.useState(false);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const endRef = useRef(null);

    const scrollToBottom = (behavior = 'auto') => {
        const el = endRef.current;
        if (!el) return;
        el.scrollIntoView({ behavior, block: 'end' });
    };

    const toggleMic = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('Speech recognition not supported in this browser.');
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsRecording(true);
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
            };
            recognition.onerror = () => setIsRecording(false);
            recognition.onend = () => setIsRecording(false);

            recognitionRef.current = recognition;
            recognition.start();
        }
    };

    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setMessage(prev => `${prev}[Attached: ${files[0].name}] `.trimStart());
        }
    };

    useEffect(() => {
        fetchRecent();
        const interval = setInterval(() => {
            if (createdIds.size === 0) fetchRecent();
        }, 15_000);
        return () => clearInterval(interval);
    }, [createdIds.size, fetchRecent]);

    useEffect(() => {
        if (createdIds.size === 0) return;
        fetchJobs();
        const interval = setInterval(() => {
            fetchJobs();
        }, 10_000);
        return () => clearInterval(interval);
    }, [createdIds.size, fetchJobs]);

    const narrationMessages = useMemo(() => {
        const shouldInclude = ({ text }) => {
            const t = String(text || '').trim();
            if (!t) return false;
            if (t.startsWith('Imported cron job:')) return false;
            if (t.startsWith('Last error:')) return false;
            return true;
        };

        const all = [];
        for (const task of created) {
            const job = jobsById?.[task.id];
            const narrative = Array.isArray(job?.metadata?.narrative) ? job.metadata.narrative : [];
            for (const n of narrative) {
                if (!n || typeof n !== 'object') continue;
                all.push({
                    ts: n.ts || null,
                    agentId: n.agentId || task.agentId || 'main',
                    role: n.role || 'assistant',
                    text: n.text || n.message || '',
                    jobId: task.id,
                    taskName: job?.name || task.name || task.id,
                    status: job?.metadata?.status || job?.status || '',
                    managerAgentId: job?.metadata?.managerAgentId || 'main',
                    assignedAgentId: job?.metadata?.assignedAgentId || job?.agentId || null
                });
            }
        }
        all.sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')));
        return all.filter(shouldInclude).slice(-250);
    }, [created, jobsById]);

    const recentNarrationMessages = useMemo(() => {
        const shouldInclude = ({ text }) => {
            const t = String(text || '').trim();
            if (!t) return false;
            if (t.startsWith('Imported cron job:')) return false;
            if (t.startsWith('Last error:')) return false;
            if (t === 'Run requested') return false;
            if (t.startsWith('Task created:')) return false;
            return true;
        };

        const all = [];
        for (const job of (Array.isArray(recentJobs) ? recentJobs : [])) {
            const narrative = Array.isArray(job?.metadata?.narrative) ? job.metadata.narrative : [];
            for (const n of narrative) {
                if (!n || typeof n !== 'object') continue;
                all.push({
                    ts: n.ts || null,
                    agentId: n.agentId || job?.agentId || 'main',
                    role: n.role || 'assistant',
                    text: n.text || n.message || '',
                    jobId: job?.id,
                    taskName: job?.name || job?.id,
                    status: job?.metadata?.status || job?.status || '',
                    managerAgentId: job?.metadata?.managerAgentId || 'main',
                    assignedAgentId: job?.metadata?.assignedAgentId || job?.agentId || null
                });
            }
        }
        all.sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')));
        return all.filter(shouldInclude).slice(-250);
    }, [recentJobs]);

    const feedMessages = createdIds.size > 0 ? narrationMessages : recentNarrationMessages;
    const feedLoading = createdIds.size > 0 ? loadingJobs : loadingRecent;
    const feedTitle = createdIds.size > 0 ? `Tracking ${created.length} task(s)` : 'Recent activity';
    const coordinationCount = feedMessages.filter((message) => getMessageKind(message) === 'coordination').length;

    useEffect(() => {
        scrollToBottom('auto');
    }, [feedMessages.length, sending]);

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#ffffff] font-sans">
            <div className="flex-1 flex min-h-0">
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <div className="border-b border-slate-100 bg-white px-8 py-5">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] leading-none mb-2">Group Chat Feed</h2>
                                <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl">
                                    Follow manager notes, worker replies, and inter-agent coordination as tasks move through the system.
                                </p>
                            </div>
                            <button
                                onClick={() => (createdIds.size > 0 ? fetchJobs() : fetchRecent())}
                                disabled={feedLoading}
                                className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition-colors hover:bg-slate-50"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${feedLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">View</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{feedTitle}</div>
                            </div>
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">Messages</div>
                                <div className="mt-1 text-sm font-semibold text-blue-900">{feedMessages.length}</div>
                            </div>
                            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-600">Inter-agent relays</div>
                                <div className="mt-1 text-sm font-semibold text-amber-900">{coordinationCount}</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 pb-32 pt-6 space-y-5 scroll-smooth bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.05),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]">
                        {feedMessages.length === 0 && !sending && !feedLoading && (
                            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-16 text-center">
                                <Workflow className="mb-4 h-12 w-12 text-slate-300" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">No coordination yet</p>
                                <p className="mt-2 max-w-md text-sm text-slate-500">
                                    Once agents start responding, their manager notes, worker updates, and inter-agent relays will appear here.
                                </p>
                            </div>
                        )}

                        {feedMessages.map((m, idx) => {
                            const kind = getMessageKind(m);
                            const tone = getKindTone(kind);
                            const isUser = kind === 'user';

                            return (
                                <div key={`${m.jobId}-${idx}`} className={`flex gap-5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${tone.iconWrap}`}>
                                        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>

                                    <div className={`max-w-4xl flex-1 rounded-3xl border px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ${tone.bubble}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${tone.badge}`}>
                                                {kind === 'coordination' ? 'Inter-agent' : kind}
                                            </span>
                                            <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">
                                                {m.taskName || m.jobId || 'Task'}
                                            </span>
                                            {m.assignedAgentId && (
                                                <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-violet-700">
                                                    Owner: {m.assignedAgentId}
                                                </span>
                                            )}
                                            {m.status && (
                                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                                    {String(m.status).replace(/_/g, ' ')}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] ${kind === 'user' ? 'text-white' : 'text-slate-800'}`}>
                                                <Cpu className="h-3 w-3" />
                                                {m.agentId || 'system'}
                                            </span>
                                            <span className={`text-[10px] font-medium ${kind === 'user' ? 'text-slate-200' : 'text-slate-400'}`}>
                                                {formatFeedTimestamp(m.ts)}
                                            </span>
                                        </div>

                                        <div className={`mt-4 text-[14px] leading-relaxed font-medium ${kind === 'user' ? 'text-white' : 'text-slate-700'}`}>
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                                    code: ({ inline, children }) => inline
                                                        ? <code className={`${kind === 'user' ? 'bg-white/10 text-white border-white/10' : 'bg-slate-50 text-blue-600 border-slate-100'} rounded px-1.5 py-0.5 text-[12px] font-mono border`}>{children}</code>
                                                        : <code className="my-4 block overflow-x-auto whitespace-pre rounded-2xl bg-slate-950 p-5 text-[12px] font-mono text-white shadow-xl">{children}</code>,
                                                    ul: ({ children }) => <ul className="mb-4 ml-4 list-disc space-y-2">{children}</ul>,
                                                }}
                                            >
                                                {m.text}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {sending && (
                            <div className="flex gap-5 animate-pulse">
                                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-300">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="flex-1 rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                    <div className="h-2 w-28 rounded bg-slate-100" />
                                    <div className="mt-3 h-4 w-64 rounded-lg bg-slate-100" />
                                    <div className="mt-2 h-4 w-40 rounded-lg bg-slate-50" />
                                </div>
                            </div>
                        )}
                        <div ref={endRef} className="h-4" />
                    </div>

                    <div className="pointer-events-none absolute bottom-8 left-0 right-0 px-8">
                        <div className="mx-auto w-full max-w-4xl pointer-events-auto">
                            <div className="group relative">
                                <div className="absolute inset-0 rounded-[30px] bg-blue-500/5 blur-xl transition-all group-focus-within:bg-blue-500/10" />
                                <div className="relative flex items-center rounded-[30px] border border-slate-200/80 bg-white p-1.5 pr-2 shadow-[0_10px_40px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_10px_50px_rgba(0,0,0,0.1)] group-focus-within:border-slate-300">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        multiple
                                    />
                                    <button
                                        onClick={handleFileClick}
                                        className="rounded-full p-2.5 text-slate-500 transition-colors hover:bg-slate-50"
                                    >
                                        <Plus className="h-5 w-5" strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                                        placeholder="Message the team and watch the coordination feed update…"
                                        className="h-10 flex-1 border-none bg-transparent px-2 text-[15px] font-medium placeholder:text-slate-400 focus:ring-0"
                                    />
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={toggleMic}
                                            className={`rounded-full p-2.5 transition-colors hover:bg-slate-50 ${isRecording ? 'animate-pulse bg-blue-50 text-blue-600' : 'text-slate-500'}`}
                                        >
                                            <Mic className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={handleBroadcast}
                                            disabled={sending || !message.trim()}
                                            className="ml-1 flex items-center justify-center rounded-full bg-[#0A6BFF] p-2 text-white shadow-md transition-all hover:bg-blue-600 active:scale-90 disabled:opacity-100 disabled:shadow-none"
                                        >
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m5 12 7-7 7 7" /><path d="M12 19V5" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 px-2 text-[11px] text-slate-500">
                                <MessageSquareText className="h-3.5 w-3.5 text-slate-400" />
                                Broadcast messages create tracked runs, so replies and coordination notes show up here as the agents work.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Broadcast;
