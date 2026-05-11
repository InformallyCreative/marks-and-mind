import { useEffect, useState } from 'react';
import {
  getAnthropicKey,
  getOpenAIKey,
  setAnthropicKey,
  setOpenAIKey,
} from '../utils/settings';

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const [anthropic, setAnthropic] = useState('');
  const [openai, setOpenai] = useState('');
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAnthropic(getAnthropicKey());
    setOpenai(getOpenAIKey());
  }, []);

  function save() {
    setAnthropicKey(anthropic);
    setOpenAIKey(openai);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function clearAll() {
    if (!confirm('Clear both API keys from this device?')) return;
    setAnthropic('');
    setOpenai('');
    setAnthropicKey('');
    setOpenAIKey('');
  }

  const anthropicLooksOk = anthropic.startsWith('sk-ant-') && anthropic.length > 30;
  const openaiLooksOk = !openai || (openai.startsWith('sk-') && openai.length > 30);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-0 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-md mx-auto px-4"
        style={{
          paddingTop: `calc(1rem + var(--safe-top))`,
          paddingBottom: `calc(2rem + var(--safe-bottom))`,
        }}
      >
        <header className="flex items-center justify-between py-3">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="text-ink-4 text-sm">
            Done
          </button>
        </header>

        <section className="bg-ink-1 border border-ink-2 rounded-xl p-4 space-y-4">
          <div>
            <p className="text-xs text-ink-4 mb-3 leading-relaxed">
              Your API keys live on this device only (browser localStorage).
              They're never sent anywhere except directly to OpenAI / Anthropic
              when you record an entry. Required for AI features; the rest of
              the app works without them.
            </p>
          </div>

          <KeyField
            label="Anthropic API key"
            placeholder="sk-ant-..."
            value={anthropic}
            onChange={setAnthropic}
            visible={showAnthropic}
            onToggleVisible={() => setShowAnthropic((x) => !x)}
            help="Required for AI sorting (proposed marks/nodes/schedule). Get one at console.anthropic.com."
            valid={!anthropic || anthropicLooksOk}
          />

          <KeyField
            label="OpenAI API key (optional)"
            placeholder="sk-..."
            value={openai}
            onChange={setOpenai}
            visible={showOpenai}
            onToggleVisible={() => setShowOpenai((x) => !x)}
            help="Optional. Used for Whisper voice transcription. Without it you can still type or use the iOS dictation key in the transcript box."
            valid={openaiLooksOk}
          />

          <div className="flex gap-2 pt-2">
            <button
              onClick={clearAll}
              className="flex-1 bg-ink-2 text-ink-4 rounded-xl py-3 text-sm"
            >
              Clear
            </button>
            <button
              onClick={save}
              className="flex-[2] bg-accent rounded-xl py-3 text-sm font-semibold"
            >
              {saved ? 'Saved ✓' : 'Save keys'}
            </button>
          </div>
        </section>

        <section className="mt-4 text-[11px] text-ink-4 leading-relaxed px-2">
          <p>
            Tip: tokens are billed to your own OpenAI / Anthropic account. A
            typical entry is &lt; $0.01 worth of Claude tokens.
          </p>
        </section>
      </div>
    </div>
  );
}

function KeyField({
  label,
  placeholder,
  value,
  onChange,
  visible,
  onToggleVisible,
  help,
  valid,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (s: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  help: string;
  valid: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs uppercase tracking-wide text-ink-4">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={`w-full bg-ink-2 border rounded-lg p-2.5 pr-16 text-sm font-mono ${valid ? 'border-ink-3' : 'border-bad/60'}`}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-ink-4 px-2 py-1 rounded bg-ink-3"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <p className="text-[11px] text-ink-4 leading-snug">{help}</p>
    </div>
  );
}
