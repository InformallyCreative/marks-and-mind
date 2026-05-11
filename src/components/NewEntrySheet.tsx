import { type ReactNode } from 'react';

export type EntryMode = 'record' | 'chat' | 'type';

interface Props {
  onPick: (mode: EntryMode) => void;
  onClose: () => void;
}

export function NewEntrySheet({ onPick, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end justify-center animate-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-ink-1 border-t border-ink-2 rounded-t-3xl p-5 space-y-3 animate-slide-up"
        style={{ paddingBottom: `calc(1.5rem + var(--safe-bottom))` }}
      >
        <div className="flex justify-between items-center pb-1">
          <h2 className="text-base font-semibold">New entry</h2>
          <button
            onClick={onClose}
            className="text-ink-4 hover:text-white text-sm px-2 py-1 -mr-2"
          >
            Cancel
          </button>
        </div>

        <ModeCard
          accent
          onTap={() => onPick('record')}
          icon={<MicIcon className="w-6 h-6" />}
          title="Record"
          subtitle="Talk into the mic, the system saves the audio and the transcript."
        />
        <ModeCard
          onTap={() => onPick('chat')}
          icon={<ChatIcon className="w-6 h-6" />}
          title="Talk it through"
          subtitle="Back-and-forth chat with Claude. Sort the whole convo when you're done."
        />
        <ModeCard
          onTap={() => onPick('type')}
          icon={<PencilIcon className="w-6 h-6" />}
          title="Type or paste"
          subtitle="Write thoughts, dictate with the iOS mic key, or paste a chat from another AI."
        />
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  onTap,
  accent = false,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onTap: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onTap}
      className={`group w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition active:scale-[0.985] ${
        accent
          ? 'bg-accent/10 border-accent/40 hover:bg-accent/15'
          : 'bg-ink-2 border-ink-3 hover:bg-ink-2/80'
      }`}
    >
      <div
        className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
          accent ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-ink-3 text-white'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[12px] text-ink-4 leading-snug mt-0.5">{subtitle}</div>
      </div>
      <div className="text-ink-4 self-center pr-0.5">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

function MicIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function ChatIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
