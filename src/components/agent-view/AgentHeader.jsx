import { Cpu, Zap, AlertCircle, Settings2 } from 'lucide-react';

export default function AgentHeader({ sessions, model, onOpenSettings }) {
  const working = sessions.filter(s => s.state === 'working').length;
  const needsInput = sessions.filter(s => s.state === 'needs_input').length;
  const completed = sessions.filter(s => s.state === 'completed').length;

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-[#0d0e12]/80 backdrop-blur-sm z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Cpu className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-sm text-white tracking-tight">Claude Agents</span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <span className="text-xs text-white/30 font-mono">NexusAI</span>
      </div>

      <div className="flex items-center gap-4">
        {needsInput > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-amber-400 font-medium">{needsInput} need input</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{working} active</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span>{completed} done</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span>{sessions.length} total</span>
          </span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
          <Zap className="w-3 h-3 text-violet-400" />
          <span className="text-xs text-white/50 font-mono">{model || 'no model'}</span>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors"
          title="Session settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}