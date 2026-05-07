import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    include: { court: true }
  });
  
  console.log("Total Bookings in DB:", bookings.length);
  
  const statusCounts = {};
  bookings.forEach(b => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  });
  console.log("Status Counts:", statusCounts);

  const cancelled = bookings.filter(b => b.status === 'CANCELLED');
  console.log("Cancelled Bookings Count (string check):", cancelled.length);
  
  const firstCancelled = cancelled[0];
  if (firstCancelled) {
      console.log("First Cancelled Booking Date:", firstCancelled.bookingDate);
      console.log("First Cancelled Booking Status:", firstCancelled.status);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
