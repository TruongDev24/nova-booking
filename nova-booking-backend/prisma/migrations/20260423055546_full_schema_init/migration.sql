/*
  Warnings:

  - Added the required column `totalHours` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `closingTime` to the `Court` table without a default value. This is not possible if the table is not empty.
  - Added the required column `openingTime` to the `Court` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `Court` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Court` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fullName` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'E_WALLET');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COURT_MANAGER';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "totalHours" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "amenities" TEXT[],
ADD COLUMN     "closingTime" TEXT NOT NULL,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "openingTime" TEXT NOT NULL,
ADD COLUMN     "ownerId" TEXT NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ALTER COLUMN "fullName" SET NOT NULL,
ALTER COLUMN "phone" SET NOT NULL;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "transactionId" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_userId_status_idx" ON "Payment"("userId", "status");

-- CreateIndex
CREATE INDEX "Review_courtId_idx" ON "Review"("courtId");

-- CreateIndex
CREATE INDEX "Booking_startTime_endTime_idx" ON "Booking"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "Booking_courtId_status_idx" ON "Booking"("courtId", "status");

-- CreateIndex
CREATE INDEX "Booking_courtId_startTime_idx" ON "Booking"("courtId", "startTime");

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
