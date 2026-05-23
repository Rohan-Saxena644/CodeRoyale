/*
  Warnings:

  - You are about to drop the column `output` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `sourceCode` on the `Submission` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Submission` table. All the data in the column will be lost.
  - Added the required column `hostName` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Submission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `Submission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "hostName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "output",
DROP COLUMN "sourceCode",
DROP COLUMN "userId",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "outputJson" JSONB,
ADD COLUMN     "role" TEXT NOT NULL;
