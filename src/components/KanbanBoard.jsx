import React, { useState, useEffect } from 'react';
import { apiAuthFetch } from '../lib/apiBase';
import { Plus, Calendar, MessageSquare, Cpu } from 'lucide-react';

const COLUMNS = [
    { id: 'inbox', title: 'INBOX', dot: 'bg-gray-400' },
    { id: 'assigned', title: 'ASSIGNED', dot: 'bg-blue-400' },
    { id: 'active', title: 'IN PROGRESS', dot: 'bg-emerald-500' },
    { id: 'review', title: 'REVIEW', dot: 'bg-amber-500' },
    { id: 'done', title: 'DONE', dot: 'bg-green-500' }
];

const KanbanBoard = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [gatewayStatus, setGatewayStatus] = useState('offline');
    const [createOpen, setCreateOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');
    const [detailsTask, setDetailsTask] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [newPriority, setNewPriority] = useState(3);

    useEffect(() => {
        fetchTasks();
        fetchGatewayStatus();
        const interval = setInterval(() => {
            fetchTasks();
            fetchGatewayStatus();
            apiAuthFetch('/api/heartbeat', { method: 'POST' }).catch(() => { /* ignore */ });
        }, 5_000);
        return () => clearInterval(interval);
    }, []);

    const fetchGatewayStatus = async () => {
        try {
            const response = await apiAuthFetch('/api/health');
            const data = await response.json().catch(() => null);
            setGatewayStatus(data?.status === 'online' ? 'online' : 'offline');
        } catch {
            setGatewayStatus('offline');
        }
    };

    const fetchTasks = async () => {
        try {
            const response = await apiAuthFetch(`/api/tasks?includeNarrative=false&includeLog=false&limit=800&t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                setTasks(data.jobs || []);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTaskStatus = (task) => {
        return task?.metadata?.status || task?.status || '';
    };

    const getColumnTasks = (columnId) => {
        const known = new Set(['completed', 'failed', 'review', 'picked_up', 'assigned', 'run_requested', 'scheduled', 'disabled']);
        const byStatus = (status) => tasks.filter(t => getTaskStatus(t) === status);

        if (columnId === 'done') return byStatus('completed');
        if (columnId === 'failed') return byStatus('failed');
        if (columnId === 'review') return byStatus('review');
        if (columnId === 'active') return byStatus('picked_up');
        if (columnId === 'assigned') return byStatus('assigned').concat(byStatus('run_requested')).concat(byStatus('scheduled'));
        if (columnId === 'inbox') {
            return tasks.filter((t) => {
                const s = String(getTaskStatus(t) || '').trim();
                if (!s) return true;
                if (s === 'disabled') return true;
                return !known.has(s);
            });
        }
        return [];
    };

    const handleCreateTask = async () => {
        const message = String(newMessage || '').trim();
        if (!message) return;
        const priority = Math.max(1, Math.min(5, Number(newPriority) || 3));
        setSaving(true);
        try {
            await apiAuthFetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    agentId: 'main',
                    priority,
                    source: 'kanban',
                    name: `Task: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`
                })
            });
            setCreateOpen(false);
            setNewMessage('');
            setNewPriority(3);
            fetchTasks();
        } catch (error) {
            console.error('Failed to create task:', error);
        } finally {
            setSaving(false);
        }
    };

    const openDetails = async (task) => {
        if (!task?.id) return;
        setDetailsOpen(true);
        setDetailsLoading(true);
        setDetailsError('');
        setDetailsTask(null);
        try {
            const res = await apiAuthFetch(`/api/tasks?ids=${encodeURIComponent(String(task.id))}&includeNarrative=true&includeLog=true&limit=1&t=${Date.now()}`);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Failed to load details: ${res.status} ${text}`);
            }
            const data = await res.json();
            const full = Array.isArray(data?.jobs) ? data.jobs[0] : null;
            setDetailsTask(full || task);
        } catch (err) {
            setDetailsError(err?.message || 'Failed to load details');
            setDetailsTask(task);
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setDetailsError('');
        setDetailsLoading(false);
        setDetailsTask(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-5 py-5 flex justify-between items-center bg-white border-b border-slate-100 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-3">
                    <h2 className="text-[13px] font-extrabold text-slate-900 tracking-[0.25em] uppercase">
                        Command Center
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5 shadow-sm" aria-live="polite">
                        <div
                            className={`h-2.5 w-2.5 rounded-full ${gatewayStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}
                            aria-hidden="true"
                        />
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                            {gatewayStatus === 'online' ? 'Connected' : 'Offline'}
                        </span>
                    </div>
                    <button
                        onClick={() => setCreateOpen(true)}
                        disabled={saving}
                        className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[11px] font-extrabold uppercase tracking-widest hover:bg-blue-700 shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[0] flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" />
                        {saving ? 'Deploying…' : 'New Mission'}
                    </button>
                </div>
            </div>

            {createOpen && (
                <div className="fixed inset-0 z-50 overscroll-contain">
                    <button
                        type="button"
                        aria-label="Close dialog"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => !saving && setCreateOpen(false)}
                    />

                    <div className="relative flex min-h-full items-center justify-center p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="create-task-title"
                            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
                        >
                            <div className="border-b border-gray-200 px-4 py-3">
                                <div id="create-task-title" className="text-sm font-semibold text-gray-900">Create task</div>
                                <div className="text-xs text-gray-500">This will run automatically.</div>
                            </div>

                            <div className="space-y-3 p-4">
                                <div>
                                    <label htmlFor="task-instructions" className="mb-1 block text-xs font-medium text-gray-700">
                                        Task instructions
                                    </label>
                                    <textarea
                                        id="task-instructions"
                                        name="message"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="h-28 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60"
                                        placeholder="Describe the task…"
                                        disabled={saving}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="task-priority" className="mb-1 block text-xs font-medium text-gray-700">
                                        Priority
                                    </label>
                                    <select
                                        id="task-priority"
                                        name="priority"
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(Number(e.target.value) || 3)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60"
                                        disabled={saving}
                                    >
                                        <option value={5}>5 (highest)</option>
                                        <option value={4}>4</option>
                                        <option value={3}>3 (normal)</option>
                                        <option value={2}>2</option>
                                        <option value={1}>1 (lowest)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => setCreateOpen(false)}
                                    disabled={saving}
                                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCreateTask}
                                    disabled={saving || !String(newMessage || '').trim()}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
                                >
                                    {saving ? 'Creating…' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-x-auto bg-white">
                <div className="flex gap-1 px-4 py-4 h-full min-w-max">
                    {COLUMNS.map(column => {
                        const columnTasks = getColumnTasks(column.id);

                        return (
                            <div key={column.id} className="w-[270px] flex flex-col bg-slate-50 rounded-2xl h-full border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
                                <div className="px-5 py-4 flex justify-between items-center border-b border-slate-200/30 bg-white">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-2.5 h-2.5 rounded-full ${column.dot} shadow-sm`}></div>
                                        <h3 className="font-extrabold text-slate-900 text-[11px] tracking-[0.15em] uppercase">
                                            {column.title}
                                        </h3>
                                        <span className="bg-slate-200/60 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
                                            {columnTasks.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-3">
                                    {columnTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => openDetails(task)}
                                            className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_2px_4px_rgba(0,0,0,0.03)] hover:shadow-xl hover:translate-y-[-2px] transition-all cursor-pointer relative overflow-hidden group"
                                        >
                                            <div className={`absolute top-0 left-0 right-0 h-[3px] ${task.agentId?.toLowerCase().includes('loki') ? 'bg-blue-400' :
                                                task.agentId?.toLowerCase().includes('vision') ? 'bg-emerald-400' :
                                                    task.agentId?.toLowerCase().includes('jarvis') ? 'bg-blue-400' :
                                                        task.agentId?.toLowerCase().includes('fury') ? 'bg-red-400' :
                                                            'bg-blue-300'
                                                } opacity-70`}></div>
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-1">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                                                        <path d="M7 17l10-10M17 17V7H7" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 text-[14px] leading-tight mb-2 tracking-tight">
                                                        {task.name}
                                                    </h4>
                                                    <p className="text-[12px] text-gray-400 leading-normal line-clamp-2 mb-4">
                                                        {task.payload?.message || task?.metadata?.message || 'No description provided for this mission goal.'}
                                                    </p>

                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-5 h-5 rounded-md ${task.agentId?.toLowerCase().includes('fury') ? 'bg-red-100 text-red-600' :
                                                                'bg-blue-100 text-blue-600'
                                                                } flex items-center justify-center text-[10px] font-bold`}>
                                                                {(task.agentId || 'J').charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="text-[11px] font-bold text-gray-600">{task.agentId || 'Jarvis'}</span>
                                                        </div>
                                                        <span className="text-[10px] font-medium text-gray-300">
                                                            {task.metadata?.createdAt ? new Date(task.metadata.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                                                        </span>
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap gap-1.5 leading-none">
                                                        <span className="px-2 py-1 bg-gray-100/50 text-gray-400 text-[9px] font-bold rounded uppercase tracking-wider">research</span>
                                                        {column.id === 'inbox' && <span className="px-2 py-1 bg-gray-100/50 text-gray-400 text-[9px] font-bold rounded uppercase tracking-wider">content</span>}
                                                        {column.id === 'active' && <span className="px-2 py-1 bg-gray-100/50 text-gray-400 text-[9px] font-bold rounded uppercase tracking-wider">internal</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover highlight line */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {detailsOpen && (
                <div className="fixed inset-0 z-50 overscroll-contain">
                    <button
                        type="button"
                        aria-label="Close dialog"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => !detailsLoading && closeDetails()}
                    />

                    <div className="relative flex min-h-full items-center justify-center p-4">
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5"
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900">Task details</div>
                                    <div className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                                        {detailsTask?.name || '—'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDetails}
                                    disabled={detailsLoading}
                                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="max-h-[70vh] overflow-y-auto p-4">
                                {detailsLoading && (
                                    <div className="text-sm text-gray-600">Loading…</div>
                                )}

                                {detailsError && (
                                    <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {detailsError}
                                    </div>
                                )}

                                {detailsTask && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Field label="ID" value={detailsTask.id} />
                                            <Field label="Status" value={getTaskStatus(detailsTask) || '—'} />
                                            <Field label="Agent" value={detailsTask.agentId || '—'} />
                                            <Field label="Priority" value={detailsTask?.metadata?.priority ? `p${detailsTask.metadata.priority}` : '—'} />
                                            <Field label="Created" value={detailsTask?.metadata?.createdAt || detailsTask?.createdAt || '—'} />
                                            <Field label="Updated" value={detailsTask?.metadata?.updatedAt || detailsTask?.updatedAt || '—'} />
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold text-gray-700">Message</div>
                                            <div className="mt-1 whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                                                {detailsTask?.payload?.message || detailsTask?.metadata?.message || '—'}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                                                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                                Agents Comments
                                            </div>
                                            <div className="mt-2 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                                {(detailsTask?.metadata?.lastRun?.summary || detailsTask?.metadata?.lastDecision?.reason || (Array.isArray(detailsTask?.metadata?.narrative) && detailsTask.metadata.narrative.length > 0)) ? (
                                                    <div className="space-y-3">
                                                        {/* High-level Decision/Summary Comment */}
                                                        {(detailsTask?.metadata?.lastDecision?.reason || detailsTask?.metadata?.lastRun?.summary) && (
                                                            <div className="flex flex-col gap-1 rounded-xl bg-blue-600 p-4 shadow-md">
                                                                <div className="flex items-center justify-between gap-4 border-b border-blue-500/50 pb-2 mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center">
                                                                            <Cpu className="h-2.5 w-2.5 text-white" />
                                                                        </div>
                                                                        <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">
                                                                            {detailsTask?.agentId || 'AGENT'} DECISION
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[9px] font-medium text-blue-100 tabular-nums">
                                                                        {detailsTask?.metadata?.lastDecision?.ts || detailsTask?.metadata?.lastRun?.ts || 'latest'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-white leading-relaxed font-medium">
                                                                    {detailsTask?.metadata?.lastDecision?.reason || detailsTask?.metadata?.lastRun?.summary}
                                                                </div>
                                                                {detailsTask?.metadata?.lastRun?.error && (
                                                                    <div className="mt-2 rounded-lg bg-red-900/30 border border-red-500/30 p-2 text-[11px] text-red-100 font-mono">
                                                                        Error: {String(detailsTask.metadata.lastRun.error)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Narrative History */}
                                                        {Array.isArray(detailsTask?.metadata?.narrative) && detailsTask.metadata.narrative.map((n, idx) => (
                                                            <div key={idx} className="flex flex-col gap-1 rounded-xl bg-slate-50 border border-slate-100 p-3 shadow-sm transition-all hover:border-blue-100 hover:bg-blue-50/30">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                                                                            <Cpu className="h-2.5 w-2.5 text-blue-600" />
                                                                        </div>
                                                                        <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-widest">
                                                                            {n.agentId || 'system'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[9px] font-medium text-slate-400 tabular-nums">
                                                                        {n.ts ? new Date(n.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-slate-700 leading-relaxed font-medium">
                                                                    {n.text || '—'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                                        <MessageSquare className="w-6 h-6 text-slate-300 mb-2" />
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Awaiting Comments</p>
                                                        <p className="text-[10px] text-slate-400 mt-1">Agents will post their feedback here.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const Field = ({ label, value }) => (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="text-[11px] font-semibold text-gray-600">{label}</div>
        <div className="mt-1 text-sm font-medium text-gray-900 break-words">{String(value ?? '—')}</div>
    </div>
);

export default KanbanBoard;
