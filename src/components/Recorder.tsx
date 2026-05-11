import { useEffect, useRef, useState } from 'react';
import type { Entry, ExtractionResult } from '../types';
import { uuid } from '../utils/uuid';
import { nowIso } from '../utils/time';
import { transcribeAudio } from '../services/transcription';
import { extractFromTranscript } from '../services/claude-extraction';
import {
  listMarks,
  listNodes,
  putAudioBlob,
  putEntry,
} from '../services/db';

interface Props {
  onClose: () => void;
  onComplete: (entry: Entry, extraction: ExtractionResult) => void;
}

type Phase =
  | 'idle'
  | 'recording'
  | 'recorded'
  | 'transcribing'
  | 'extracting'
  | 'saving'
  | 'error';

export function Recorder({ onClose, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || 'audio/webm',
        });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setPhase('recorded');
      };
      rec.start();
      setPhase('recording');
      setSeconds(0);
      tickRef.current = window.setInterval(
        () => setSeconds((s) => s + 1),
        1000,
      );
    } catch (e) {
      setError(`Mic access denied: ${(e as Error).message}`);
      setPhase('error');
    }
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function processAndSave() {
    if (!blobRef.current) return;
    setError('');
    setPhase('transcribing');
    let finalTranscript = transcript;
    try {
      const result = await transcribeAudio(blobRef.current, transcript);
      finalTranscript = result.text;
      setTranscript(result.text);
    } catch (e) {
      // No Whisper key and no manual transcript — bail.
      setError(`Transcription failed: ${(e as Error).message}. Type the transcript and Save manually.`);
      setPhase('recorded');
      return;
    }

    setPhase('extracting');
    let extraction: ExtractionResult;
    try {
      const [marks, nodes] = await Promise.all([listMarks(), listNodes()]);
      extraction = await extractFromTranscript(finalTranscript, {
        existingMarks: marks,
        existingNodes: nodes,
      });
    } catch (e) {
      extraction = {
        summary: finalTranscript.slice(0, 140),
        tags: [],
        proposed_marks: [],
        proposed_nodes: [],
        proposed_schedule_blocks: [],
      };
      console.warn('[recorder] extraction failed, continuing:', e);
    }

    setPhase('saving');
    const audioBlobId = uuid();
    await putAudioBlob({
      id: audioBlobId,
      blob: blobRef.current,
      created_at: nowIso(),
    });
    const entry: Entry = {
      id: uuid(),
      timestamp: nowIso(),
      audio_blob_id: audioBlobId,
      transcript: finalTranscript,
      summary: extraction.summary || finalTranscript.slice(0, 140),
      tags: extraction.tags,
      linked_mark_ids: [],
      linked_node_ids: [],
      linked_block_ids: [],
    };
    await putEntry(entry);
    onComplete(entry, extraction);
  }

  async function saveTextOnly() {
    if (!transcript.trim()) return;
    setError('');
    setPhase('extracting');
    let extraction: ExtractionResult;
    try {
      const [marks, nodes] = await Promise.all([listMarks(), listNodes()]);
      extraction = await extractFromTranscript(transcript, {
        existingMarks: marks,
        existingNodes: nodes,
      });
    } catch (e) {
      extraction = {
        summary: transcript.slice(0, 140),
        tags: [],
        proposed_marks: [],
        proposed_nodes: [],
        proposed_schedule_blocks: [],
      };
      console.warn('[recorder] extraction failed, continuing:', e);
    }
    setPhase('saving');
    const entry: Entry = {
      id: uuid(),
      timestamp: nowIso(),
      transcript,
      summary: extraction.summary || transcript.slice(0, 140),
      tags: extraction.tags,
      linked_mark_ids: [],
      linked_node_ids: [],
      linked_block_ids: [],
    };
    await putEntry(entry);
    onComplete(entry, extraction);
  }

  function discard() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    blobRef.current = null;
    chunksRef.current = [];
    setAudioUrl(null);
    setTranscript('');
    setSeconds(0);
    setPhase('idle');
  }

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'recording') onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-ink-1 border border-ink-2 rounded-t-2xl p-5 pb-8 space-y-4"
        style={{ paddingBottom: `calc(2rem + var(--safe-bottom))` }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-base font-semibold">New entry</h2>
          <button
            onClick={onClose}
            className="text-ink-4 hover:text-white text-sm"
            disabled={phase === 'recording'}
          >
            Close
          </button>
        </div>

        {phase === 'idle' && (
          <button
            onClick={start}
            className="w-full bg-accent rounded-xl py-6 text-lg font-semibold active:scale-[0.98] transition"
          >
            Tap to record
          </button>
        )}

        {phase === 'recording' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-bad animate-pulse" />
              <span className="font-mono">{fmt(seconds)}</span>
              <span className="text-ink-4 text-sm">Recording…</span>
            </div>
            <button
              onClick={stop}
              className="w-full bg-ink-3 rounded-xl py-4 font-semibold"
            >
              Stop
            </button>
          </div>
        )}

        {phase === 'recorded' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-ink-4">
              <span>{fmt(seconds)}</span>
              {audioUrl && <audio controls src={audioUrl} className="flex-1" />}
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              placeholder="Optional manual transcript (used if Whisper isn't configured)"
              className="w-full bg-ink-2 border border-ink-3 rounded-lg p-3 text-sm placeholder:text-ink-4"
            />
            <div className="flex gap-2">
              <button
                onClick={discard}
                className="flex-1 bg-ink-3 rounded-xl py-3 font-medium text-ink-4"
              >
                Discard
              </button>
              <button
                onClick={processAndSave}
                className="flex-[2] bg-accent rounded-xl py-3 font-semibold"
              >
                Transcribe & sort
              </button>
            </div>
            <button
              onClick={saveTextOnly}
              disabled={!transcript.trim()}
              className="w-full text-sm text-ink-4 disabled:opacity-30 underline"
            >
              Skip audio — sort the text only
            </button>
          </div>
        )}

        {(phase === 'transcribing' ||
          phase === 'extracting' ||
          phase === 'saving') && (
          <div className="py-6 text-center space-y-2">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div className="text-sm text-ink-4">
              {phase === 'transcribing' && 'Transcribing audio…'}
              {phase === 'extracting' && 'Sorting with Claude…'}
              {phase === 'saving' && 'Saving entry…'}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-bad bg-bad/10 border border-bad/30 rounded-lg p-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
