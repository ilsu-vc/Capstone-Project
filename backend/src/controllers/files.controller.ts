/**
 * @file files.controller.ts
 * @description
 *   Express route handlers for all file and directory operations.
 *
 *   These controllers are intentionally thin — they:
 *     1. Extract and validate request inputs.
 *     2. Delegate to file.service.ts for FS operations.
 *     3. Optionally delegate to action.service.ts to persist the log.
 *     4. Return a typed ApiSuccess response.
 *     5. Forward any errors to the global errorHandler via next(err).
 */

import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { FRONTEND_ROOT } from '../config/paths';
import * as fileService from '../services/file.service';
import * as actionService from '../services/action.service';
import {
  FileWritePayload,
  MkdirPayload,
  RenamePayload,
  DeletePayload,
} from '../types/file.types';
import { ApiSuccess } from '../types/api.types';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Converts an absolute path to a relative path from the frontend root. */
function toRelative(absolutePath: string): string {
  return path.relative(FRONTEND_ROOT, absolutePath).replace(/\\/g, '/');
}

/** Sends a typed ApiSuccess envelope. */
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
 * GET /api/v1/files/tree
 * Returns the full recursive directory tree of the frontend root.
 */
export async function getTree(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tree = fileService.getDirectoryTree();
    ok(res, tree, 'Directory tree retrieved successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/read?path=<relativePath>
 * Reads and returns the content of a single file.
 * Requires `validatePath` middleware to have run first.
 */
export async function readFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const absolutePath = req.safePath!; // set by validatePath middleware
    const result = fileService.readFile(absolutePath);

    // Optionally log READ operations (non-destructive but useful for audit)
    const sessionId = req.query['sessionId'] as string | undefined;
    if (sessionId) {
      await actionService.logAction({
        sessionId,
        operation:  'READ',
        targetPath: result.path,
        success:    true,
        payload:    { sizeBytes: result.sizeBytes },
      }).catch(() => {}); // Non-critical — don't let logging failure break the read
    }

    ok(res, result, 'File read successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/files/write
 * Creates or overwrites a file. Backs up first if the file already exists.
 * Body: { path, content, sessionId? }
 */
export async function writeFile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const absolutePath = req.safePath!;
    const { content, sessionId } = req.body as FileWritePayload;
    const relativePath = toRelative(absolutePath);

    const result = await fileService.writeFile(absolutePath, relativePath, content);

    // Log the action
    if (sessionId) {
      await actionService.logAction({
        sessionId,
        operation:  'WRITE',
        targetPath: relativePath,
        backupId:   result.backupId,
        success:    true,
        payload:    { sizeBytes: result.sizeBytes, overwrote: result.overwrote },
      }).catch(() => {});
    }

    ok(res, result, result.overwrote ? 'File overwritten (backup created).' : 'File created.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/files/mkdir
 * Creates a directory (and parents) at the given path.
 * Body: { path, sessionId? }
 */
export async function makeDirectory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const absolutePath = req.safePath!;
    const { sessionId } = req.body as MkdirPayload;
    const relativePath = toRelative(absolutePath);

    const result = fileService.makeDirectory(absolutePath);

    if (sessionId) {
      await actionService.logAction({
        sessionId,
        operation:  'CREATE',
        targetPath: relativePath,
        success:    true,
      }).catch(() => {});
    }

    ok(res, result, 'Directory created.', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/files/rename
 * Renames or moves a file/directory. Backs up source before renaming.
 * Body: { oldPath, newPath, sessionId? }
 * Requires `validateRenamePaths` middleware.
 */
export async function renameEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const absOldPath = req.safePath!;
    const absNewPath = req.safeNewPath!;
    const { sessionId } = req.body as RenamePayload;
    const relOldPath = toRelative(absOldPath);
    const relNewPath = toRelative(absNewPath);

    const result = await fileService.renameEntry(absOldPath, absNewPath, relOldPath, relNewPath);

    if (sessionId) {
      await actionService.logAction({
        sessionId,
        operation:  'RENAME',
        targetPath: relNewPath,
        oldPath:    relOldPath,
        backupId:   result.backupId,
        success:    true,
      }).catch(() => {});
    }

    ok(res, result, 'Entry renamed successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/files/delete
 * Deletes a file or directory. Always backs up first.
 * Query: ?path=<relativePath>&sessionId=<sessionId>
 * OR Body: { path, sessionId? }
 */
export async function deleteEntry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const absolutePath = req.safePath!;
    // Accept sessionId from query or body
    const sessionId =
      (req.query['sessionId'] as string | undefined) ??
      (req.body as Partial<DeletePayload>)?.sessionId;
    const relativePath = toRelative(absolutePath);

    const result = await fileService.deleteEntry(absolutePath, relativePath);

    if (sessionId) {
      await actionService.logAction({
        sessionId,
        operation:  'DELETE',
        targetPath: relativePath,
        backupId:   result.backupId,
        success:    true,
      }).catch(() => {});
    }

    ok(res, result, 'Entry deleted (backup created in .trash/).');
  } catch (err) {
    next(err);
  }
}
