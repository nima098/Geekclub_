import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | object;
}

let pool: pg.Pool | null = null;
let isConnected = false;
let connectionError: string | null = null;

/**
 * Check if PostgreSQL configuration is provided via environment variables
 */
export function hasPostgresConfig(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
    (process.env.PGHOST && process.env.PGDATABASE) ||
    (process.env.POSTGRES_HOST && process.env.POSTGRES_DB)
  );
}

/**
 * Initialize PostgreSQL connection pool and verify connection
 */
export async function initPostgres(): Promise<boolean> {
  if (!hasPostgresConfig()) {
    console.log('[Database] PostgreSQL environment variables not detected. Running in JSON File Database mode.');
    return false;
  }

  const connectionString = process.env.DATABASE_URL;
  const host = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
  const port = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT || '5432', 10);
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'geekclub';
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '';
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'geekclub_db';

  try {
    pool = connectionString
      ? new Pool({
          connectionString,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
        })
      : new Pool({
          host,
          port,
          user,
          password,
          database,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
        });

    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning] Unexpected error on idle client:', err.message);
    });

    // Test ping
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, version() as version;');
    client.release();

    isConnected = true;
    connectionError = null;
    console.log(`[Database] PostgreSQL connected successfully! Version: ${res.rows[0]?.version?.split(' ')[1] || 'PostgreSQL'}`);

    // Ensure database tables exist
    await ensureTablesExist();

    return true;
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message || 'Connection failed';
    console.warn(`[Database Warning] Could not connect to PostgreSQL (${connectionError}). Falling back seamlessly to JSON file storage.`);
    return false;
  }
}

/**
 * Create tables and indexes if they do not exist
 */
export async function ensureTablesExist(): Promise<void> {
  if (!pool || !isConnected) return;

  const createTablesSql = `
    CREATE TABLE IF NOT EXISTS geekclub_contents (
      id VARCHAR(128) PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT,
      thumbnail TEXT,
      platform VARCHAR(64),
      category VARCHAR(64),
      tags TEXT[],
      author JSONB,
      likes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      is_archived BOOLEAN DEFAULT FALSE,
      seed_status VARCHAR(64) DEFAULT 'active',
      raw_data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS geekclub_comments (
      id VARCHAR(128) PRIMARY KEY,
      content_id VARCHAR(128) NOT NULL,
      author JSONB,
      text TEXT,
      raw_data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS geekclub_profiles (
      id VARCHAR(128) PRIMARY KEY,
      email VARCHAR(255),
      display_name VARCHAR(255),
      username VARCHAR(255),
      role VARCHAR(64) DEFAULT 'user',
      is_admin BOOLEAN DEFAULT FALSE,
      raw_data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS geekclub_settings (
      key VARCHAR(128) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS geekclub_deleted_records (
      id VARCHAR(128) PRIMARY KEY,
      deleted_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS geekclub_backups (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      backup_type VARCHAR(64) DEFAULT '12h_auto',
      drive_file_id VARCHAR(255),
      status VARCHAR(64) DEFAULT 'success',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes for ultra-fast searches and lookups
    CREATE INDEX IF NOT EXISTS idx_gc_contents_category ON geekclub_contents (category);
    CREATE INDEX IF NOT EXISTS idx_gc_contents_platform ON geekclub_contents (platform);
    CREATE INDEX IF NOT EXISTS idx_gc_contents_archived ON geekclub_contents (is_archived);
    CREATE INDEX IF NOT EXISTS idx_gc_comments_content_id ON geekclub_comments (content_id);
  `;

  try {
    await pool.query(createTablesSql);
    console.log('[Database] PostgreSQL schemas and indexes verified successfully.');
  } catch (err: any) {
    console.error('[Database Error] Failed to create PostgreSQL schemas:', err.message);
  }
}

export function isPostgresConnected(): boolean {
  return isConnected && pool !== null;
}

export async function getPostgresDiagnostic() {
  if (!pool || !isConnected) {
    return {
      configured: hasPostgresConfig(),
      connected: false,
      error: connectionError || 'PostgreSQL not configured. System using atomic JSON storage.',
      engine: 'JSON File Store (data/database.json)'
    };
  }

  try {
    const startTime = Date.now();
    const countRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM geekclub_contents) as contents_count,
        (SELECT COUNT(*) FROM geekclub_comments) as comments_count,
        (SELECT COUNT(*) FROM geekclub_profiles) as profiles_count
    `);
    const pingLatency = Date.now() - startTime;

    const verRes = await pool.query('SELECT version()');

    return {
      configured: true,
      connected: true,
      engine: 'PostgreSQL Relational Database',
      version: verRes.rows[0]?.version || 'PostgreSQL',
      pingMs: pingLatency,
      tableCounts: {
        contents: parseInt(countRes.rows[0]?.contents_count || '0', 10),
        comments: parseInt(countRes.rows[0]?.comments_count || '0', 10),
        profiles: parseInt(countRes.rows[0]?.profiles_count || '0', 10)
      }
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      engine: 'PostgreSQL (Disconnected)',
      error: err.message
    };
  }
}

/**
 * Load complete dataset from PostgreSQL into memory structure
 */
export async function loadDatabaseFromPostgres(): Promise<{
  contents: any[];
  comments: Record<string, any[]>;
  deletedIds: string[];
  settings: Record<string, any>;
  profiles: Record<string, any>;
} | null> {
  if (!pool || !isConnected) return null;

  try {
    const contentsRes = await pool.query('SELECT raw_data FROM geekclub_contents ORDER BY created_at DESC');
    const contents = contentsRes.rows.map((r) => r.raw_data);

    const commentsRes = await pool.query('SELECT content_id, raw_data FROM geekclub_comments ORDER BY created_at ASC');
    const comments: Record<string, any[]> = {};
    for (const r of commentsRes.rows) {
      if (!comments[r.content_id]) comments[r.content_id] = [];
      comments[r.content_id].push(r.raw_data);
    }

    const profilesRes = await pool.query('SELECT id, raw_data FROM geekclub_profiles');
    const profiles: Record<string, any> = {};
    for (const r of profilesRes.rows) {
      profiles[r.id] = r.raw_data;
    }

    const settingsRes = await pool.query('SELECT key, value FROM geekclub_settings');
    const settings: Record<string, any> = {};
    for (const r of settingsRes.rows) {
      settings[r.key] = r.value;
    }

    const deletedRes = await pool.query('SELECT id FROM geekclub_deleted_records');
    const deletedIds = deletedRes.rows.map((r) => r.id);

    return {
      contents,
      comments,
      deletedIds,
      settings,
      profiles
    };
  } catch (err: any) {
    console.error('[PostgreSQL Read Error]:', err.message);
    return null;
  }
}

/**
 * Save entire database to PostgreSQL (Atomic Transaction)
 */
export async function saveDatabaseToPostgres(dbData: {
  contents: any[];
  comments: Record<string, any[]>;
  deletedIds?: string[];
  settings?: Record<string, any>;
  profiles?: Record<string, any>;
}): Promise<boolean> {
  if (!pool || !isConnected) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Upsert contents
    for (const item of dbData.contents || []) {
      if (!item || !item.id) continue;
      await client.query(
        `INSERT INTO geekclub_contents 
         (id, title, description, url, thumbnail, platform, category, tags, author, likes, views, is_archived, seed_status, raw_data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           url = EXCLUDED.url,
           thumbnail = EXCLUDED.thumbnail,
           platform = EXCLUDED.platform,
           category = EXCLUDED.category,
           tags = EXCLUDED.tags,
           author = EXCLUDED.author,
           likes = EXCLUDED.likes,
           views = EXCLUDED.views,
           is_archived = EXCLUDED.is_archived,
           seed_status = EXCLUDED.seed_status,
           raw_data = EXCLUDED.raw_data,
           updated_at = NOW()`,
        [
          item.id,
          item.title || '',
          item.description || '',
          item.url || '',
          item.thumbnail || '',
          item.platform || 'other',
          item.category || 'tech',
          Array.isArray(item.tags) ? item.tags : [],
          JSON.stringify(item.author || {}),
          item.likes || 0,
          item.views || 0,
          Boolean(item.isArchived),
          item.seedStatus || 'active',
          JSON.stringify(item)
        ]
      );
    }

    // 2. Sync Profiles
    if (dbData.profiles) {
      for (const [key, profile] of Object.entries(dbData.profiles)) {
        if (!profile) continue;
        await client.query(
          `INSERT INTO geekclub_profiles (id, email, display_name, username, role, is_admin, raw_data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             display_name = EXCLUDED.display_name,
             username = EXCLUDED.username,
             role = EXCLUDED.role,
             is_admin = EXCLUDED.is_admin,
             raw_data = EXCLUDED.raw_data,
             updated_at = NOW()`,
          [
            key,
            (profile as any).email || key,
            (profile as any).displayName || 'کاربر',
            (profile as any).username || key,
            (profile as any).role || 'user',
            Boolean((profile as any).isAdmin),
            JSON.stringify(profile)
          ]
        );
      }
    }

    // 3. Sync Settings
    if (dbData.settings) {
      for (const [key, value] of Object.entries(dbData.settings)) {
        await client.query(
          `INSERT INTO geekclub_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET
             value = EXCLUDED.value,
             updated_at = NOW()`,
          [key, JSON.stringify(value)]
        );
      }
    }

    // 4. Sync Comments
    if (dbData.comments) {
      for (const [contentId, commentList] of Object.entries(dbData.comments)) {
        if (!Array.isArray(commentList)) continue;
        for (const c of commentList) {
          if (!c || !c.id) continue;
          await client.query(
            `INSERT INTO geekclub_comments (id, content_id, author, text, raw_data, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               text = EXCLUDED.text,
               author = EXCLUDED.author,
               raw_data = EXCLUDED.raw_data`,
            [
              c.id,
              contentId,
              JSON.stringify(c.author || {}),
              c.text || '',
              JSON.stringify(c),
              c.createdAt ? new Date(c.createdAt) : new Date()
            ]
          );
        }
      }
    }

    // 5. Sync Deleted IDs
    if (Array.isArray(dbData.deletedIds)) {
      for (const delId of dbData.deletedIds) {
        await client.query(
          `INSERT INTO geekclub_deleted_records (id, deleted_at)
           VALUES ($1, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [delId]
        );
      }
    }

    await client.query('COMMIT');
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[PostgreSQL Save Error]:', err.message);
    return false;
  } finally {
    client.release();
  }
}

/**
 * Record a backup entry into PostgreSQL
 */
export async function recordPostgresBackup(filename: string, backupType = '12h_auto', driveFileId?: string) {
  if (!pool || !isConnected) return;
  try {
    await pool.query(
      `INSERT INTO geekclub_backups (filename, backup_type, drive_file_id, status)
       VALUES ($1, $2, $3, 'success')`,
      [filename, backupType, driveFileId || null]
    );
  } catch (err: any) {
    console.warn('[PostgreSQL Backup Record Warning]:', err.message);
  }
}
