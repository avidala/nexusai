import { useState } from 'react';
import { X, FolderOpen, Cpu, Thermometer, Hash, Pin, Layers, Check, FolderSearch, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrowseFolder } from '@/hooks/useBrowseFolder';

// Defaults for newly dispatched sessions. The model list comes from the runner's
// reported environment; the working dir is chosen with the native Browse dialog (or
// typed). Each dispatch can still override model + working dir in the dispatch bar.
export default function SettingsPanel({ settings, environment, onChange, onClose }) {
  const models = environment?.models ?? [];
  const online = environment?.online;
  const [customDir, setCustomDir] = useState(settings.workingDir);
  const { browse, browsing, error: browseErr } = useBrowseFolder();

  const set = (key, value) => onChange({ ...settings, [key]: value });
  const applyCustomDir = () => { if (customDir.trim()) set('workingDir', customDir.trim()); };
  const onBrowse = async () => { const p = await browse(); if (p) { set('workingDir', p); setCustomDir(p); } };

  return (
    <div className="absolute inset-0 z-50 flex items-start justify-end p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[380px] bg-[#131419] border border-white/[0.10] rounded-2xl shadow-2xl flex flex-col overflow-hidden mt-12 mr-1 max-h-[calc(100vh-5rem)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <span className="text-sm font-semibold text-white/80">Dispatch Defaults</span>
            <p className="text-[10px] text-white/25 mt-0.5">
              {environment?.online
                ? `from runner: ${environment.hostname ?? 'online'} · override per session in the dispatch bar`
                : 'no runner online — using built-in defaults'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* Working Directory — Browse (native dialog) or type a path */}
          <Field icon={FolderOpen} label="Default Working Directory" description="Where the agent runs on your machine">
            <div className="mt-2 flex items-center gap-2 bg-white/[0.04] border border-violet-500/30 rounded-lg pl-3 pr-1.5 py-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <input
                value={customDir}
                onChange={e => setCustomDir(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyCustomDir()}
                onBlur={applyCustomDir}
                placeholder="Type a path or Browse…"
                className="flex-1 min-w-0 bg-transparent text-sm text-violet-200 font-mono placeholder:text-white/20 outline-none"
              />
              <button
                onClick={onBrowse}
                disabled={browsing || !online}
                title={online ? 'open Finder on your machine' : 'start the runner to browse'}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 disabled:opacity-30 transition-colors shrink-0"
              >
                {browsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSearch className="w-3 h-3" />}
                {browsing ? '…' : 'Browse'}
              </button>
            </div>
            {browseErr && <p className="text-[10px] text-red-300/80 mt-1 ml-0.5">{browseErr}</p>}
          </Field>

          {/* Default Model */}
          <Field icon={Cpu} label="Default Model" description={environment?.online ? 'available on your machine' : 'built-in list (no runner online)'}>
            <div className="mt-2 space-y-1">
              {models.map(m => {
                const active = settings.model === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => set('model', m.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left',
                      active ? 'bg-violet-500/10 border-violet-500/30' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    )}
                  >
                    <span className={cn('text-sm font-medium flex-1', active ? 'text-violet-200' : 'text-white/55')}>{m.label}</span>
                    {m.note && (
                      <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded', active ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.06] text-white/25')}>{m.note}</span>
                    )}
                    {active && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Temperature */}
          <Field icon={Thermometer} label="Temperature" description={`Creativity / randomness — ${settings.temperature.toFixed(1)}`}>
            <div className="mt-3 px-1">
              <input
                type="range" min="0" max="1" step="0.1"
                value={settings.temperature}
                onChange={e => set('temperature', parseFloat(e.target.value))}
                className="w-full accent-violet-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/20 font-mono mt-1">
                <span>0.0 precise</span><span>1.0 creative</span>
              </div>
            </div>
          </Field>

          {/* Max Tokens */}
          <Field icon={Hash} label="Max Output Tokens" description="Maximum tokens per response">
            <div className="flex items-center gap-2 mt-2">
              {[1024, 4096, 8192, 16000].map(v => (
                <button
                  key={v}
                  onClick={() => set('maxTokens', v)}
                  className={cn('flex-1 py-2 rounded-lg border text-xs font-mono transition-all',
                    settings.maxTokens === v ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-white/[0.02] border-white/[0.06] text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}
                >
                  {v >= 1000 ? `${v / 1000}k` : v}
                </button>
              ))}
            </div>
          </Field>

          {/* Max Concurrent */}
          <Field icon={Layers} label="Max Concurrent Sessions" description="Limit parallel working sessions">
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 4, 8, 16].map(v => (
                <button
                  key={v}
                  onClick={() => set('maxConcurrent', v)}
                  className={cn('flex-1 py-2 rounded-lg border text-xs font-mono transition-all',
                    settings.maxConcurrent === v ? 'bg-violet-500/10 border-violet-500/30 text-violet-300' : 'bg-white/[0.02] border-white/[0.06] text-white/35 hover:text-white/60 hover:bg-white/[0.04]')}
                >
                  {v}
                </button>
              ))}
            </div>
          </Field>

          {/* Auto-pin */}
          <Field icon={Pin} label="Auto-pin on Needs Input" description="Automatically pin sessions that require your attention">
            <button
              onClick={() => set('autoPinOnInput', !settings.autoPinOnInput)}
              className={cn('mt-2 relative w-10 h-5 rounded-full border transition-all',
                settings.autoPinOnInput ? 'bg-violet-500 border-violet-400' : 'bg-white/[0.06] border-white/[0.10]')}
            >
              <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
                settings.autoPinOnInput ? 'left-[22px]' : 'left-0.5')} />
            </button>
          </Field>

        </div>

        <div className="px-5 py-3 border-t border-white/[0.07] text-[10px] text-white/20 font-mono shrink-0">
          Defaults for new sessions · pick per-session in the dispatch bar
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, description, action, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-violet-400/70" />
        <span className="text-xs font-semibold text-white/70">{label}</span>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <p className="text-[11px] text-white/30 ml-5">{description}</p>
      {children}
    </div>
  );
}
