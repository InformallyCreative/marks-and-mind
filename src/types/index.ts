// Core data model for Marks & Mind. Mirrors the JSON schema in
// marks-and-mind-proposal.md.

export type MarkScope = 'year' | 'month' | 'week' | 'day';
export type MarkStatus = 'open' | 'hit' | 'dropped';
export type NodeType = 'skill' | 'knowledge' | 'tool';
export type BlockStatus = 'scheduled' | 'in_progress' | 'done' | 'skipped';
export type SuggestedWindow =
  | 'this_weekend'
  | 'tonight'
  | 'tomorrow_morning'
  | 'during_work'
  | 'flexible';

export interface Entry {
  id: string;
  timestamp: string; // ISO 8601
  audio_blob_id?: string;
  transcript: string;
  summary: string;
  tags: string[];
  linked_mark_ids: string[];
  linked_node_ids: string[];
  linked_block_ids: string[];
}

export interface Mark {
  id: string;
  title: string;
  scope: MarkScope;
  target_date: string | null;
  status: MarkStatus;
  created_at: string;
  hit_at: string | null;
  parent_mark_id: string | null;
  notes: string;
}

export interface MindNode {
  id: string;
  type: NodeType;
  title: string;
  description: string;
  related_node_ids: string[];
  related_entry_ids: string[];
  created_at: string;
  last_touched_at: string;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  estimated_minutes: number;
  actual_minutes: number | null;
  suggested_window: SuggestedWindow;
  scheduled_for: string; // ISO 8601 (datetime). Empty proposals use the
  // creation date until the user moves them.
  status: BlockStatus;
  linked_mark_id: string | null;
  linked_node_ids: string[];
  linked_entry_id: string | null;
  completed_at: string | null;
  xp_awarded: number;
  notes?: string;
}

export interface Stats {
  total_xp: number;
  level: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_active_date: string | null;
  efficiency_history: { date: string; rating: number }[];
}

export interface AudioBlob {
  id: string;
  blob: Blob;
  created_at: string;
}

// Claude extraction response shape. AI proposes; the user disposes.
export interface ProposedMark {
  title: string;
  scope: MarkScope;
  target_date?: string | null;
  parent_mark_id?: string | null;
  notes?: string;
}

export interface ProposedNode {
  type: NodeType;
  title: string;
  description: string;
}

export interface ProposedBlock {
  title: string;
  estimated_minutes: number;
  suggested_window: SuggestedWindow;
  notes?: string;
}

export interface ExtractionResult {
  summary: string;
  tags: string[];
  proposed_marks: ProposedMark[];
  proposed_nodes: ProposedNode[];
  proposed_schedule_blocks: ProposedBlock[];
}
