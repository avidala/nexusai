import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FileCode, FilePlus, FileX, ChevronRight, GitBranch } from 'lucide-react';

function diffLines(before, after) {
  // Simple line-by-line diff
  const beforeLines = before ? before.split('\n') : [];
  const afterLines = after ? after.split('\n') : [];
  const maxLen = Math.max(beforeLines.length, afterLines.length);
  const rows = [];

  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === undefined) {
      rows.push({ type: 'added', before: null, after: a, lineAfter: i + 1, lineBefore: null });
    } else if (a === undefined) {
      rows.push({ type: 'removed', before: b, after: null, lineBefore: i + 1, lineAfter: null });
    } else if (b !== a) {
      rows.push({ type: 'changed', before: b, after: a, lineBefore: i + 1, lineAfter: i + 1 });
    } else {
      rows.push({ type: 'same', before: b, after: a, lineBefore: i + 1, lineAfter: i + 1 });
    }
  }
  return rows;
}

function DiffRow({ row }) {
  const base = 'flex text-xs font-mono leading-5 min-w-0';
  if (row.type === 'same') {
    return (
      <div className={cn(base, 'text-white/30')}>
        <div className="w-8 shrink-0 text-right pr-3 text-white/15 select-none border-r border-white/[0.05]">{row.lineBefore}</div>
        <div className="flex-1 px-3 whitespace-pre overflow-hidden text-ellipsis">{row.before}</div>
        <div className="w-8 shrink-0 text-right pr-3 text-white/15 select-none border-l border-r border-white/[0.05]">{row.lineAfter}</div>
        <div className="flex-1 px-3 whitespace-pre overflow-hidden text-ellipsis">{row.after}</div>
      </div>
    );
  }
  if (row.type === 'removed') {
    return (
      <div className={cn(base, 'bg-red-500/[0.07]')}>
        <div className="w-8 shrink-0 text-right pr-3 text-red-400/50 select-none border-r border-red-500/10">{row.lineBefore}</div>
        <div className="flex-1 px-3 text-red-300/70 whitespace-pre overflow-hidden text-ellipsis">
          <span className="text-red-400/50 mr-1">-</span>{row.before}
        </div>
        <div className="w-8 shrink-0 border-l border-r border-white/[0.05] bg-black/20" />
        <div className="flex-1 bg-black/10" />
      </div>
    );
  }
  if (row.type === 'added') {
    return (
      <div className={cn(base, 'bg-emerald-500/[0.07]')}>
        <div className="w-8 shrink-0 border-r border-white/[0.05] bg-black/10" />
        <div className="flex-1 bg-black/10" />
        <div className="w-8 shrink-0 text-right pr-3 text-emerald-400/50 select-none border-l border-r border-emerald-500/10">{row.lineAfter}</div>
        <div className="flex-1 px-3 text-emerald-300/70 whitespace-pre overflow-hidden text-ellipsis">
          <span className="text-emerald-400/50 mr-1">+</span>{row.after}
        </div>
      </div>
    );
  }
  // changed
  return (
    <>
      <div className={cn(base, 'bg-red-500/[0.07]')}>
        <div className="w-8 shrink-0 text-right pr-3 text-red-400/50 select-none border-r border-red-500/10">{row.lineBefore}</div>
        <div className="flex-1 px-3 text-red-300/70 whitespace-pre overflow-hidden text-ellipsis">
          <span className="text-red-400/50 mr-1">-</span>{row.before}
        </div>
        <div className="w-8 shrink-0 border-l border-r border-white/[0.05]" />
        <div className="flex-1" />
      </div>
      <div className={cn(base, 'bg-emerald-500/[0.07]')}>
        <div className="w-8 shrink-0 border-r border-white/[0.05]" />
        <div className="flex-1" />
        <div className="w-8 shrink-0 text-right pr-3 text-emerald-400/50 select-none border-l border-r border-emerald-500/10">{row.lineAfter}</div>
        <div className="flex-1 px-3 text-emerald-300/70 whitespace-pre overflow-hidden text-ellipsis">
          <span className="text-emerald-400/50 mr-1">+</span>{row.after}
        </div>
      </div>
    </>
  );
}

function FileEntry({ file, selected, onClick }) {
  const icon = file.status === 'added'
    ? <FilePlus className="w-3 h-3 text-emerald-400" />
    : file.status === 'deleted'
    ? <FileX className="w-3 h-3 text-red-400" />
    : <FileCode className="w-3 h-3 text-amber-400" />;

  const badge = file.status === 'added'
    ? 'text-emerald-400 bg-emerald-500/10'
    : file.status === 'deleted'
    ? 'text-red-400 bg-red-500/10'
    : 'text-amber-400 bg-amber-500/10';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
        selected ? 'bg-violet-500/10 border-l-2 border-violet-500' : 'border-l-2 border-transparent hover:bg-white/[0.03]'
      )}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-mono text-white/60 truncate">{file.path}</div>
      </div>
      <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0', badge)}>
        {file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : 'M'}
      </span>
      {file.additions !== undefined && (
        <span className="text-[9px] font-mono text-emerald-400/60 shrink-0">+{file.additions}</span>
      )}
      {file.deletions !== undefined && (
        <span className="text-[9px] font-mono text-red-400/60 shrink-0 ml-0.5">-{file.deletions}</span>
      )}
    </button>
  );
}

export default function FileDiffViewer({ changedFiles = [] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (changedFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-white/20">
        <GitBranch className="w-8 h-8" />
        <span className="text-xs">No file changes yet</span>
      </div>
    );
  }

  const file = changedFiles[selectedIdx];
  const rows = file ? diffLines(file.before, file.after) : [];
  const addCount = rows.filter(r => r.type === 'added' || r.type === 'changed').length;
  const delCount = rows.filter(r => r.type === 'removed' || r.type === 'changed').length;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* File tree sidebar */}
      <div className="w-[160px] shrink-0 border-r border-white/[0.06] overflow-y-auto bg-black/10">
        <div className="px-3 py-2 border-b border-white/[0.05]">
          <span className="text-[9px] font-semibold text-white/20 uppercase tracking-widest">
            {changedFiles.length} file{changedFiles.length !== 1 ? 's' : ''} changed
          </span>
        </div>
        {changedFiles.map((f, i) => (
          <FileEntry key={i} file={f} selected={i === selectedIdx} onClick={() => setSelectedIdx(i)} />
        ))}
      </div>

      {/* Diff panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Diff header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] bg-black/10 shrink-0">
          <ChevronRight className="w-3 h-3 text-white/20" />
          <span className="text-[11px] font-mono text-white/40 truncate flex-1">{file?.path}</span>
          <span className="text-[9px] font-mono text-emerald-400/60 shrink-0">+{addCount}</span>
          <span className="text-[9px] font-mono text-red-400/60 shrink-0">-{delCount}</span>
        </div>

        {/* Column headers */}
        <div className="flex border-b border-white/[0.05] bg-[#0a0b0e] shrink-0">
          <div className="flex flex-1 items-center px-4 py-1.5">
            <span className="text-[9px] text-white/15 font-mono uppercase tracking-widest">before</span>
          </div>
          <div className="w-px bg-white/[0.05]" />
          <div className="flex flex-1 items-center px-4 py-1.5">
            <span className="text-[9px] text-white/15 font-mono uppercase tracking-widest">after</span>
          </div>
        </div>

        {/* Diff rows */}
        <div className="flex-1 overflow-y-auto overflow-x-auto bg-[#0a0b0e]">
          <div className="min-w-0">
            {rows.map((row, i) => (
              <DiffRow key={i} row={row} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}