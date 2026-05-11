import type { ReactElement } from 'react';

export type Tab = 'journal' | 'marks' | 'mind' | 'schedule' | 'stats';

const TABS: { key: Tab; label: string; icon: (active: boolean) => ReactElement }[] = [
  {
    key: 'journal',
    label: 'Journal',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? '#a855f7' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <line x1="8" y1="7" x2="15" y2="7" />
        <line x1="8" y1="11" x2="15" y2="11" />
        <line x1="8" y1="15" x2="13" y2="15" />
      </svg>
    ),
  },
  {
    key: 'marks',
    label: 'Marks',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? '#a855f7' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    key: 'mind',
    label: 'Mind',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? '#a855f7' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="19" r="2" />
        <circle cx="19" cy="19" r="2" />
        <line x1="12" y1="7" x2="5" y2="17" />
        <line x1="12" y1="7" x2="19" y2="17" />
        <line x1="7" y1="19" x2="17" y2="19" />
      </svg>
    ),
  },
  {
    key: 'schedule',
    label: 'Schedule',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? '#a855f7' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    key: 'stats',
    label: 'Stats',
    icon: (a) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={a ? '#a855f7' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="6" y1="20" x2="6" y2="13" />
        <line x1="12" y1="20" x2="12" y2="9" />
        <line x1="18" y1="20" x2="18" y2="5" />
      </svg>
    ),
  },
];

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
}

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-ink-1/90 backdrop-blur-lg border-t border-ink-2"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`flex flex-col items-center gap-1 py-2.5 transition active:scale-90 ${isActive ? 'text-accent' : 'text-ink-4'}`}
            >
              <span className={`flex items-center justify-center transition ${isActive ? 'scale-110' : ''}`}>
                {t.icon(isActive)}
              </span>
              <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
