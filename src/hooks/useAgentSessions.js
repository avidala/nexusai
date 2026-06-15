import { useState, useCallback, useEffect } from 'react';
import { backend } from '@/api/backend';

function formatElapsed(startedAt) {
  if (!startedAt) return '';
  const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export function useAgentSessions() {
  const [sessions, setSessions] = useState([]);
  const [messagesMap, setMessagesMap] = useState({}); // sessionId -> messages[]
  const [loading, setLoading] = useState(true);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    const data = await backend.entities.AgentSession.list('-created_date', 100);
    setSessions(data.map(s => ({
      ...s,
      elapsed: formatElapsed(s.started_at),
      toolCallCount: s.tool_call_count ?? 0,
      workingDir: s.working_dir,
      maxTokens: s.max_tokens,
      changedFiles: s.changed_files ?? [],
    })));
    setLoading(false);
  }, []);

  // Load messages for a specific session
  const loadMessages = useCallback(async (sessionId) => {
    const msgs = await backend.entities.AgentMessage.filter(
      { session_id: sessionId },
      'created_date',
      200
    );
    setMessagesMap(prev => ({ ...prev, [sessionId]: msgs }));
    return msgs;
  }, []);

  useEffect(() => {
    loadSessions();
    // Poll for updates every 5s
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // Subscribe to real-time session changes
  useEffect(() => {
    const unsub = backend.entities.AgentSession.subscribe((event) => {
      if (event.type === 'create') {
        setSessions(prev => [{ ...event.data, elapsed: 'just now', toolCallCount: 0, changedFiles: [], workingDir: event.data.working_dir, maxTokens: event.data.max_tokens }, ...prev]);
      } else if (event.type === 'update') {
        setSessions(prev => prev.map(s => s.id === event.id ? {
          ...s,
          ...event.data,
          elapsed: formatElapsed(event.data.started_at || s.started_at),
          toolCallCount: event.data.tool_call_count ?? s.toolCallCount,
          workingDir: event.data.working_dir ?? s.workingDir,
          maxTokens: event.data.max_tokens ?? s.maxTokens,
          changedFiles: event.data.changed_files ?? s.changedFiles,
        } : s));
      } else if (event.type === 'delete') {
        setSessions(prev => prev.filter(s => s.id !== event.id));
      }
    });
    return unsub;
  }, []);

  // Subscribe to real-time message changes
  useEffect(() => {
    const unsub = backend.entities.AgentMessage.subscribe((event) => {
      if (event.type === 'create' && event.data?.session_id) {
        setMessagesMap(prev => {
          const existing = prev[event.data.session_id] ?? [];
          return { ...prev, [event.data.session_id]: [...existing, event.data] };
        });
      }
    });
    return unsub;
  }, []);

  const dispatch = useCallback(async (prompt, settings = {}) => {
    const name = prompt.length > 40 ? prompt.slice(0, 40) + '…' : prompt;
    const session = await backend.entities.AgentSession.create({
      name,
      task: prompt,
      state: 'working',
      pinned: false,
      activity: 'Starting…',
      model: settings.model || 'claude-opus-4-8',
      temperature: settings.temperature ?? 0.7,
      max_tokens: settings.maxTokens || 8192,
      working_dir: settings.workingDir || '~/projects',
      tool_call_count: 0,
      started_at: new Date().toISOString(),
    });
    // Create the initial user message
    await backend.entities.AgentMessage.create({
      session_id: session.id,
      role: 'user',
      content: prompt,
      ts: new Date().toISOString(),
    });
    return session.id;
  }, []);

  const reply = useCallback(async (sessionId, message) => {
    await backend.entities.AgentMessage.create({
      session_id: sessionId,
      role: 'user',
      content: message,
      ts: new Date().toISOString(),
    });
    // Set back to working
    await backend.entities.AgentSession.update(sessionId, {
      state: 'working',
      activity: 'Processing reply…',
    });
  }, []);

  const stop = useCallback(async (sessionId) => {
    await backend.entities.AgentSession.update(sessionId, {
      state: 'stopped',
      activity: 'Stopped by user',
    });
  }, []);

  const resume = useCallback(async (sessionId) => {
    await backend.entities.AgentSession.update(sessionId, {
      state: 'working',
      activity: 'Resuming…',
    });
  }, []);

  const pin = useCallback(async (sessionId) => {
    await backend.entities.AgentSession.update(sessionId, { pinned: true });
  }, []);

  const unpin = useCallback(async (sessionId) => {
    await backend.entities.AgentSession.update(sessionId, { pinned: false });
  }, []);

  const remove = useCallback(async (sessionId) => {
    await backend.entities.AgentSession.delete(sessionId);
  }, []);

  // Merge messages into sessions
  const sessionsWithMessages = sessions.map(s => ({
    ...s,
    messages: messagesMap[s.id] ?? [],
  }));

  return {
    sessions: sessionsWithMessages,
    loading,
    loadMessages,
    dispatch,
    reply,
    stop,
    resume,
    pin,
    unpin,
    remove,
  };
}