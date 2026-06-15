import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Cpu, FolderOpen, Check, ChevronDown, FolderSearch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrowseFolder } from '@/hooks/useBrowseFolder';

const SUGGESTIONS = [
  'Fix all TypeScript errors in src/',
  'Write unit tests for the auth module',
  'Refactor the API client to use async/await',
  'Review and improve error handling',
  'Update dependencies to latest versions',
  'Add JSDoc comments to all public functions',
];

const modelLabel = (models, id) => models.find((m) => m.id === id)?.label ?? id;

export default function DispatchBar({ onDispatch, environment, defaults }) {
  const models = environment?.models ?? [];
  const online = environment?.online;

  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [model, setModel] = useState(defaults?.model);
  const [workingDir, setWorkingDir] = useState(defaults?.workingDir);
  const [menu, setMenu] = useState(false); // model dropdown
  const inputRef = useRef(null);
  const { browse, browsing, error: browseErr } = useBrowseFolder();

  useEffect(() => { if (defaults?.model) setModel(defaults.model); }, [defaults?.model]);
  useEffect(() => { if (defaults?.workingDir) setWorkingDir(defaults.workingDir); }, [defaults?.workingDir]);

  const onBrowse = async () => { const p = await browse(); if (p) setWorkingDir(p); };

  const handleSubmit = () => {
    const v = value.trim();
    if (!v) return;
    onDispatch(v, { model, workingDir }); // per-session overrides
    setValue('');
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') { setValue(''); setShowSuggestions(false); inputRef.current?.blur(); }
  };

  return (
    <div className="relative shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#0d0e12]">
      {showSuggestions && !value && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#131419] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
          <div className="px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Suggestions</span>
          </div>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onMouseDown={() => { onDispatch(s, { model, workingDir }); setShowSuggestions(false); setValue(''); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors group"
            >
              <Sparkles className="w-3 h-3 text-violet-400/60 shrink-0" />
              <span className="text-sm text-white/50 group-hover:text-white/70">{s}</span>
            </button>
          ))}
        </div>
      )}

      {/* line above the prompt: working folder · model · Browse · runner status */}
      <div className="flex items-center gap-2 mb-2">
        {/* current working folder — full path on hover */}
        <div
          className="flex items-center gap-1.5 min-w-0 px-2.5 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-white/55"
          title={workingDir}
        >
          <FolderOpen className="w-3 h-3 shrink-0 text-violet-400/70" />
          <span className="truncate font-mono max-w-[280px]">{workingDir || 'no folder selected'}</span>
        </div>

        {/* Browse — opens native Finder via the runner */}
        <button
          onClick={onBrowse}
          disabled={browsing || !online}
          title={online ? 'open Finder on your machine' : 'start the runner to browse'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] text-xs text-white/55 hover:text-white/85 disabled:opacity-30 transition-colors shrink-0"
        >
          {browsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSearch className="w-3 h-3" />}
          {browsing ? 'Opening Finder…' : 'Browse…'}
        </button>

        {/* model */}
        <div className="relative shrink-0">
          <button
            onClick={() => setMenu((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors max-w-[200px]',
              menu ? 'border-violet-500/40 bg-violet-500/10 text-violet-200' : 'border-white/[0.07] bg-white/[0.03] text-white/50 hover:text-white/80'
            )}
          >
            <Cpu className="w-3 h-3 shrink-0" />
            <span className="truncate">{modelLabel(models, model) || 'model'}</span>
            <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform', menu && 'rotate-180')} />
          </button>
          {menu && (
            <div className="absolute bottom-full mb-2 left-0 z-50 w-[260px] max-h-[260px] overflow-y-auto bg-[#131419] border border-white/[0.10] rounded-xl shadow-2xl p-1">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); setMenu(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs transition-colors',
                    m.id === model ? 'bg-violet-500/10 text-violet-200' : 'text-white/55 hover:text-white/85 hover:bg-white/[0.04]'
                  )}
                >
                  <span className="truncate">{m.label}</span>
                  {m.note && <span className="ml-auto text-[9px] text-white/30">{m.note}</span>}
                  {m.id === model && <Check className="w-3 h-3 shrink-0 text-violet-400 ml-1" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {environment && (
          <span className="ml-auto text-[10px] text-white/20 flex items-center gap-1 shrink-0">
            <span className={cn('w-1.5 h-1.5 rounded-full', online ? 'bg-emerald-400' : 'bg-white/20')} />
            {online ? `runner: ${environment.hostname ?? 'online'}` : 'no runner'}
          </span>
        )}
      </div>

      {browseErr && <div className="mb-2 text-[11px] text-red-300/80">{browseErr}</div>}

      <div className={cn(
        'flex items-center gap-3 bg-white/[0.04] border rounded-xl px-4 py-2.5 transition-all duration-200',
        focused ? 'border-violet-500/40 bg-white/[0.05]' : 'border-white/[0.07]'
      )}>
        <Sparkles className={cn('w-4 h-4 shrink-0 transition-colors', focused ? 'text-violet-400' : 'text-white/20')} />
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { setFocused(true); setShowSuggestions(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150); }}
          placeholder="Dispatch a new agent session…"
          className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none"
        />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-white/15 hidden sm:block">↵ dispatch</span>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="p-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-20 disabled:pointer-events-none text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
