/**
 * @file restore.controller.ts
 * @description
 *   Express route handlers for the backup/restore subsystem.
 *
 *   Endpoints:
 *     GET  /api/v1/restore/backups              → list all backup entries
 *     POST /api/v1/restore/backups/:id/restore  → restore a specific backup
 */

import { Request, Response, NextFunction } from 'express';
import * as backupService from '../services/backup.service';
import * as actionService from '../services/action.service';
import { ApiSuccess } from '../types/api.types';
import { BackupEntryDto, RestoreResult } from '../types/file.types';

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

/** Maps a Prisma BackupEntry to the safe DTO shape (converts BigInt → number). */
function toDto(entry: {
  id: string;
  originalPath: string;
  backupPath: string;
  operation: string;
  sizeBytes: bigint;
  restoredAt: Date | null;
  createdAt: Date;
}): BackupEntryDto {
  return {
    id:           entry.id,
    originalPath: entry.originalPath,
    backupPath:   entry.backupPath,
    operation:    entry.operation,
    sizeBytes:    Number(entry.sizeBytes), // BigInt → number for JSON serialisation
    restoredAt:   entry.restoredAt?.toISOString() ?? null,
    createdAt:    entry.createdAt.toISOString(),
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/restore/backups
 * Lists all backup entries in the database (newest first), paginated.
 * Query: ?page=1&pageSize=20
 */
export async function listBackups(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query['page']     as string ?? '1',  10));
    const pageSize = Math.min(100, parseInt(req.query['pageSize'] as string ?? '20', 10));

    const { entries, total } = await backupService.listBackups(page, pageSize);

    ok(res, {
      items: entries.map(toDto),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }, `${total} backup(s) found.`);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/restore/backups/:id/restore
 * Restores a backed-up file to its original location in the frontend project.
 * Body (optional): { sessionId }
 */
export async function restoreBackup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const sessionId = (req.body as { sessionId?: string })?.sessionId;

    const updated = await backupService.restoreBackup(id!);

    const result: RestoreResult = {
      backupId:   updated.id,
      restoredTo: updated.originalPath,
      restoredAt: updated.restoredAt!.toISOString(),
    };

    // Log the restore action if a session ID is provided
    if (sessionId) {
      await actionService.logAction({
        sessionId,
        operation:  'RESTORE',
        targetPath: updated.originalPath,
        backupId:   updated.id,
        success:    true,
        payload:    { backupPath: updated.backupPath },
      }).catch(() => {});
    }

    ok(res, result, `File restored to "${updated.originalPath}".`);
  } catch (err) {
    next(err);
  }
}
