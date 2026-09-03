-- Temporary Phase 2A synthetic-only compatibility table.
CREATE TABLE "CompatibilityProbe" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" VARCHAR(80) NOT NULL,

    CONSTRAINT "CompatibilityProbe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompatibilityProbe_label_key"
ON "CompatibilityProbe"("label");
