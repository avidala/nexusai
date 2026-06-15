import { useState, useEffect, useCallback } from 'react';
import AgentHeader from '@/components/agent-view/AgentHeader';
import AgentSidebar from '@/components/agent-view/AgentSidebar';
import AgentSessionList from '@/components/agent-view/AgentSessionList';
import AgentDetailPanel from '@/components/agent-view/AgentDetailPanel';
import DispatchBar from '@/components/agent-view/DispatchBar';
import SettingsPanel from '@/components/agent-view/SettingsPanel';
import { useAgentSessions } from '@/hooks/useAgentSessions';
import { useRunnerEnvironment } from '@/hooks/useRunnerEnvironment';

const DEFAULT_SETTINGS = {
  workingDir: '~/projects',
  model: 'claude-opus-4-8',
  temperature: 0.7,
  maxTokens: 8192,
  maxConcurrent: 4,
  autoPinOnInput: false,
};

export default function AgentView() {
  const { sessions, loading, loadMessages, dispatch, reply, stop, resume, pin, unpin, remove } = useAgentSessions();
  const environment = useRunnerEnvironment();
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // the dispatch bar's live selection (model + working dir for the next dispatch);
  // the header reflects this when no session is selected
  const [dispatchSel, setDispatchSel] = useState({ model: DEFAULT_SETTINGS.model, workingDir: DEFAULT_SETTINGS.workingDir });
  // once a runner reports its real env, adopt its default model + first folder as
  // the defaults — but only until the user changes them (tracked by `touched`).
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched || !environment.online) return;
    setSettings((s) => ({
      ...s,
      model: environment.defaultModel,
      workingDir: environment.folders[0]?.path ?? s.workingDir,
    }));
  }, [environment.online, environment.defaultModel, environment.folders, touched]);

  const updateSettings = useCallback((next) => { setTouched(true); setSettings(next); }, []);

  const selectedSession = sessions.find(s => s.id === selectedId) || null;

  // Auto-select first session that needs input
  useEffect(() => {
    if (!selectedId) {
      const needsInput = sessions.find(s => s.state === 'needs_input');
      if (needsInput) setSelectedId(needsInput.id);
    }
  }, [sessions, selectedId]);

  const handleSelect = useCallback((id) => {
    if (id === selectedId) { setSelectedId(null); return; }
    setSelectedId(id);
    loadMessages(id);
  }, [selectedId, loadMessages]);

  // per-session dispatch: the DispatchBar can override model + working dir for this
  // one session; everything else falls back to the current settings.
  const handleDispatch = useCallback((prompt, overrides = {}) => {
    const id = dispatch(prompt, { ...settings, ...overrides });
    setSelectedId(id);
  }, [dispatch, settings]);

  const filtered = sessions.filter(s => {
    if (filter === 'all') return true;
    if (filter === 'active') return s.state === 'working';
    if (filter === 'needs_input') return s.state === 'needs_input';
    if (filter === 'completed') return s.state === 'completed' || s.state === 'failed' || s.state === 'stopped';
    return true;
  });

  const counts = {
    all: sessions.length,
    active: sessions.filter(s => s.state === 'working').length,
    needs_input: sessions.filter(s => s.state === 'needs_input').length,
    completed: sessions.filter(s => ['completed','failed','stopped'].includes(s.state)).length,
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0b0e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen bg-[#0a0b0e] text-white overflow-hidden">
      <AgentHeader
        sessions={sessions}
        model={dispatchSel.model || settings.model}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          environment={environment}
          onChange={updateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      <div className="flex flex-1 min-h-0">
        <AgentSidebar
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(v => !v)}
          filter={filter}
          onFilter={setFilter}
          counts={counts}
        />
        <div className="flex flex-1 min-w-0 flex-col">
          <div className="flex flex-1 min-h-0">
            <AgentSessionList
              sessions={filtered}
              selectedId={selectedId}
              onSelect={handleSelect}
              onPin={pin}
              onUnpin={unpin}
              onStop={stop}
              onRemove={remove}
              hasDetail={!!selectedSession}
            />
            {selectedSession && (
              <AgentDetailPanel
                session={selectedSession}
                onReply={(msg) => reply(selectedSession.id, msg)}
                onClose={() => setSelectedId(null)}
                onStop={() => stop(selectedSession.id)}
                onResume={() => resume(selectedSession.id)}
              />
            )}
          </div>
          <DispatchBar
            onDispatch={handleDispatch}
            environment={environment}
            defaults={{ model: settings.model, workingDir: settings.workingDir }}
            onChange={setDispatchSel}
          />
        </div>
      </div>
    </div>
  );
}