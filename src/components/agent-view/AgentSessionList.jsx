import SessionRow from './SessionRow';
import { Inbox } from 'lucide-react';

const GROUP_ORDER = ['pinned', 'needs_input', 'working', 'completed', 'failed', 'stopped'];
const GROUP_LABELS = {
  pinned: 'Pinned',
  needs_input: 'Needs Input',
  working: 'Working',
  completed: 'Completed',
  failed: 'Failed',
  stopped: 'Stopped',
};

export default function AgentSessionList({ sessions, selectedId, onSelect, onPin, onUnpin, onStop, onRemove, hasDetail }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-white/20 p-8">
        <Inbox className="w-8 h-8" />
        <p className="text-sm">No sessions here. Dispatch one below.</p>
      </div>
    );
  }

  // Group sessions
  const groups = {};
  for (const s of sessions) {
    const key = s.pinned ? 'pinned' : s.state;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }

  return (
    <div className="flex-1 overflow-y-auto min-w-0" style={{ minWidth: hasDetail ? '300px' : undefined }}>
      {GROUP_ORDER.filter(g => groups[g]?.length).map(group => (
        <div key={group}>
          <div className="sticky top-0 z-10 px-4 py-2 bg-[#0a0b0e]/90 backdrop-blur-sm border-b border-white/[0.04]">
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">
              {GROUP_LABELS[group]}
              <span className="ml-2 text-white/15">{groups[group].length}</span>
            </span>
          </div>
          {groups[group].map(session => (
            <SessionRow
              key={session.id}
              session={session}
              selected={session.id === selectedId}
              onSelect={onSelect}
              onPin={onPin}
              onUnpin={onUnpin}
              onStop={onStop}
              onRemove={onRemove}
            />
          ))}
        </div>
      ))}
    </div>
  );
}