-- CreateTable
CREATE TABLE "staff_directory_entries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role_label" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "registered_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_directory_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "staff_directory_entries"
    ADD CONSTRAINT "staff_directory_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_directory_entries"
    ADD CONSTRAINT "staff_directory_entries_registered_by_fkey" FOREIGN KEY ("registered_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
