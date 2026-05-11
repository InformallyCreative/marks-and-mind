// Per-device runtime settings. Stored in localStorage so the same code can be
// served from a public URL while each user keeps their own API key on their
// own phone (never in the bundle).

const KEY_OPENAI = 'mm.openai_key';
const KEY_ANTHROPIC = 'mm.anthropic_key';
const KEY_LANGUAGE = 'mm.language';

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* localStorage disabled — settings won't persist */
  }
}

export function getOpenAIKey(): string {
  const env = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? '';
  if (env && env !== 'none' && !/^sk-\.\.\.$/.test(env)) return env;
  return read(KEY_OPENAI);
}

export function getAnthropicKey(): string {
  const env = (import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined) ?? '';
  if (env && env !== 'none' && !/^sk-ant-\.\.\.$/.test(env)) return env;
  return read(KEY_ANTHROPIC);
}

export function setOpenAIKey(value: string): void {
  write(KEY_OPENAI, value.trim());
}

export function setAnthropicKey(value: string): void {
  write(KEY_ANTHROPIC, value.trim());
}

export function getLanguage(): string {
  return read(KEY_LANGUAGE) || 'en';
}

export function setLanguage(value: string): void {
  write(KEY_LANGUAGE, value.trim());
}
