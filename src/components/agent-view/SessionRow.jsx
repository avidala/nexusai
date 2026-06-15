import { cn } from '@/lib/utils';
import SessionStateIcon from './SessionStateIcon';
import LiveIndicator from './LiveIndicator';
import { Pin, PinOff, Square, Trash2, GitPullRequest } from 'lucide-react';

const STATE_LABELS = {
  working: { label: 'Working', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  needs_input: { label: 'Needs input', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  completed: { label: 'Completed', color: 'text-white/40 bg-white/[0.04] border-white/[0.08]' },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  stopped: { label: 'Stopped', color: 'text-white/20 bg-white/[0.02] border-white/[0.05]' },
};

export default function SessionRow({ session, selected, onSelect, onPin, onUnpin, onStop, onRemove }) {
  const { id, name, state, activity, elapsed, pinned, pr, toolCallCount, model } = session;
  const stateConfig = STATE_LABELS[state] || STATE_LABELS.stopped;

  return (
    <div
      onClick={() => onSelect(id)}
      className={cn(
        'group relative flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150 border-b border-white/[0.04]',
        selected
          ? 'bg-violet-500/[0.07] border-l-2 border-l-violet-500/60'
          : 'hover:bg-white/[0.03] border-l-2 border-l-transparent'
      )}
    >
      <SessionStateIcon state={state} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {pinned && <Pin className="w-2.5 h-2.5 text-violet-400 shrink-0" />}
          <span className={cn(
            'text-sm font-medium truncate',
            state === 'stopped' ? 'text-white/30' : 'text-white/90'
          )}>
            {name}
          </span>
          {pr && (
            <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full shrink-0">
              <GitPullRequest className="w-2.5 h-2.5" />
              PR #{pr}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0',
            stateConfig.color
          )}>
            {stateConfig.label}
          </span>
          <span className="text-xs text-white/30 truncate font-mono flex items-center">
            {activity}
            <LiveIndicator active={state === 'working'} />
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-white/20 font-mono">{elapsed}</div>
          <div className="text-[10px] text-white/15">{toolCallCount} calls</div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {state === 'working' || state === 'needs_input' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onStop(id); }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
              title="Stop"
            >
              <Square className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(id); }}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); pinned ? onUnpin(id) : onPin(id); }}
            className="p-1.5 rounded-md hover:bg-violet-500/10 text-white/20 hover:text-violet-400 transition-colors"
            title={pinned ? 'Unpin' : 'Pin'}
          >
            {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  );
}