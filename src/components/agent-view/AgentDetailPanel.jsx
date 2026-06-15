import { useState, useRef, useEffect } from 'react';
import { X, Square, Play, Wrench, MessageCircle, User, Bot, AlertCircle, GitBranch, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SessionStateIcon from './SessionStateIcon';
import FileDiffViewer from './FileDiffViewer';
import { formatDistanceToNow } from 'date-fns';

function MessageItem({ msg }) {
  const time = msg.ts ? formatDistanceToNow(new Date(msg.ts), { addSuffix: true }) : '';

  if (msg.role === 'tool') {
    return (
      <div className="flex items-start gap-2 py-1.5">
        <Wrench className="w-3 h-3 text-white/20 mt-0.5 shrink-0" />
        <span className="text-xs text-white/25 font-mono leading-relaxed">{msg.content}</span>
      </div>
    );
  }
  if (msg.role === 'question') {
    return (
      <div className="my-3 p-3.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
        <div className="flex items-center gap-1.5 mb-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Needs Input</span>
        </div>
        <p className="text-sm text-amber-100/80 leading-relaxed">{msg.content}</p>
      </div>
    );
  }
  if (msg.role === 'user') {
    return (
      <div className="flex items-start gap-2.5 py-2 justify-end">
        <div className="max-w-[85%] bg-violet-500/10 border border-violet-500/20 rounded-xl px-3.5 py-2.5">
          <p className="text-sm text-violet-100 leading-relaxed">{msg.content}</p>
        </div>
        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3 h-3 text-violet-400" />
        </div>
      </div>
    );
  }
  // assistant
  return (
    <div className="flex items-start gap-2.5 py-2">
      <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3 h-3 text-white/40" />
      </div>
      <div className="max-w-[85%]">
        <p className="text-sm text-white/70 leading-relaxed">{msg.content}</p>
        <span className="text-[10px] text-white/20 mt-1 block">{time}</span>
      </div>
    </div>
  );
}

export default function AgentDetailPanel({ session, onReply, onClose, onStop, onResume }) {
  const [input, setInput] = useState('');
  const [tab, setTab] = useState('messages');
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileCount = session.changedFiles?.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  const handleSend = () => {
    const v = input.trim();
    if (!v) return;
    if (session.state === 'stopped') onResume();
    onReply(v);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // a session is a continuing conversation — you can always send another message,
  // including after a turn finished ('completed') or errored ('failed'); replying
  // resumes the same agent session.
  const canReply = session.state !== undefined;

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0d0e12]',
        expanded
          ? 'fixed inset-0 z-50'
          : 'w-[clamp(480px,42vw,720px)] shrink-0 border-l border-white/[0.06]'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] shrink-0">
        <SessionStateIcon state={session.state} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate">{session.name}</div>
          <div className="text-[10px] text-white/30 font-mono mt-0.5 truncate">{session.activity}</div>
        </div>
        <div className="flex items-center gap-1">
          {(session.state === 'working' || session.state === 'needs_input') && (
            <button
              onClick={onStop}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400 transition-colors"
              title="Stop session"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}
          {session.state === 'stopped' && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors text-xs font-medium"
              title="Resume session"
            >
              <Play className="w-3 h-3" />
              Resume
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors"
            title={expanded ? 'Collapse' : 'Expand to full screen'}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/25 hover:text-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-white/[0.04] bg-white/[0.01] shrink-0 overflow-x-auto">
        <span className="text-[10px] text-white/20 font-mono shrink-0">{session.toolCallCount} tool calls</span>
        <span className="text-[10px] text-white/20 font-mono shrink-0">{session.model}</span>
        {session.temperature != null && (
          <span className="text-[10px] text-white/20 font-mono shrink-0">t={session.temperature.toFixed(1)}</span>
        )}
        {session.maxTokens && (
          <span className="text-[10px] text-white/20 font-mono shrink-0">{session.maxTokens / 1000}k tokens</span>
        )}
        {session.workingDir && (
          <span className="text-[10px] text-violet-400/40 font-mono shrink-0 truncate">{session.workingDir}</span>
        )}
        <span className="text-[10px] text-white/20 font-mono shrink-0 ml-auto">{session.elapsed}</span>
      </div>

      {/* Task description */}
      <div className="px-4 py-3 border-b border-white/[0.04] bg-white/[0.01] shrink-0">
        <div className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1.5">Task</div>
        <p className="text-xs text-white/50 leading-relaxed">{session.task}</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06] shrink-0 bg-black/10">
        <button
          onClick={() => setTab('messages')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
            tab === 'messages'
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-white/30 hover:text-white/60'
          )}
        >
          <MessageCircle className="w-3 h-3" />
          Messages
        </button>
        <button
          onClick={() => setTab('files')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
            tab === 'files'
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-white/30 hover:text-white/60'
          )}
        >
          <GitBranch className="w-3 h-3" />
          Files
          {fileCount > 0 && (
            <span className={cn(
              'text-[9px] px-1.5 py-0.5 rounded-full font-semibold',
              tab === 'files' ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.08] text-white/30'
            )}>
              {fileCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === 'messages' ? (
        <div className="flex-1 overflow-y-auto px-4 py-2">
          <div className="flex flex-col">
            {session.messages.map((msg, i) => (
              <MessageItem key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      ) : (
        <FileDiffViewer changedFiles={session.changedFiles ?? []} />
      )}

      {/* Reply input — messages tab only */}
      <div className={cn(
        'shrink-0 px-4 py-3 border-t border-white/[0.06]',
        !canReply && 'opacity-40 pointer-events-none',
        tab === 'files' && 'hidden'
      )}>
        {session.state === 'needs_input' && (
          <div className="flex items-center gap-1.5 mb-2">
            <MessageCircle className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">Reply to unblock session</span>
          </div>
        )}
        {session.state === 'stopped' && (
          <div className="flex items-center gap-1.5 mb-2">
            <Play className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">Send a message to resume</span>
          </div>
        )}
        <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1.5 focus-within:border-violet-500/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={session.state === 'needs_input' ? 'Type your reply...' : 'Send a message...'}
            rows={2}
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 resize-none outline-none px-2 py-1 leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-medium transition-colors shrink-0"
          >
            Send
          </button>
        </div>
        <div className="mt-1.5 text-[10px] text-white/15">↵ Enter to send · Shift+↵ newline</div>
      </div>
    </div>
  );
}