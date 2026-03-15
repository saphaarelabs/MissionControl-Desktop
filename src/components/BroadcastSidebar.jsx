import React from 'react';
import { useBroadcast } from '../contexts/BroadcastContext';
import { Send, Loader2, Check } from 'lucide-react';

const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

const BroadcastSidebar = () => {
    const {
        agents,
        selectedAgents,
        setSelectedAgents,
        instruction,
        setInstruction,
        sending,
        handleBroadcast
    } = useBroadcast();
    const onlineAgents = agents.filter(a => a.status === 'online');

    const handleSelectAll = (checked) => {
        setSelectedAgents(checked ? onlineAgents.map(a => a.id) : []);
    };

    const handleAgentToggle = (agentId) => {
        setSelectedAgents((prev) => prev.includes(agentId)
            ? prev.filter(id => id !== agentId)
            : [...prev, agentId]
        );
    };
    const [taskHeight, setTaskHeight] = React.useState(() => {
        const saved = localStorage.getItem('broadcastTaskHeight');
        return saved ? parseInt(saved, 10) : 280;
    });
    const [isResizing, setIsResizing] = React.useState(false);

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
            // Set limits: min 150px, max 70% of screen
            if (newHeight >= 150 && newHeight <= window.innerHeight * 0.7) {
                setTaskHeight(newHeight);
                localStorage.setItem('broadcastTaskHeight', newHeight.toString());
            }
        }
    };

    React.useEffect(() => {
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

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200">
            {/* Top: Agents Live */}
            <div className="flex-1 min-h-0 flex flex-col p-4">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest mb-4 flex-shrink-0 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                    Agents Live
                </h3>

                <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                    <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-all group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={onlineAgents.length > 0 && selectedAgents.length === onlineAgents.length}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="peer appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-blue-600 checked:border-blue-600 transition-all"
                            />
                            <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" />
                        </div>
                        <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">Select All Online</span>
                        <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {selectedAgents.length}/{onlineAgents.length}
                        </span>
                    </label>

                    {onlineAgents.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-[11px] font-medium text-slate-400 italic">No agents online currently</p>
                        </div>
                    ) : (
                        onlineAgents.map(agent => (
                            <label
                                key={agent.id}
                                className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${selectedAgents.includes(agent.id)
                                    ? 'bg-blue-50/50 border-blue-100 shadow-sm'
                                    : 'hover:bg-slate-50 border-transparent'
                                    }`}
                            >
                                <div className="relative flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedAgents.includes(agent.id)}
                                        onChange={() => handleAgentToggle(agent.id)}
                                        className="peer appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-blue-600 checked:border-blue-600 transition-all"
                                    />
                                    <Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none transition-opacity" />
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs border border-slate-200 shrink-0">
                                        {agent.identity?.emoji || agent.id[0].toUpperCase()}
                                    </div>
                                    <span className="text-[12px] font-medium text-slate-700 truncate">
                                        {agent.identity?.name || agent.id}
                                    </span>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                </div>
                            </label>
                        ))
                    )}
                </div>
            </div>

            {/* Resizable Bottom: Task Instructions */}
            <div
                className={`relative border-t border-slate-200 p-4 bg-white flex flex-col ${!isResizing ? 'transition-[height] duration-200' : ''}`}
                style={{ height: `${taskHeight}px` }}
            >
                {/* Vertical Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className={`absolute -top-1 left-0 right-0 h-2 cursor-row-resize z-50 hover:bg-blue-400/30 transition-colors ${isResizing ? 'bg-blue-500/20' : ''}`}
                />

                <h3 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest mb-3 flex-shrink-0">
                    Task Instructions
                </h3>

                <form id="task-form" onSubmit={handleBroadcast} className="flex-1 flex flex-col space-y-3 min-h-0">
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className={`w-full flex-1 p-3 text-[13px] font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition-all resize-none shadow-inner ${FOCUS_RING}`}
                        placeholder="Describe the task for the selected agents..."
                    />

                    <button
                        type="submit"
                        disabled={sending || selectedAgents.length === 0 || !instruction.trim()}
                        className={`w-full shrink-0 flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-[11px] uppercase tracking-widest shadow-lg transition-all ${!instruction.trim()
                            ? 'bg-slate-100 text-slate-400 shadow-none'
                            : 'bg-[#0A6BFF] text-white hover:bg-blue-700 shadow-blue-200 active:scale-95'
                            } ${FOCUS_RING}`}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>ASSIGNING...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>ASSIGN TASK</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BroadcastSidebar;
