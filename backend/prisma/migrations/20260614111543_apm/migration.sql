-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('READ', 'WRITE', 'CREATE', 'DELETE', 'RENAME', 'RESTORE', 'SNAPSHOT');

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "frontendRootPath" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "operation" "OperationType" NOT NULL,
    "targetPath" TEXT NOT NULL,
    "oldPath" TEXT,
    "payload" JSONB,
    "backupId" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_entries" (
    "id" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "backupPath" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL DEFAULT 0,
    "restoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backup_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_snapshots" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "treeJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_sessions_status_idx" ON "agent_sessions"("status");

-- CreateIndex
CREATE INDEX "agent_sessions_createdAt_idx" ON "agent_sessions"("createdAt");

-- CreateIndex
CREATE INDEX "action_logs_sessionId_idx" ON "action_logs"("sessionId");

-- CreateIndex
CREATE INDEX "action_logs_operation_idx" ON "action_logs"("operation");

-- CreateIndex
CREATE INDEX "action_logs_targetPath_idx" ON "action_logs"("targetPath");

-- CreateIndex
CREATE INDEX "action_logs_createdAt_idx" ON "action_logs"("createdAt");

-- CreateIndex
CREATE INDEX "backup_entries_originalPath_idx" ON "backup_entries"("originalPath");

-- CreateIndex
CREATE INDEX "backup_entries_createdAt_idx" ON "backup_entries"("createdAt");

-- CreateIndex
CREATE INDEX "workspace_snapshots_sessionId_idx" ON "workspace_snapshots"("sessionId");

-- CreateIndex
CREATE INDEX "workspace_snapshots_createdAt_idx" ON "workspace_snapshots"("createdAt");

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_backupId_fkey" FOREIGN KEY ("backupId") REFERENCES "backup_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_snapshots" ADD CONSTRAINT "workspace_snapshots_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "agent_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
