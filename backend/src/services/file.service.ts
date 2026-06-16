/**
 * @file file.service.ts
 * @description
 *   Core filesystem service — all file and directory operations performed by
 *   the agent go through this module.
 *
 *   Safety contract:
 *     • Paths are assumed to be ALREADY VALIDATED absolute paths (via
 *       validatePath middleware + resolveAndValidate). This service does NOT
 *       re-validate paths; that is the middleware's responsibility.
 *     • Destructive ops (write-overwrite, rename, delete) MUST call the
 *       backup service BEFORE mutating anything.
 *
 *   Public API:
 *     getDirectoryTree(absoluteRoot)             → FileNode
 *     readFile(absolutePath)                     → FileReadResult
 *     writeFile(absolutePath, content, relative) → FileWriteResult
 *     makeDirectory(absolutePath)                → MkdirResult
 *     renameEntry(absOld, absNew, relOld, relNew) → RenameResult
 *     deleteEntry(absolutePath, relativePath)    → DeleteResult
 */

import fs from 'fs';
import path from 'path';
import { FRONTEND_ROOT } from '../config/paths';
import { backupFile } from './backup.service';
import {
  FileNode,
  FileReadResult,
  FileWriteResult,
  MkdirResult,
  RenameResult,
  DeleteResult,
  DirectoryTree,
} from '../types/file.types';
import { AppError } from '../middleware/errorHandler';

// ─── MIME Hint Map ─────────────────────────────────────────────────────────────

/** Maps common extensions to rough MIME-like labels for the frontend to use. */
const MIME_HINTS: Record<string, string> = {
  ts: 'text/typescript', tsx: 'text/typescript-react',
  js: 'text/javascript',  jsx: 'text/javascript-react',
  json: 'application/json', md: 'text/markdown',
  css: 'text/css', html: 'text/html',
  env: 'text/env', txt: 'text/plain',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
  prisma: 'text/prisma', yaml: 'text/yaml', yml: 'text/yaml',
  sh: 'text/shell', gitignore: 'text/plain',
};

function getMimeHint(ext: string): string {
  return MIME_HINTS[ext.toLowerCase()] ?? 'application/octet-stream';
}

// ─── Directory to skip when building the tree ────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.trash']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts an absolute path to a path relative to the frontend root,
 * using forward slashes for cross-platform consistency.
 */
function toRelative(absolutePath: string): string {
  return path.relative(FRONTEND_ROOT, absolutePath).replace(/\\/g, '/');
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Recursively builds a FileNode tree for the given directory.
 * Skips common noise directories (node_modules, .git, dist, .trash).
 *
 * @param dirPath - Absolute path of the directory to scan.
 */
function buildTree(dirPath: string): FileNode {
  const stat = fs.statSync(dirPath);
  const name = path.basename(dirPath);
  const relative = toRelative(dirPath);

  if (stat.isFile()) {
    const ext = path.extname(name).replace('.', '');
    return {
      name,
      path: relative,
      type: 'file',
      sizeBytes: stat.size,
      lastModified: stat.mtime.toISOString(),
      extension: ext,
    };
  }

  // It's a directory — recurse into children
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const children: FileNode[] = [];

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue; // skip noisy dirs

    try {
      children.push(buildTree(path.join(dirPath, entry.name)));
    } catch {
      // Skip files we can't read (permissions, broken symlinks, etc.)
    }
  }

  // Sort: directories first, then files, alphabetically within each group
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { name, path: relative, type: 'directory', children };
}

/**
 * Returns the full recursive directory tree of the frontend root.
 */
export function getDirectoryTree(): DirectoryTree {
  const rootNode = buildTree(FRONTEND_ROOT);
  return {
    rootPath: FRONTEND_ROOT,
    generatedAt: new Date().toISOString(),
    tree: rootNode,
  };
}

/**
 * Reads a file's content as a UTF-8 string.
 *
 * @param absolutePath - Validated absolute path to read.
 * @throws AppError 404 if the file does not exist.
 * @throws AppError 400 if the path is a directory.
 */
export function readFile(absolutePath: string): FileReadResult {
  if (!fs.existsSync(absolutePath)) {
    throw new AppError(404, 'NOT_FOUND', `File not found: "${toRelative(absolutePath)}"`);
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    throw new AppError(400, 'IS_DIRECTORY', `The path "${toRelative(absolutePath)}" is a directory, not a file.`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const name = path.basename(absolutePath);
  const ext = path.extname(name).replace('.', '');

  return {
    path:         toRelative(absolutePath),
    content,
    encoding:     'utf-8',
    sizeBytes:    stat.size,
    lastModified: stat.mtime.toISOString(),
    mimeHint:     getMimeHint(ext),
  };
}

/**
 * Creates or overwrites a file with the given content.
 * If the file already exists, it is backed up BEFORE being overwritten.
 *
 * @param absolutePath  - Validated absolute path to write to.
 * @param relativePath  - Relative path (for backup metadata).
 * @param content       - UTF-8 string content to write.
 * @returns FileWriteResult including backup ID if an overwrite occurred.
 */
export async function writeFile(
  absolutePath: string,
  relativePath: string,
  content: string
): Promise<FileWriteResult> {
  const existed = fs.existsSync(absolutePath);
  let backupId: string | undefined;

  if (existed) {
    // ⚠️  SAFETY: Back up the existing file BEFORE overwriting
    const backup = await backupFile(absolutePath, relativePath, 'WRITE');
    backupId = backup.id;
  }

  // Ensure parent directory exists
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  // Write the file
  fs.writeFileSync(absolutePath, content, 'utf-8');
  const stat = fs.statSync(absolutePath);

  return {
    path:       relativePath,
    sizeBytes:  stat.size,
    overwrote:  existed,
    backupId,
    writtenAt:  new Date().toISOString(),
  };
}

/**
 * Creates a directory (and all necessary parent directories) at the given path.
 *
 * @param absolutePath - Validated absolute path of the directory to create.
 * @throws AppError 409 if the directory already exists.
 */
export function makeDirectory(absolutePath: string): MkdirResult {
  if (fs.existsSync(absolutePath)) {
    throw new AppError(409, 'ALREADY_EXISTS', `Directory already exists: "${toRelative(absolutePath)}"`);
  }

  fs.mkdirSync(absolutePath, { recursive: true });

  return {
    path:      toRelative(absolutePath),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Renames or moves a file/directory.
 * The source is backed up BEFORE the rename operation.
 *
 * @param absOldPath  - Validated absolute current path.
 * @param absNewPath  - Validated absolute destination path.
 * @param relOldPath  - Relative old path (for backup metadata).
 * @param relNewPath  - Relative new path (for response).
 */
export async function renameEntry(
  absOldPath: string,
  absNewPath: string,
  relOldPath: string,
  relNewPath: string
): Promise<RenameResult> {
  if (!fs.existsSync(absOldPath)) {
    throw new AppError(404, 'NOT_FOUND', `Source not found: "${relOldPath}"`);
  }
  if (fs.existsSync(absNewPath)) {
    throw new AppError(409, 'ALREADY_EXISTS', `Destination already exists: "${relNewPath}"`);
  }

  // ⚠️  SAFETY: Back up source before rename
  const backup = await backupFile(absOldPath, relOldPath, 'RENAME');

  // Ensure the destination parent directory exists
  fs.mkdirSync(path.dirname(absNewPath), { recursive: true });
  fs.renameSync(absOldPath, absNewPath);

  return {
    oldPath:    relOldPath,
    newPath:    relNewPath,
    backupId:   backup.id,
    renamedAt:  new Date().toISOString(),
  };
}

/**
 * Deletes a file or directory recursively.
 * The target is backed up BEFORE deletion.
 *
 * @param absolutePath  - Validated absolute path to delete.
 * @param relativePath  - Relative path (for backup metadata + response).
 */
export async function deleteEntry(
  absolutePath: string,
  relativePath: string
): Promise<DeleteResult> {
  if (!fs.existsSync(absolutePath)) {
    throw new AppError(404, 'NOT_FOUND', `Path not found: "${relativePath}"`);
  }

  // ⚠️  SAFETY: Back up BEFORE deleting — no delete without a receipt
  const backup = await backupFile(absolutePath, relativePath, 'DELETE');

  // Remove file or recursively remove directory
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    fs.rmSync(absolutePath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(absolutePath);
  }

  return {
    path:       relativePath,
    backupId:   backup.id,
    deletedAt:  new Date().toISOString(),
  };
}
