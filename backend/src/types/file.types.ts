/**
 * @file file.types.ts
 * @description
 *   TypeScript interfaces for all file-system–related API payloads.
 *   ─────────────────────────────────────────────────────────────────
 *   ✅  Copy this file directly into the frontend's src/types/ folder.
 *       No backend-specific imports.
 * ─────────────────────────────────────────────────────────────────────
 */

// ─── Directory Tree ───────────────────────────────────────────────────────────

/** A single node in the recursive directory tree returned by GET /files/tree */
export interface FileNode {
  /** File or directory name (basename only, e.g. "App.tsx") */
  name: string;
  /** Relative path from the frontend root, e.g. "src/App.tsx" */
  path: string;
  /** "file" | "directory" */
  type: 'file' | 'directory';
  /** File size in bytes. Undefined for directories. */
  sizeBytes?: number;
  /** Last-modified timestamp (ISO string). */
  lastModified?: string;
  /** Extension without the dot, e.g. "tsx". Undefined for directories. */
  extension?: string;
  /** Children nodes — populated only when type === "directory" */
  children?: FileNode[];
}

/** Response shape for GET /api/v1/files/tree */
export interface DirectoryTree {
  /** Absolute path of the root being described */
  rootPath: string;
  /** ISO timestamp when tree was generated */
  generatedAt: string;
  /** The root node (type === "directory") */
  tree: FileNode;
}

// ─── File Read ────────────────────────────────────────────────────────────────

/** Response shape for GET /api/v1/files/read */
export interface FileReadResult {
  /** Relative path of the file */
  path: string;
  /** Raw file content as a UTF-8 string */
  content: string;
  /** File encoding used */
  encoding: 'utf-8';
  /** File size in bytes */
  sizeBytes: number;
  /** Last-modified timestamp (ISO string) */
  lastModified: string;
  /** MIME-like type hint, e.g. "text/typescript", "application/json" */
  mimeHint: string;
}

// ─── File Write ───────────────────────────────────────────────────────────────

/** Request body for POST /api/v1/files/write */
export interface FileWritePayload {
  /** Relative path where the file should be written, e.g. "src/NewComponent.tsx" */
  path: string;
  /** Full file content (UTF-8 string) */
  content: string;
  /**
   * Session ID to attribute this write to.
   * If provided, an ActionLog entry will be created.
   */
  sessionId?: string;
}

/** Response shape for a successful write */
export interface FileWriteResult {
  path: string;
  sizeBytes: number;
  /** Whether an existing file was overwritten (and therefore backed up) */
  overwrote: boolean;
  /** Backup entry ID if the file was overwritten */
  backupId?: string;
  writtenAt: string;
}

// ─── Directory Create ─────────────────────────────────────────────────────────

/** Request body for POST /api/v1/files/mkdir */
export interface MkdirPayload {
  /** Relative path of the directory to create, e.g. "src/new-module" */
  path: string;
  sessionId?: string;
}

/** Response shape for a successful mkdir */
export interface MkdirResult {
  path: string;
  createdAt: string;
}

// ─── File / Dir Rename ────────────────────────────────────────────────────────

/** Request body for PUT /api/v1/files/rename */
export interface RenamePayload {
  /** Current relative path */
  oldPath: string;
  /** New relative path (can move to a different directory) */
  newPath: string;
  sessionId?: string;
}

/** Response shape for a successful rename */
export interface RenameResult {
  oldPath: string;
  newPath: string;
  /** Backup entry ID created for the original path */
  backupId?: string;
  renamedAt: string;
}

// ─── File / Dir Delete ────────────────────────────────────────────────────────

/** Request body for DELETE /api/v1/files/delete */
export interface DeletePayload {
  /** Relative path of the file or directory to delete */
  path: string;
  sessionId?: string;
}

/** Response shape for a successful delete */
export interface DeleteResult {
  path: string;
  /** Backup entry ID of the deleted file/dir copy in .trash/ */
  backupId: string;
  deletedAt: string;
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────

/** Serialised representation of a BackupEntry record */
export interface BackupEntryDto {
  id: string;
  originalPath: string;
  backupPath: string;
  operation: string;
  sizeBytes: number;
  restoredAt: string | null;
  createdAt: string;
}

/** Response shape for POST /api/v1/restore/backups/:id/restore */
export interface RestoreResult {
  backupId: string;
  restoredTo: string;
  restoredAt: string;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

/** The shape of every message emitted by the WebSocket server */
export interface WsFileEvent {
  /** Type of FS change detected by chokidar */
  event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
  /** Relative path from the frontend root */
  path: string;
  /** ISO timestamp */
  timestamp: string;
}
