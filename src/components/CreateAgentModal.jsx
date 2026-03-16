import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiAuthFetch } from '../lib/apiBase';
import { X, Zap, AlertCircle } from 'lucide-react';

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2';

const CreateAgentModal = ({ isOpen, onClose, onCreated }) => {
    const [availableModels, setAvailableModels] = useState([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [spawning, setSpawning] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        label: '',
        identityMd: '',
        soulMd: '',
        agentsMd: '',
        specialties: '',
        apps: '',
        initialTask: '',
        model: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setFormData({
            label: '',
            identityMd: '',
            soulMd: '',
            agentsMd: '',
            specialties: '',
            apps: '',
            initialTask: '',
            model: ''
        });

        const load = async () => {
            setLoadingModels(true);
            try {
                const res = await apiAuthFetch('/api/models');
                const data = await res.json().catch(() => ({}));
                setAvailableModels(Array.isArray(data.models) ? data.models : []);
            } catch (err) {
                console.error('Failed to load models', err);
                setAvailableModels([]);
            } finally {
                setLoadingModels(false);
            }
        };

        load();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !spawning) {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, spawning]);

    if (!isOpen) return null;

    const applyLabelPreset = (nextLabel) => {
        setFormData((current) => {
            const trimmed = nextLabel.trim();
            const autoIdentity = current.identityMd.trim() === '' || current.identityMd.includes('You are ') || current.identityMd.startsWith('# ');
            const autoSoul = current.soulMd.trim() === '' || current.soulMd.startsWith('# Working Style');
            const autoAgents = current.agentsMd.trim() === '' || current.agentsMd.startsWith('# Operating Rules');

            return {
                ...current,
                label: nextLabel,
                identityMd: autoIdentity ? [
                    `# ${trimmed || 'Specialist agent'}`,
                    '',
                    `You are ${trimmed || 'a specialist agent'}.`,
                    'Own the domain you were created for, communicate clearly, and stay aligned with the workspace mission.'
                ].join('\n') : current.identityMd,
                soulMd: autoSoul ? [
                    '# Working Style',
                    '',
                    'Operate with calm judgment, evidence-driven thinking, and direct communication.',
                    'Prefer depth over speed when the task is ambiguous, and summarize tradeoffs clearly.'
                ].join('\n') : current.soulMd,
                agentsMd: autoAgents ? [
                    '# Operating Rules',
                    '',
                    `You are the ${trimmed || 'specialist'} agent.`,
                    'Start by clarifying the objective, gather the strongest evidence available, and produce structured outputs.',
                    'Escalate uncertainties instead of guessing, and keep notes concise and useful for the rest of the team.'
                ].join('\n') : current.agentsMd
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (![formData.label, formData.identityMd, formData.soulMd, formData.agentsMd, formData.initialTask].some((value) => value.trim())) return;
        setSpawning(true);
        setError(null);

        try {
            const capabilityNotes = [];
            if (formData.specialties.trim()) capabilityNotes.push(`Capabilities: ${formData.specialties.trim()}`);
            if (formData.apps.trim()) capabilityNotes.push(`Tools / apps: ${formData.apps.trim()}`);

            const body = {
                label: formData.label.trim() || undefined,
                identityMd: formData.identityMd.trim() || undefined,
                soulMd: formData.soulMd.trim() || undefined,
                agentsMd: [formData.agentsMd.trim(), capabilityNotes.length ? `## Capability Profile\n${capabilityNotes.map((line) => `- ${line}`).join('\n')}` : ''].filter(Boolean).join('\n\n') || undefined,
                initialTask: formData.initialTask.trim() || undefined,
                model: formData.model || undefined
            };

            const response = await apiAuthFetch('/api/subagents/spawn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || 'Failed to deploy agent');

            onCreated?.(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setSpawning(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm overscroll-contain sm:p-6"
            onClick={() => {
                if (!spawning) onClose?.();
            }}
        >
            <div className="flex min-h-full items-start justify-center py-6 sm:items-center sm:py-10">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="spawn-agent-title"
                    className="w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] animate-in fade-in zoom-in duration-200"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="flex items-center justify-between border-b border-slate-200 bg-[linear-gradient(135deg,_#ffffff_0%,_#f8fafc_65%,_#eef4ff_100%)] px-6 py-5">
                        <div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Subagent Creation</div>
                            <h3 id="spawn-agent-title" className="mt-2 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
                                <Zap className="w-5 h-5 text-violet-600" />
                                Deploy Agent
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close dialog"
                            className={`rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 ${FOCUS_RING}`}
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="max-h-[min(78vh,720px)] overflow-y-auto p-6 space-y-5">
                        {error && (
                            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="spawn-label" className="mb-1 block text-sm font-medium text-gray-700">
                                Agent name
                            </label>
                            <input
                                id="spawn-label"
                                type="text"
                                value={formData.label}
                                onChange={(e) => applyLabelPreset(e.target.value)}
                                autoComplete="off"
                                className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors ${FOCUS_RING}`}
                                placeholder="e.g. Research & Writer"
                            />
                        </div>

                        <div>
                            <label htmlFor="spawn-identity" className="mb-1 block text-sm font-medium text-gray-700">
                                Identity.md
                            </label>
                            <textarea
                                id="spawn-identity"
                                value={formData.identityMd}
                                onChange={(e) => setFormData({ ...formData, identityMd: e.target.value })}
                                rows={4}
                                className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors resize-y ${FOCUS_RING}`}
                                placeholder="Who this agent is, what role it owns, and how it should introduce itself."
                            />
                            <p className="mt-1 text-xs text-gray-500">This becomes the agent identity file inside its workspace.</p>
                        </div>

                        <div>
                            <label htmlFor="spawn-soul" className="mb-1 block text-sm font-medium text-gray-700">
                                SOUL.md
                            </label>
                            <textarea
                                id="spawn-soul"
                                value={formData.soulMd}
                                onChange={(e) => setFormData({ ...formData, soulMd: e.target.value })}
                                rows={4}
                                className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors resize-y ${FOCUS_RING}`}
                                placeholder="Working style, tone, values, and decision-making preferences."
                            />
                        </div>

                        <div>
                            <label htmlFor="spawn-agents" className="mb-1 block text-sm font-medium text-gray-700">
                                AGENTS.md
                            </label>
                            <textarea
                                id="spawn-agents"
                                value={formData.agentsMd}
                                onChange={(e) => setFormData({ ...formData, agentsMd: e.target.value })}
                                rows={5}
                                className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors resize-y ${FOCUS_RING}`}
                                placeholder="Operating rules, quality bar, escalation policy, and execution guidance."
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="spawn-specialties" className="mb-1 block text-sm font-medium text-gray-700">
                                    Specialties
                                </label>
                                <input
                                    id="spawn-specialties"
                                    type="text"
                                    value={formData.specialties}
                                    onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                                    className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors ${FOCUS_RING}`}
                                    placeholder="e.g. research, writing, synthesis"
                                />
                                <p className="mt-1 text-xs text-gray-500">Used by Mission Manager to route tasks to the right owner.</p>
                            </div>

                            <div>
                                <label htmlFor="spawn-apps" className="mb-1 block text-sm font-medium text-gray-700">
                                    Tools / Apps
                                </label>
                                <input
                                    id="spawn-apps"
                                    type="text"
                                    value={formData.apps}
                                    onChange={(e) => setFormData({ ...formData, apps: e.target.value })}
                                    className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors ${FOCUS_RING}`}
                                    placeholder="e.g. gmail, notion, github"
                                />
                                <p className="mt-1 text-xs text-gray-500">Only list apps this agent should be trusted to use.</p>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="spawn-initial-task" className="mb-1 block text-sm font-medium text-gray-700">
                                Optional kickoff task <span className="font-normal text-gray-400">(runs after creation)</span>
                            </label>
                            <textarea
                                id="spawn-initial-task"
                                value={formData.initialTask}
                                onChange={(e) => setFormData({ ...formData, initialTask: e.target.value })}
                                rows={3}
                                className={`w-full rounded-xl border border-gray-300 px-3 py-2.5 shadow-sm transition-colors resize-y ${FOCUS_RING}`}
                                placeholder="Optional first assignment for the new agent."
                            />
                        </div>

                        <div>
                            <label htmlFor="spawn-model" className="mb-1 block text-sm font-medium text-gray-700">
                                Model <span className="font-normal text-gray-400">(optional — uses default if blank)</span>
                            </label>
                            {loadingModels ? (
                                <div className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-400">
                                    Loading models…
                                </div>
                            ) : (
                                <select
                                    id="spawn-model"
                                    value={formData.model}
                                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                    className={`w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 shadow-sm transition-colors ${FOCUS_RING}`}
                                >
                                    <option value="">Use default model</option>
                                    {availableModels.map((m) => (
                                        <option key={m.key} value={m.key}>
                                            {m.name} ({m.key})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className={`rounded-xl px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-100 ${FOCUS_RING}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={spawning || ![formData.label, formData.identityMd, formData.soulMd, formData.agentsMd, formData.initialTask].some((value) => value.trim())}
                                className={`flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                            >
                                <Zap className="w-4 h-4" aria-hidden="true" />
                                {spawning ? 'Creating…' : 'Create agent'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CreateAgentModal;
