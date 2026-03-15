import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiAuthFetch } from '../lib/apiBase';

const BroadcastContext = createContext();

export const useBroadcast = () => {
    const context = useContext(BroadcastContext);
    if (!context) throw new Error('useBroadcast must be used within a BroadcastProvider');
    return context;
};

export const BroadcastProvider = ({ children }) => {
    const { isLoaded, getToken } = useAuth();
    const [agents, setAgents] = useState([]);
    const [selectedAgents, setSelectedAgents] = useState([]);
    const [message, setMessage] = useState('');
    const [instruction, setInstruction] = useState('');
    const [sending, setSending] = useState(false);
    const [created, setCreated] = useState([]);
    const [jobsById, setJobsById] = useState({});
    const [loadingJobs, setLoadingJobs] = useState(false);
    const [recentJobs, setRecentJobs] = useState([]);
    const [loadingRecent, setLoadingRecent] = useState(false);

    const createdIds = useMemo(() => new Set(created.map(t => t.id)), [created]);

    const fetchAgents = async () => {
        try {
            const token = await getToken();
            const response = await apiAuthFetch('/api/agents', {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            const data = await response.json();
            const list = data.agents || [];
            setAgents(list);

            // Only select agents that are currently 'online' by default
            const onlineIds = list.filter(a => a.status === 'online').map(a => a.id);
            setSelectedAgents(onlineIds);
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        }
    };

    const fetchRecent = async () => {
        setLoadingRecent(true);
        try {
            const response = await apiAuthFetch(`/api/tasks?limit=80&includeNarrative=true&includeLog=false&t=${Date.now()}`);
            if (!response.ok) return;
            const data = await response.json();
            setRecentJobs(Array.isArray(data.jobs) ? data.jobs : []);
        } catch { /* ignore */ } finally { setLoadingRecent(false); }
    };

    const fetchJobs = async () => {
        if (createdIds.size === 0) return;
        setLoadingJobs(true);
        try {
            const ids = Array.from(createdIds).join(',');
            const response = await apiAuthFetch(`/api/tasks?ids=${encodeURIComponent(ids)}&includeNarrative=true&includeLog=false&t=${Date.now()}`);
            if (!response.ok) return;
            const data = await response.json();
            const jobs = Array.isArray(data.jobs) ? data.jobs : [];
            const next = {};
            for (const job of jobs) {
                if (createdIds.has(job?.id)) next[job.id] = job;
            }
            setJobsById(next);
        } catch { /* ignore */ } finally { setLoadingJobs(false); }
    };

    const handleBroadcast = async (e) => {
        if (e) e.preventDefault();
        const isTask = e?.target?.id === 'task-form';
        const content = isTask ? instruction : message;
        if (!content.trim() || selectedAgents.length === 0) return;

        setSending(true);
        setCreated([]);
        setJobsById({});

        try {
            const body = e?.target?.id === 'task-form'
                ? { message: instruction, agentIds: selectedAgents }
                : { message, agentIds: selectedAgents };

            const response = await apiAuthFetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || 'Broadcast failed');
            setCreated(Array.isArray(data.tasks) ? data.tasks : []);
            if (e?.target?.id === 'task-form') setInstruction('');
            else setMessage('');
        } catch (error) {
            console.error('Broadcast failed:', error);
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            fetchAgents();
            const interval = setInterval(fetchAgents, 30_000);
            return () => clearInterval(interval);
        }
    }, [isLoaded]);

    const value = {
        agents,
        selectedAgents,
        setSelectedAgents,
        message,
        setMessage,
        instruction,
        setInstruction,
        sending,
        created,
        createdIds,
        jobsById,
        loadingJobs,
        recentJobs,
        loadingRecent,
        fetchAgents,
        fetchRecent,
        fetchJobs,
        handleBroadcast
    };

    return <BroadcastContext.Provider value={value}>{children}</BroadcastContext.Provider>;
};
