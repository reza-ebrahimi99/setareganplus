-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "admin_sessions_userId_expiresAt_idx" ON "admin_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_sessions_revokedAt_idx" ON "admin_sessions"("revokedAt");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
