import { LayoutGrid, Zap, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const filters = [
  { id: 'all', label: 'All Sessions', icon: LayoutGrid },
  { id: 'active', label: 'Working', icon: Zap },
  { id: 'needs_input', label: 'Needs Input', icon: AlertTriangle },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

export default function AgentSidebar({ open, onToggle, filter, onFilter, counts }) {
  return (
    <aside className={cn(
      'flex flex-col shrink-0 border-r border-white/[0.06] bg-[#0d0e12] transition-all duration-200',
      open ? 'w-48' : 'w-12'
    )}>
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
        {open && <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Filter</span>}
        <button
          onClick={onToggle}
          className="ml-auto p-1 rounded hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
        >
          {open ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2 flex-1">
        {filters.map(({ id, label, icon: Icon }) => {
          const count = counts[id] ?? 0;
          const isActive = filter === id;
          return (
            <button
              key={id}
              onClick={() => onFilter(id)}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group',
                isActive
                  ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-transparent'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-violet-400' : 'text-white/30 group-hover:text-white/50')} />
              {open && (
                <>
                  <span className="text-xs font-medium flex-1 truncate">{label}</span>
                  {count > 0 && (
                    <span className={cn(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded-full',
                      isActive ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.06] text-white/30',
                      id === 'needs_input' && count > 0 && !isActive && 'bg-amber-500/10 text-amber-400'
                    )}>
                      {count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {open && (
        <div className="p-3 border-t border-white/[0.06]">
          <div className="text-[10px] text-white/20 font-mono leading-relaxed">
            <div>↑↓ navigate</div>
            <div>Space peek</div>
            <div>Enter attach</div>
            <div>Esc close</div>
          </div>
        </div>
      )}
    </aside>
  );
}