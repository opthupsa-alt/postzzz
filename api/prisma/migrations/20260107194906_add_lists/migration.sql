-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_lists" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lists_tenantId_idx" ON "lists"("tenantId");

-- CreateIndex
CREATE INDEX "lead_lists_listId_idx" ON "lead_lists"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "lead_lists_leadId_listId_key" ON "lead_lists"("leadId", "listId");

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_lists" ADD CONSTRAINT "lead_lists_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
