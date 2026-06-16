/**
 * @file restore.routes.ts
 * @description
 *   Express router for the backup/restore subsystem.
 *
 *   Routes:
 *     GET  /backups                  – List all backup entries (paginated)
 *     POST /backups/:id/restore      – Restore a specific backup to its original path
 */

import { Router } from 'express';
import * as restoreCtrl from '../controllers/restore.controller';

const router = Router();

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get( '/backups',                  restoreCtrl.listBackups);
router.post('/backups/:id/restore',      restoreCtrl.restoreBackup);

export default router;
