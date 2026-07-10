/**
 * @file agent.controller.ts
 * @description
 *   Express route handlers for agent session management and action-log querying.
 *
 *   Endpoints:
 *     GET    /api/v1/agent/sessions          → listSessions
 *     POST   /api/v1/agent/sessions          → createSession
 *     GET    /api/v1/agent/sessions/:id      → getSession
 *     PATCH  /api/v1/agent/sessions/:id      → updateSession
 *     GET    /api/v1/agent/sessions/:id/actions   → listActions
 *     POST   /api/v1/agent/sessions/:id/snapshot  → createSnapshot
 */

import { Request, Response, NextFunction } from 'express';
import * as actionService from '../services/action.service';
import * as fileService from '../services/file.service';
import { ApiSuccess } from '../types/api.types';
import {
  CreateSessionPayload,
  UpdateSessionPayload,
  CreateSnapshotPayload,
} from '../types/agent.types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function ok<T>(res: Response, data: T, message?: string, status = 200): void {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
  res.status(status).json(body);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/agent/sessions
 * Returns all agent sessions (newest first) with action + snapshot counts.
 */
export async function listSessions(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessions = await actionService.listSessions();
    ok(res, sessions, `${sessions.length} session(s) found.`);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/agent/sessions
 * Creates a new agent session.
 * Body: { name, notes?, frontendRootPath? }
 */
export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, notes, frontendRootPath } = req.body as CreateSessionPayload;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '"name" is required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const session = await actionService.createSession({ name: name.trim(), notes, frontendRootPath });
    ok(res, session, 'Agent session created.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/agent/sessions/:id
 * Returns a single session with its action log and snapshots.
 */
export async function getSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await actionService.getSession(req.params['id'] as string);
    ok(res, session);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/agent/sessions/:id
 * Partially updates a session (name, status, notes).
 * Body: { name?, status?, notes? }
 */
export async function updateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, status, notes } = req.body as UpdateSessionPayload;
    const session = await actionService.updateSession(req.params['id'] as string, {
      name,
      status: status as any,
      notes,
    });
    ok(res, session, 'Session updated.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/agent/sessions/:id/actions
 * Returns a paginated list of ActionLog entries for the session.
 * Query: ?page=1&pageSize=50
 */
export async function listActions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query['page']     as string ?? '1',  10));
    const pageSize = Math.min(200, parseInt(req.query['pageSize'] as string ?? '50', 10));
    const { actions, total } = await actionService.listActions(req.params['id'] as string, page, pageSize);

    ok(res, {
      items: actions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/agent/sessions/:id/snapshot
 * Takes a snapshot of the current workspace directory tree and saves it.
 * Body: { label }
 */
export async function createSnapshot(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { label } = req.body as CreateSnapshotPayload;

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '"label" is required.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Capture the live directory tree
    const { tree } = fileService.getDirectoryTree();

    const snapshot = await actionService.createSnapshot(
      req.params['id'] as string,
      label.trim(),
      tree as object
    );

    // Log the snapshot as an action
    await actionService.logAction({
      sessionId:  req.params['id'] as string,
      operation:  'SNAPSHOT',
      targetPath: '.',
      success:    true,
      payload:    { label: snapshot.label, snapshotId: snapshot.id },
    }).catch(() => {});

    ok(res, snapshot, 'Workspace snapshot created.', 201);
  } catch (err) {
    next(err);
  }
}
