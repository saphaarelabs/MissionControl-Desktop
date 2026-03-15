import React, { useState, useEffect, useRef } from 'react';
import { apiAuthFetch } from '../lib/apiBase';
import { Send, Bot, User, Loader2, Zap, MessageSquare, CheckCircle2, FileText, Lightbulb, Bell, Search, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

const FeedSidebar = ({ agentId = 'main' }) => {
    const [feedItems, setFeedItems] = useState([]);

    const [activeFilter, setActiveFilter] = useState('All');
    const filters = [
        { name: 'All', count: null },
        { name: 'Tasks', count: 0 },
        { name: 'Comments', count: 0 },
        { name: 'Decisions', count: 0 },
        { name: 'Docs', count: 0 },
        { name: 'Status', count: 0 },
    ];

    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [sending, setSending] = useState(false);
    const [chatHeight, setChatHeight] = useState(() => {
        const saved = localStorage.getItem('chatAreaHeight');
        return saved ? parseInt(saved, 10) : 320;
    });
    const [isResizing, setIsResizing] = useState(false);
    const messagesEndRef = useRef(null);

    const startResizing = (e) => {
        e.preventDefault();
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (e) => {
        if (isResizing) {
            const newHeight = window.innerHeight - e.clientY;
            // Set limits: min 150px, max 80% of screen
            if (newHeight >= 150 && newHeight <= window.innerHeight * 0.8) {
                setChatHeight(newHeight);
                localStorage.setItem('chatAreaHeight', newHeight.toString());
            }
        }
    };

    useEffect(() => {
        if (isResizing) {
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
    }, [isResizing]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setSending(true);

        try {
            const response = await apiAuthFetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message: userMsg,
                    agentId,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Request failed');
                throw new Error(errorText || 'Request failed');
            }

            const data = await response.json().catch(() => ({}));
            const content =
                data?.choices?.[0]?.message?.content
                ?? data?.message?.content
                ?? data?.content
                ?? 'No response content received.';

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: String(content).trim() || 'No response content received.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Request failed: ${error.message || 'Unknown error'}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-[-1px_0_3px_rgba(0,0,0,0.01)]">
            {/* Header: Live Feed */}
            <div className="p-5 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                    <h2 className="text-[12px] font-extrabold text-slate-900 tracking-[0.25em] uppercase font-mono">Feed</h2>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {filters.map((f) => (
                        <button
                            key={f.name}
                            onClick={() => setActiveFilter(f.name)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 border ${activeFilter === f.name
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                }`}
                        >
                            {f.name}
                            {f.count !== null && (
                                <span className={`text-[10px] opacity-70 ${activeFilter === f.name ? 'text-white' : 'text-slate-400'}`}>
                                    {f.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Feed Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                {feedItems.map((item) => (
                    <div key={item.id} className="group relative pl-4 border-l-2 border-slate-100 pb-1">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center group-hover:border-blue-400 transition-colors">
                            {item.icon}
                        </div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{item.label}</span>
                            <span className="text-[9px] text-slate-300 font-medium">{item.time}</span>
                        </div>
                        <p className="text-[12px] text-slate-600 leading-relaxed font-medium">{item.content}</p>
                    </div>
                ))}
            </div>

            {/* Chat Area */}
            <div
                className={`border-t border-slate-200 flex flex-col bg-white overflow-hidden relative ${!isResizing ? 'transition-[height] duration-200' : ''}`}
                style={{ height: `${chatHeight}px`, maxHeight: '80%' }}
            >
                {/* Vertical Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className={`absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-50 hover:bg-blue-400/30 transition-colors ${isResizing ? 'bg-blue-500/20' : ''}`}
                />

                <div className="p-3 border-b border-slate-50 bg-slate-50/20 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-[0.2em] font-mono">Agent Chat</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-[12px] font-medium shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200/50'
                                }`}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                <div className={`text-[9px] mt-1.5 opacity-60 ${msg.role === 'user' ? 'text-white' : 'text-slate-400'}`}>
                                    {msg.time}
                                </div>
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none border border-slate-200/50 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 border-t border-slate-100 bg-white">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message agent..."
                            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-12 text-[12px] font-medium transition-all ${FOCUS_RING} hover:bg-slate-100 focus:bg-white`}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            className="absolute right-1 text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-30"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedSidebar;
