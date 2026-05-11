import { useEffect, useState } from 'react';
import { BottomNav, type Tab } from './components/BottomNav';
import { ChatComposer } from './components/ChatComposer';
import { NewEntrySheet, type EntryMode } from './components/NewEntrySheet';
import { Recorder } from './components/Recorder';
import { ReviewPane } from './components/ReviewPane';
import { SettingsPanel } from './components/SettingsPanel';
import { TypeEntry } from './components/TypeEntry';
import { JournalView } from './views/Journal/JournalView';
import { MarksView } from './views/Marks/MarksView';
import { MindView } from './views/Mind/MindView';
import { ScheduleView } from './views/Schedule/ScheduleView';
import { StatsView } from './views/Stats/StatsView';
import type { Entry, ExtractionResult } from './types';

export default function App() {
  const [tab, setTab] = useState<Tab>('journal');
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [recordingOpen, setRecordingOpen] = useState(false);
  const [typingOpen, setTypingOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingReview, setPendingReview] = useState<{
    entry: Entry;
    extraction: ExtractionResult;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function pickEntryMode(mode: EntryMode) {
    setNewEntryOpen(false);
    if (mode === 'record') setRecordingOpen(true);
    else if (mode === 'chat') setChatOpen(true);
    else setTypingOpen(true);
  }

  // Sync the document title for the iOS PWA chrome.
  useEffect(() => {
    document.title = 'Marks & Mind';
  }, []);

  const bumpReload = () => setReloadKey((k) => k + 1);

  return (
    <div
      className="min-h-screen w-screen flex flex-col bg-ink-0 text-white"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <header className="px-4 py-3 flex items-center justify-between border-b border-ink-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Marks &amp; Mind</h1>
          <span className="text-xs text-ink-4">{tabLabel(tab)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="Settings"
            onClick={() => setSettingsOpen(true)}
            className="rounded-full w-9 h-9 flex items-center justify-center bg-ink-2 text-ink-4 active:scale-90 transition"
          >
            <GearIcon className="w-5 h-5" />
          </button>
          <button
            aria-label="New entry"
            onClick={() => setNewEntryOpen(true)}
            className="rounded-full bg-accent text-white h-9 px-3.5 flex items-center gap-1.5 font-medium text-sm shadow-lg shadow-accent/30 active:scale-95 transition"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'journal' && <JournalView key={reloadKey} />}
        {tab === 'marks' && <MarksView key={reloadKey} onChange={bumpReload} />}
        {tab === 'mind' && <MindView key={reloadKey} onChange={bumpReload} />}
        {tab === 'schedule' && (
          <ScheduleView key={reloadKey} onChange={bumpReload} />
        )}
        {tab === 'stats' && <StatsView key={reloadKey} />}
      </main>

      <BottomNav active={tab} onChange={setTab} />

      {recordingOpen && (
        <Recorder
          onClose={() => setRecordingOpen(false)}
          onComplete={(entry, extraction) => {
            setRecordingOpen(false);
            setPendingReview({ entry, extraction });
          }}
        />
      )}

      {typingOpen && (
        <TypeEntry
          onClose={() => setTypingOpen(false)}
          onComplete={(entry, extraction) => {
            setTypingOpen(false);
            setPendingReview({ entry, extraction });
          }}
        />
      )}

      {chatOpen && (
        <ChatComposer
          onClose={() => setChatOpen(false)}
          onComplete={(entry, extraction) => {
            setChatOpen(false);
            setPendingReview({ entry, extraction });
          }}
        />
      )}

      {pendingReview && (
        <ReviewPane
          entry={pendingReview.entry}
          extraction={pendingReview.extraction}
          onClose={() => {
            setPendingReview(null);
            bumpReload();
          }}
        />
      )}

      {newEntryOpen && (
        <NewEntrySheet
          onPick={pickEntryMode}
          onClose={() => setNewEntryOpen(false)}
        />
      )}

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GearIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function tabLabel(tab: Tab): string {
  switch (tab) {
    case 'journal':
      return 'Journal';
    case 'marks':
      return 'Marks';
    case 'mind':
      return 'Mind';
    case 'schedule':
      return 'Schedule';
    case 'stats':
      return 'Stats';
  }
}

