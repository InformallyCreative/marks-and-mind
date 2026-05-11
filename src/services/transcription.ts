// Voice → text. Whisper API primary, browser Web Speech API fallback.

import { getOpenAIKey } from '../utils/settings';

export interface TranscriptionResult {
  text: string;
  source: 'whisper' | 'web-speech' | 'manual';
}

/** Whisper API. Throws if no key is configured or the request fails. */
export async function transcribeWithWhisper(
  blob: Blob,
  language = 'en',
): Promise<TranscriptionResult> {
  const OPENAI_KEY = getOpenAIKey();
  if (!OPENAI_KEY) {
    throw new Error('OpenAI API key not set (add it in Settings)');
  }
  const form = new FormData();
  // The file extension matters to Whisper. The MediaRecorder typically
  // produces audio/webm on Chrome / Android and audio/mp4 on iOS Safari.
  const ext = blob.type.includes('mp4')
    ? 'm4a'
    : blob.type.includes('mpeg')
      ? 'mp3'
      : 'webm';
  form.append('file', blob, `entry.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', language);
  form.append('response_format', 'json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Whisper ${res.status}: ${errBody}`);
  }
  const data = (await res.json()) as { text: string };
  return { text: data.text.trim(), source: 'whisper' };
}

// --- Web Speech API fallback (Chrome / Safari iOS limited support) ---

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: { 0: { transcript: string } }[] }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

export function isWebSpeechAvailable(): boolean {
  const w = window as unknown as WindowWithSpeech;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Returns the live transcript when the user stops talking. */
export function transcribeWithWebSpeech(
  lang = 'en-AU',
): Promise<TranscriptionResult> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as WindowWithSpeech;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      reject(new Error('Web Speech API not available'));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    const parts: string[] = [];
    rec.onresult = (ev) => {
      for (const r of ev.results) {
        parts.push(r[0].transcript);
      }
    };
    rec.onerror = (ev) => reject(new Error(`Web Speech error: ${ev.error}`));
    rec.onend = () =>
      resolve({ text: parts.join(' ').trim(), source: 'web-speech' });
    rec.start();
  });
}

/**
 * Try Whisper first; if it fails (no key, offline, etc.) fall back to a
 * caller-provided manual transcript so we never lose the entry.
 */
export async function transcribeAudio(
  blob: Blob,
  manualFallback = '',
): Promise<TranscriptionResult> {
  try {
    return await transcribeWithWhisper(blob);
  } catch (e) {
    console.warn('[transcription] Whisper failed, falling back:', e);
    if (manualFallback.trim()) {
      return { text: manualFallback.trim(), source: 'manual' };
    }
    throw e;
  }
}
