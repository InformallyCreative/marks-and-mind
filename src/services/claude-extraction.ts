// Sends the transcript to Claude with a structured JSON-output prompt and
// returns proposed marks/nodes/schedule_blocks for the review pane.

import type {
  ExtractionResult,
  Mark,
  MindNode,
  ProposedBlock,
  ProposedMark,
  ProposedNode,
} from '../types';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as
  | string
  | undefined;
const MODEL = 'claude-sonnet-4-6';

interface ContextSnapshot {
  existingMarks: Mark[];
  existingNodes: MindNode[];
}

function buildSystemPrompt(ctx: ContextSnapshot): string {
  const markIndex = ctx.existingMarks
    .slice(0, 40)
    .map((m) => `- [${m.scope}] ${m.title} (${m.status})`)
    .join('\n');
  const nodeIndex = ctx.existingNodes
    .slice(0, 40)
    .map((n) => `- [${n.type}] ${n.title}`)
    .join('\n');
  return [
    `You are the extraction engine for "Marks & Mind", a voice-first personal OS for Tyler (Western Australia).`,
    `Tyler talks; you sort the transcript into:`,
    `  - summary (1–2 sentences, present tense)`,
    `  - tags (lowercase, kebab-case, 1–6 of them)`,
    `  - proposed_marks (NEW year/month/week/day goals only — don't duplicate existing ones)`,
    `  - proposed_nodes (NEW skill/knowledge/tool entries)`,
    `  - proposed_schedule_blocks (concrete tasks Tyler should DO, with realistic minute estimates and a suggested_window)`,
    ``,
    `RULES`,
    `- Be conservative. Only propose marks/nodes/blocks the transcript actually warrants. An empty array is fine.`,
    `- Schedule blocks must be ACTIONABLE: titles start with a verb, estimated_minutes is realistic (5–240).`,
    `- suggested_window must be one of: this_weekend, tonight, tomorrow_morning, during_work, flexible.`,
    `- scope (for marks) must be one of: year, month, week, day.`,
    `- node type must be one of: skill, knowledge, tool.`,
    `- Don't invent target dates unless Tyler said them.`,
    ``,
    `EXISTING MARKS (don't propose duplicates):`,
    markIndex || '(none)',
    ``,
    `EXISTING KNOWLEDGE/SKILLS/TOOLS:`,
    nodeIndex || '(none)',
    ``,
    `Return ONLY valid JSON matching this exact shape — no prose, no markdown fences:`,
    `{`,
    `  "summary": string,`,
    `  "tags": string[],`,
    `  "proposed_marks": [{ "title": string, "scope": "year|month|week|day", "target_date": string|null, "notes": string }],`,
    `  "proposed_nodes": [{ "type": "skill|knowledge|tool", "title": string, "description": string }],`,
    `  "proposed_schedule_blocks": [{ "title": string, "estimated_minutes": number, "suggested_window": "this_weekend|tonight|tomorrow_morning|during_work|flexible", "notes": string }]`,
    `}`,
  ].join('\n');
}

const EMPTY: ExtractionResult = {
  summary: '',
  tags: [],
  proposed_marks: [],
  proposed_nodes: [],
  proposed_schedule_blocks: [],
};

const WINDOWS = new Set([
  'this_weekend',
  'tonight',
  'tomorrow_morning',
  'during_work',
  'flexible',
]);

const SCOPES = new Set(['year', 'month', 'week', 'day']);
const TYPES = new Set(['skill', 'knowledge', 'tool']);

function sanitize(raw: unknown): ExtractionResult {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const r = raw as Record<string, unknown>;
  const summary = typeof r.summary === 'string' ? r.summary : '';
  const tags = Array.isArray(r.tags)
    ? (r.tags as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];

  const marks = Array.isArray(r.proposed_marks)
    ? (r.proposed_marks as unknown[]).flatMap((m): ProposedMark[] => {
        if (!m || typeof m !== 'object') return [];
        const x = m as Record<string, unknown>;
        const scope = typeof x.scope === 'string' && SCOPES.has(x.scope)
          ? (x.scope as ProposedMark['scope'])
          : 'week';
        if (typeof x.title !== 'string' || !x.title.trim()) return [];
        return [
          {
            title: x.title.trim(),
            scope,
            target_date:
              typeof x.target_date === 'string' ? x.target_date : null,
            notes: typeof x.notes === 'string' ? x.notes : '',
          },
        ];
      })
    : [];

  const nodes = Array.isArray(r.proposed_nodes)
    ? (r.proposed_nodes as unknown[]).flatMap((n): ProposedNode[] => {
        if (!n || typeof n !== 'object') return [];
        const x = n as Record<string, unknown>;
        const type = typeof x.type === 'string' && TYPES.has(x.type)
          ? (x.type as ProposedNode['type'])
          : 'knowledge';
        if (typeof x.title !== 'string' || !x.title.trim()) return [];
        return [
          {
            type,
            title: x.title.trim(),
            description:
              typeof x.description === 'string' ? x.description : '',
          },
        ];
      })
    : [];

  const blocks = Array.isArray(r.proposed_schedule_blocks)
    ? (r.proposed_schedule_blocks as unknown[]).flatMap((b): ProposedBlock[] => {
        if (!b || typeof b !== 'object') return [];
        const x = b as Record<string, unknown>;
        const sw =
          typeof x.suggested_window === 'string' && WINDOWS.has(x.suggested_window)
            ? (x.suggested_window as ProposedBlock['suggested_window'])
            : 'flexible';
        const est =
          typeof x.estimated_minutes === 'number'
            ? Math.max(5, Math.min(480, Math.round(x.estimated_minutes)))
            : 30;
        if (typeof x.title !== 'string' || !x.title.trim()) return [];
        return [
          {
            title: x.title.trim(),
            estimated_minutes: est,
            suggested_window: sw,
            notes: typeof x.notes === 'string' ? x.notes : '',
          },
        ];
      })
    : [];

  return {
    summary,
    tags,
    proposed_marks: marks,
    proposed_nodes: nodes,
    proposed_schedule_blocks: blocks,
  };
}

/** Pull the first JSON object out of a possibly-noisy string. */
function extractJSON(s: string): unknown {
  const trimmed = s.trim();
  // Strip code fences if Claude returned them despite instructions
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenceMatch ? fenceMatch[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Last-ditch: scan for first { ... last }
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(candidate.slice(first, last + 1));
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

export async function extractFromTranscript(
  transcript: string,
  ctx: ContextSnapshot,
): Promise<ExtractionResult> {
  if (!transcript.trim()) return EMPTY;
  if (!ANTHROPIC_KEY) {
    console.warn('[claude-extraction] no VITE_ANTHROPIC_API_KEY — returning empty');
    return { ...EMPTY, summary: transcript.slice(0, 140) };
  }

  const body = {
    model: MODEL,
    max_tokens: 1500,
    system: buildSystemPrompt(ctx),
    messages: [
      {
        role: 'user',
        content: `Transcript:\n"""\n${transcript}\n"""\n\nReturn the JSON now.`,
      },
    ],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude ${res.status}: ${errText}`);
  }
  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  const text = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');
  const parsed = extractJSON(text);
  return sanitize(parsed);
}
