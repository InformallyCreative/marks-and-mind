// IndexedDB wrapper. One object store per top-level key in the data model.
// Uses the `idb` package for a typed Promise API.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  AudioBlob,
  Entry,
  Mark,
  MindNode,
  ScheduleBlock,
  Stats,
} from '../types';

const DB_NAME = 'marks-and-mind';
const DB_VERSION = 1;
const STATS_KEY = 'singleton';

interface MMSchema extends DBSchema {
  entries: {
    key: string;
    value: Entry;
    indexes: { by_timestamp: string };
  };
  marks: {
    key: string;
    value: Mark;
    indexes: { by_status: string; by_scope: string };
  };
  nodes: {
    key: string;
    value: MindNode;
    indexes: { by_type: string; by_last_touched: string };
  };
  schedule_blocks: {
    key: string;
    value: ScheduleBlock;
    indexes: { by_scheduled_for: string; by_status: string };
  };
  audio_blobs: {
    key: string;
    value: AudioBlob;
  };
  stats: {
    key: string;
    value: Stats & { _id: string };
  };
}

let dbPromise: Promise<IDBPDatabase<MMSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<MMSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<MMSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('entries')) {
          const s = db.createObjectStore('entries', { keyPath: 'id' });
          s.createIndex('by_timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains('marks')) {
          const s = db.createObjectStore('marks', { keyPath: 'id' });
          s.createIndex('by_status', 'status');
          s.createIndex('by_scope', 'scope');
        }
        if (!db.objectStoreNames.contains('nodes')) {
          const s = db.createObjectStore('nodes', { keyPath: 'id' });
          s.createIndex('by_type', 'type');
          s.createIndex('by_last_touched', 'last_touched_at');
        }
        if (!db.objectStoreNames.contains('schedule_blocks')) {
          const s = db.createObjectStore('schedule_blocks', { keyPath: 'id' });
          s.createIndex('by_scheduled_for', 'scheduled_for');
          s.createIndex('by_status', 'status');
        }
        if (!db.objectStoreNames.contains('audio_blobs')) {
          db.createObjectStore('audio_blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: '_id' });
        }
      },
    });
  }
  return dbPromise;
}

// --- Entries ---

export async function putEntry(entry: Entry): Promise<void> {
  const db = await getDB();
  await db.put('entries', entry);
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const db = await getDB();
  return db.get('entries', id);
}

export async function listEntries(): Promise<Entry[]> {
  const db = await getDB();
  const all = await db.getAll('entries');
  return all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('entries', id);
}

// --- Marks ---

export async function putMark(mark: Mark): Promise<void> {
  const db = await getDB();
  await db.put('marks', mark);
}

export async function getMark(id: string): Promise<Mark | undefined> {
  const db = await getDB();
  return db.get('marks', id);
}

export async function listMarks(): Promise<Mark[]> {
  const db = await getDB();
  return db.getAll('marks');
}

export async function deleteMark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('marks', id);
}

// --- Nodes ---

export async function putNode(node: MindNode): Promise<void> {
  const db = await getDB();
  await db.put('nodes', node);
}

export async function listNodes(): Promise<MindNode[]> {
  const db = await getDB();
  return db.getAll('nodes');
}

export async function deleteNode(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('nodes', id);
}

// --- Schedule blocks ---

export async function putBlock(block: ScheduleBlock): Promise<void> {
  const db = await getDB();
  await db.put('schedule_blocks', block);
}

export async function getBlock(id: string): Promise<ScheduleBlock | undefined> {
  const db = await getDB();
  return db.get('schedule_blocks', id);
}

export async function listBlocks(): Promise<ScheduleBlock[]> {
  const db = await getDB();
  return db.getAll('schedule_blocks');
}

export async function deleteBlock(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('schedule_blocks', id);
}

// --- Audio blobs ---

export async function putAudioBlob(b: AudioBlob): Promise<void> {
  const db = await getDB();
  await db.put('audio_blobs', b);
}

export async function getAudioBlob(id: string): Promise<AudioBlob | undefined> {
  const db = await getDB();
  return db.get('audio_blobs', id);
}

// --- Stats (singleton) ---

const DEFAULT_STATS: Stats = {
  total_xp: 0,
  level: 1,
  current_streak_days: 0,
  longest_streak_days: 0,
  last_active_date: null,
  efficiency_history: [],
};

export async function getStats(): Promise<Stats> {
  const db = await getDB();
  const row = await db.get('stats', STATS_KEY);
  if (!row) {
    return { ...DEFAULT_STATS };
  }
  // strip internal _id
  const { _id: _ignored, ...stats } = row;
  void _ignored;
  return stats;
}

export async function putStats(stats: Stats): Promise<void> {
  const db = await getDB();
  await db.put('stats', { ...stats, _id: STATS_KEY });
}

// --- Bulk export / wipe (useful for backup or debugging) ---

export async function exportAll(): Promise<{
  entries: Entry[];
  marks: Mark[];
  nodes: MindNode[];
  schedule_blocks: ScheduleBlock[];
  stats: Stats;
}> {
  const [entries, marks, nodes, schedule_blocks, stats] = await Promise.all([
    listEntries(),
    listMarks(),
    listNodes(),
    listBlocks(),
    getStats(),
  ]);
  return { entries, marks, nodes, schedule_blocks, stats };
}

export async function wipeAll(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('entries'),
    db.clear('marks'),
    db.clear('nodes'),
    db.clear('schedule_blocks'),
    db.clear('audio_blobs'),
    db.clear('stats'),
  ]);
}
