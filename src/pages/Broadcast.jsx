import React, { useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, RefreshCw, User, Loader2, Mic, Plus } from 'lucide-react';
import { useBroadcast } from '../contexts/BroadcastContext';

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

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
                alert("Speech recognition not supported in this browser.");
                return;
            }
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setIsRecording(true);
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setMessage(prev => prev ? prev + " " + transcript : transcript);
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
            setMessage(prev => prev + ` [Attached: ${files[0].name}] `);
        }
    };

    useEffect(() => {
        fetchRecent();
        const interval = setInterval(() => {
            if (createdIds.size === 0) fetchRecent();
        }, 15_000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createdIds.size]);

    useEffect(() => {
        if (createdIds.size === 0) return;
        fetchJobs();
        const interval = setInterval(() => {
            fetchJobs();
        }, 10_000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createdIds.size]);

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
                    taskName: job?.name || task.name || task.id
                });
            }
        }
        all.sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')));
        return all.filter(shouldInclude).slice(-250);
    }, [created, jobsById]);

    const recentNarrationMessages = useMemo(() => {
        const shouldInclude = ({ role, text }) => {
            const r = String(role || 'assistant').toLowerCase();
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
                    taskName: job?.name || job?.id
                });
            }
        }
        all.sort((a, b) => String(a.ts || '').localeCompare(String(b.ts || '')));
        return all.filter(shouldInclude).slice(-250);
    }, [recentJobs]);

    const feedMessages = createdIds.size > 0 ? narrationMessages : recentNarrationMessages;
    const feedLoading = createdIds.size > 0 ? loadingJobs : loadingRecent;
    const feedTitle = createdIds.size > 0 ? `Tracking ${created.length} task(s)` : 'Recent activity';

    useEffect(() => {
        scrollToBottom('auto');
    }, [feedMessages.length, sending]);

    return (
        <div className="flex h-full min-h-0 flex-col bg-[#ffffff] font-sans">
            <div className="flex-1 flex min-h-0">
                {/* Full Width Feed */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    <div className="px-8 py-4 flex items-center justify-between border-b border-slate-50">
                        <div>
                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] leading-none mb-1.5">Group Chat Feed</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{feedTitle}</p>
                        </div>
                        <button
                            onClick={() => (createdIds.size > 0 ? fetchJobs() : fetchRecent())}
                            disabled={feedLoading}
                            className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${feedLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-8 pb-32 space-y-8 scroll-smooth">
                        {feedMessages.length === 0 && !sending && !feedLoading && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20">
                                <Bot className="w-12 h-12 mb-4" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">No transmissions yet</p>
                            </div>
                        )}

                        {feedMessages.map((m, idx) => {
                            const isUser = m.role === 'user';
                            return (
                                <div key={`${m.jobId}-${idx}`} className={`flex gap-6 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 shadow-sm ${isUser ? 'bg-slate-900 text-white' : 'bg-white text-blue-600'}`}>
                                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1 max-w-3xl space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                                                {m.agentId || 'ADMIN'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-300">
                                                {m.ts || 'RECENT'}
                                            </span>
                                        </div>
                                        <div className="text-[14px] leading-relaxed text-slate-700 font-medium">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                                    code: ({ inline, children }) => inline
                                                        ? <code className="bg-slate-50 text-blue-600 px-1.5 py-0.5 rounded text-[12px] font-mono border border-slate-100">{children}</code>
                                                        : <code className="block bg-slate-950 text-white p-5 rounded-2xl text-[12px] font-mono overflow-x-auto my-4 shadow-xl whitespace-pre">{children}</code>,
                                                    ul: ({ children }) => <ul className="list-disc ml-4 mb-4 space-y-2">{children}</ul>,
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
                            <div className="flex gap-6 animate-pulse">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-24 bg-slate-50 rounded" />
                                    <div className="h-4 w-64 bg-slate-50 rounded-lg" />
                                </div>
                            </div>
                        )}
                        <div ref={endRef} className="h-4" />
                    </div>

                    {/* Floating pill Input */}
                    <div className="absolute bottom-8 left-0 right-0 px-8 pointer-events-none">
                        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500/5 blur-xl group-focus-within:bg-blue-500/10 transition-all rounded-full" />
                                <div className="relative flex items-center bg-white border border-slate-200/80 rounded-[28px] p-1.5 pr-2 shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_50px_rgba(0,0,0,0.1)] transition-all group-focus-within:border-slate-300">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        multiple
                                    />
                                    <button
                                        onClick={handleFileClick}
                                        className="p-2.5 rounded-full hover:bg-slate-50 text-slate-500 transition-colors"
                                    >
                                        <Plus className="w-5 h-5" strokeWidth={2.5} />
                                    </button>
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                                        placeholder="Ask anything..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-medium placeholder:text-slate-400 px-2 h-10"
                                    />
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={toggleMic}
                                            className={`p-2.5 rounded-full hover:bg-slate-50 transition-colors ${isRecording ? 'text-blue-600 animate-pulse bg-blue-50' : 'text-slate-500'}`}
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={handleBroadcast}
                                            disabled={sending || !message.trim()}
                                            className={`bg-[#0A6BFF] text-white p-2 rounded-full shadow-md hover:bg-blue-600 transition-all active:scale-90 flex items-center justify-center ml-1 disabled:opacity-100 disabled:shadow-none`}
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="m5 12 7-7 7 7" /><path d="M12 19V5" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Broadcast;
