// Multi-turn conversational Claude. Used by ChatComposer to let Tyler talk
// something through with the AI; at the end the whole transcript is fed to
// claude-extraction to produce proposed marks/nodes/schedule blocks.

import { getAnthropicKey } from '../utils/settings';

const MODEL = 'claude-sonnet-4-6';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = [
  `You are Tyler's thinking partner inside "Marks & Mind", a voice-first personal OS.`,
  `Tyler is talking something through — an idea, a plan, a frustration, a recap, whatever.`,
  ``,
  `RULES`,
  `- Keep replies SHORT: usually 1–3 sentences, occasionally a quick bullet list of 2–3 items.`,
  `- Mostly ask ONE sharp question per turn to pull the thread further: "what's the actual blocker?", "what would 'done' look like?", "what comes before that?".`,
  `- Reflect briefly when it helps ("sounds like X is the constraint, not Y"), but don't lecture or summarize the whole conversation.`,
  `- Don't invent goals, tasks, or knowledge Tyler hasn't actually said. Don't pre-emptively propose marks/nodes/schedule blocks — a separate system handles extraction at the end.`,
  `- Be direct and Australian-plain. No corporate fluff. No "great point!". No emoji.`,
  `- If Tyler goes off-topic into something concrete (a fact, a project name, a person), accept it and keep the conversation moving — don't ask him to clarify trivial details.`,
  `- The conversation ends when Tyler taps "Done — sort it". Until then, keep the back-and-forth tight.`,
].join('\n');

export async function chatTurn(history: ChatMessage[]): Promise<string> {
  const key = getAnthropicKey();
  if (!key) {
    throw new Error('Anthropic API key not set (add it in Settings)');
  }
  const body = {
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: history,
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    content: { type: string; text: string }[];
  };
  return data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .trim();
}

/** Serialize a chat into a single transcript for the extraction prompt. */
export function chatToTranscript(history: ChatMessage[]): string {
  return history
    .map(
      (m) => `${m.role === 'user' ? 'Tyler' : 'Claude'}: ${m.content.trim()}`,
    )
    .join('\n\n');
}
