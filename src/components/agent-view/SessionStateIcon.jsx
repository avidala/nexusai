import { cn } from '@/lib/utils';

export default function SessionStateIcon({ state, className }) {
  if (state === 'working') {
    return (
      <span className={cn('relative flex items-center justify-center w-5 h-5', className)}>
        <span className="absolute w-5 h-5 rounded-full border-2 border-emerald-400/30 animate-ping" />
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      </span>
    );
  }
  if (state === 'needs_input') {
    return (
      <span className={cn('flex items-center justify-center w-5 h-5', className)}>
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      </span>
    );
  }
  if (state === 'completed') {
    return (
      <span className={cn('flex items-center justify-center w-5 h-5', className)}>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span className={cn('flex items-center justify-center w-5 h-5', className)}>
        <span className="w-2 h-2 rounded-full bg-red-500" />
      </span>
    );
  }
  if (state === 'stopped') {
    return (
      <span className={cn('flex items-center justify-center w-5 h-5', className)}>
        <span className="w-2 h-2 rounded-full bg-white/20" />
      </span>
    );
  }
  return (
    <span className={cn('flex items-center justify-center w-5 h-5', className)}>
      <span className="w-2 h-2 rounded-full bg-white/20" />
    </span>
  );
}