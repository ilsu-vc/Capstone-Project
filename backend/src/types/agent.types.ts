/**
 * @file agent.types.ts
 * @description
 *   TypeScript interfaces for agent session & action-log API payloads.
 *   ─────────────────────────────────────────────────────────────────
 *   ✅  Copy this file directly into the frontend's src/types/ folder.
 *       No backend-specific imports.
 * ─────────────────────────────────────────────────────────────────────
 */

// ─── Enums (mirrored from Prisma schema) ─────────────────────────────────────

export type SessionStatus = 'ACTIVE' | 'PAUSED' | 'TERMINATED';

export type OperationType =
  | 'READ'
  | 'WRITE'
  | 'CREATE'
  | 'DELETE'
  | 'RENAME'
  | 'RESTORE'
  | 'SNAPSHOT';

// ─── Agent Session ────────────────────────────────────────────────────────────

/** DTO returned by GET /api/v1/agent/sessions and POST /api/v1/agent/sessions */
export interface AgentSessionDto {
  id: string;
  name: string;
  status: SessionStatus;
  frontendRootPath: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** Number of actions logged in this session */
  _count?: { actions: number; snapshots: number };
}

/** Request body for POST /api/v1/agent/sessions */
export interface CreateSessionPayload {
  name: string;
  notes?: string;
  /** Defaults to FRONTEND_ROOT from server env if omitted */
  frontendRootPath?: string;
}

/** Request body for PATCH /api/v1/agent/sessions/:id */
export interface UpdateSessionPayload {
  name?: string;
  status?: SessionStatus;
  notes?: string;
}

// ─── Action Log ───────────────────────────────────────────────────────────────

/** DTO returned by GET /api/v1/agent/sessions/:id/actions */
export interface ActionLogDto {
  id: string;
  sessionId: string;
  operation: OperationType;
  targetPath: string;
  oldPath: string | null;
  payload: Record<string, unknown> | null;
  backupId: string | null;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

// ─── Workspace Snapshot ───────────────────────────────────────────────────────

/** DTO returned by GET /api/v1/agent/sessions/:id (includes snapshots array) */
export interface WorkspaceSnapshotDto {
  id: string;
  sessionId: string;
  label: string;
  /** Full FileNode tree JSON stored at snapshot time */
  treeJson: unknown;
  createdAt: string;
}

/** Request body for POST /api/v1/agent/sessions/:id/snapshot */
export interface CreateSnapshotPayload {
  label: string;
}
