import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let db: Database.Database

export function initDatabase(): void {
  const dataDir = path.join(app.getPath('userData'), 'data')
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

  const dbPath = path.join(dataDir, 'memory.db')
  db = new Database(dbPath)

  // Performance pragmas
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  console.log(`[DB] Initialized at ${dbPath}`)
}

function createTables(): void {
  db.exec(`
    -- ── Sessions ────────────────────────────────────────────────────────────────────
    -- Each job submitted by the user = one session
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      job         TEXT NOT NULL,          -- original user request
      boss_plan   TEXT,                   -- how boss decided to route
      status      TEXT DEFAULT 'pending', -- pending | running | done | failed
      created_at  INTEGER DEFAULT (unixepoch()),
      finished_at INTEGER
    );

    -- ── Observations ────────────────────────────────────────────────────────────
    -- Every tool call, decision, or notable event an agent makes
    CREATE TABLE IF NOT EXISTS observations (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL REFERENCES sessions(id),
      agent_id    TEXT NOT NULL,          -- which character did this
      type        TEXT NOT NULL,          -- tool_call | decision | result | error
      content     TEXT NOT NULL,          -- raw text of what happened
      tool_name   TEXT,                   -- if type=tool_call
      tool_input  TEXT,                   -- JSON string
      tool_output TEXT,                   -- JSON string
      created_at  INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- ── Summaries ─────────────────────────────────────────────────────────────
    -- AI-compressed memory per agent (ClaudeMem style)
    -- Injected at the START of each new job for that agent
    CREATE TABLE IF NOT EXISTS summaries (
      id          TEXT PRIMARY KEY,
      agent_id    TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      summary     TEXT NOT NULL,          -- compressed learning
      tokens_saved INTEGER DEFAULT 0,    -- how many raw tokens this replaced
      created_at  INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    -- ── Global shared memory ───────────────────────────────────────────────────
    -- Key facts any agent can read (written by Boss or agents explicitly)
    CREATE TABLE IF NOT EXISTS global_memory (
      id          TEXT PRIMARY KEY,
      key         TEXT NOT NULL UNIQUE,   -- e.g. "user_github_username"
      value       TEXT NOT NULL,
      source      TEXT NOT NULL,          -- which agent wrote this
      updated_at  INTEGER DEFAULT (unixepoch())
    );

    -- ── FTS5 full-text search across observations ──────────────────────────────
    CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
      content,
      tool_name,
      agent_id UNINDEXED,
      session_id UNINDEXED,
      content='observations',
      content_rowid='rowid'
    );

    -- ── FTS5 full-text search across summaries ────────────────────────────────
    CREATE VIRTUAL TABLE IF NOT EXISTS summaries_fts USING fts5(
      summary,
      agent_id UNINDEXED,
      content='summaries',
      content_rowid='rowid'
    );

    -- ── Triggers to keep FTS indexes in sync ─────────────────────────────────
    CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
      INSERT INTO observations_fts(rowid, content, tool_name, agent_id, session_id)
      VALUES (new.rowid, new.content, new.tool_name, new.agent_id, new.session_id);
    END;

    CREATE TRIGGER IF NOT EXISTS summaries_ai AFTER INSERT ON summaries BEGIN
      INSERT INTO summaries_fts(rowid, summary, agent_id)
      VALUES (new.rowid, new.summary, new.agent_id);
    END;
  `)
}

// ─── Session Operations ───────────────────────────────────────────────────────────────────

export function createSession(id: string, job: string): void {
  db.prepare(`
    INSERT INTO sessions (id, job, status) VALUES (?, ?, 'pending')
  `).run(id, job)
}

export function updateSession(id: string, fields: {
  boss_plan?: string
  status?: string
  finished_at?: number
}): void {
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ')
  db.prepare(`UPDATE sessions SET ${sets} WHERE id = ?`)
    .run(...Object.values(fields), id)
}

export function getJobHistory(): any[] {
  return db.prepare(`
    SELECT s.*, COUNT(o.id) as observation_count
    FROM sessions s
    LEFT JOIN observations o ON o.session_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all()
}

// ─── Observation Operations ───────────────────────────────────────────────────────────────

export function saveObservation(obs: {
  id: string
  session_id: string
  agent_id: string
  type: string
  content: string
  tool_name?: string
  tool_input?: string
  tool_output?: string
}): void {
  db.prepare(`
    INSERT INTO observations (id, session_id, agent_id, type, content, tool_name, tool_input, tool_output)
    VALUES (@id, @session_id, @agent_id, @type, @content, @tool_name, @tool_input, @tool_output)
  `).run(obs)
}

// ─── Summary Operations ─────────────────────────────────────────────────────────────────

export function saveSummary(summary: {
  id: string
  agent_id: string
  session_id: string
  summary: string
  tokens_saved?: number
}): void {
  db.prepare(`
    INSERT INTO summaries (id, agent_id, session_id, summary, tokens_saved)
    VALUES (@id, @agent_id, @session_id, @summary, @tokens_saved)
  `).run(summary)
}

// Get last N summaries for an agent - injected into system prompt
export function getRecentSummaries(agentId: string, limit = 10): string[] {
  const rows = db.prepare(`
    SELECT summary FROM summaries
    WHERE agent_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(agentId, limit) as { summary: string }[]
  return rows.map(r => r.summary)
}

// FTS search across an agent's memory
export function searchMemory(agentId: string, query: string): string[] {
  const rows = db.prepare(`
    SELECT s.content FROM observations s
    JOIN observations_fts fts ON fts.rowid = s.rowid
    WHERE fts.content MATCH ? AND s.agent_id = ?
    ORDER BY rank
    LIMIT 5
  `).all(query, agentId) as { content: string }[]
  return rows.map(r => r.content)
}

// Full memory view for the memory viewer panel
export function getAgentMemory(agentId: string): {
  summaries: any[]
  observations: any[]
  global: any[]
} {
  return {
    summaries: db.prepare(`
      SELECT * FROM summaries WHERE agent_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(agentId),
    observations: db.prepare(`
      SELECT * FROM observations WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(agentId),
    global: db.prepare(`SELECT * FROM global_memory ORDER BY updated_at DESC`).all(),
  }
}

// ─── Global Memory Operations ─────────────────────────────────────────────────────────────

export function setGlobalMemory(key: string, value: string, source: string): void {
  db.prepare(`
    INSERT INTO global_memory (id, key, value, source, updated_at)
    VALUES (?, ?, ?, ?, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, source=excluded.source, updated_at=excluded.updated_at
  `).run(`gm_${key}`, key, value, source)
}

export function getGlobalMemory(): Record<string, string> {
  const rows = db.prepare(`SELECT key, value FROM global_memory`).all() as { key: string; value: string }[]
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export function getDb(): Database.Database {
  return db
}