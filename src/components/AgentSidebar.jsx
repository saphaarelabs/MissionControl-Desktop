import React, { useState, useEffect, useCallback } from 'react';
import { apiAuthFetch } from '../lib/apiBase';
import { Zap, Play, Square, Circle, Plus, AlertCircle, Cpu, Clock, RefreshCw, MoreVertical, Trash2, PanelLeft, Edit, Search, Grid, Settings } from 'lucide-react';
import CreateAgentModal from './CreateAgentModal';

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';

function timeAgo(ms) {
    if (!ms) return '';
    const diff = Date.now() - ms;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
}

const AgentSidebar = ({ onAgentClick, selectedAgentId, embedded, toggleSidebar, isSidebarOpen = true }) => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isHoveringToggle, setIsHoveringToggle] = useState(false);

    const fetchAgents = useCallback(async () => {
        try {
            setError(null);
            const response = await apiAuthFetch('/api/subagents');
            if (!response.ok) throw new Error('Failed to fetch sub-agents');
            const data = await response.json();
            setAgents(data.subagents || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();

        // Poll every 15s to pick up newly spawned agents
        const interval = setInterval(fetchAgents, 15000);

        // Listen to custom event dispatched by Header when new subagent is created
        const handleAgentCreated = () => {
            setLoading(true);
            fetchAgents();
        };
        window.addEventListener('agentCreated', handleAgentCreated);

        return () => {
            clearInterval(interval);
            window.removeEventListener('agentCreated', handleAgentCreated);
        };
    }, [fetchAgents]);

    if (!isSidebarOpen) {
        return (
            <div className="flex h-full flex-col items-center bg-slate-50 py-4 text-slate-500">
                <button
                    onClick={toggleSidebar}
                    onMouseEnter={() => setIsHoveringToggle(true)}
                    onMouseLeave={() => setIsHoveringToggle(false)}
                    className="mb-8 p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                    aria-label="Open sidebar"
                >
                    {isHoveringToggle ? <PanelLeft className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center p-4 ${embedded ? 'h-full bg-transparent' : 'rounded-xl border border-slate-200 bg-white shadow-sm'}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const containerClasses = embedded
        ? "h-full flex flex-col overflow-hidden bg-transparent"
        : "h-full rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden lg:sticky lg:top-6 lg:max-h-full";

    return (
        <div className={containerClasses}>
            <div className="min-h-16 shrink-0 p-4 border-b border-slate-200 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                <h2 className="text-[11px] font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                    <Zap className="w-4 h-4 text-blue-600" aria-hidden="true" />
                    Agents
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => { setLoading(true); fetchAgents(); }}
                        aria-label="Refresh agents"
                        className={`rounded-md p-1.5 text-gray-500 transition-colors hover:bg-blue-100 hover:text-blue-700 ${FOCUS_RING}`}
                    >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {toggleSidebar && (
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            aria-label="Close sidebar"
                            className={`rounded-md p-1.5 text-gray-500 transition-colors hover:bg-slate-100 hover:text-slate-700 ${FOCUS_RING}`}
                        >
                            <PanelLeft className="w-4 h-4" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                    <button
                        type="button"
                        className={`ml-2 underline ${FOCUS_RING}`}
                        onClick={() => { setLoading(true); fetchAgents(); }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {agents.map((agent) => (
                    <div
                        key={agent.sessionKey}
                        className={`group p-3 rounded-lg border transition-all hover:shadow-md ${selectedAgentId === agent.sessionKey
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                    {(agent.label?.[0] || 'S').toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 text-sm">{agent.label}</h3>
                                    <div className="flex items-center gap-1">
                                        <Circle className="w-2 h-2 text-green-500 fill-green-500" aria-hidden="true" />
                                        <span className="text-xs text-gray-500">Active</span>
                                    </div>
                                </div>
                            </div>

                            {onAgentClick && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onAgentClick(agent); }}
                                    aria-label={`View agent ${agent.label}`}
                                    className={`rounded-md p-1.5 text-gray-500 transition-colors hover:bg-blue-100 hover:text-blue-700 ${FOCUS_RING}`}
                                >
                                    <Settings className="w-4 h-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                            {agent.model && (
                                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600 w-fit">
                                    <Cpu className="w-3 h-3" aria-hidden="true" />
                                    <span className="truncate max-w-[120px]">{agent.model}</span>
                                </div>
                            )}
                            {agent.updatedAt && (
                                <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                                    <Clock className="w-3 h-3" />
                                    <span>{timeAgo(agent.updatedAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {agents.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-gray-500">No agents running</p>
                        <p className="text-xs mt-1">Click <strong>+</strong> to spawn one</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AgentSidebar;
