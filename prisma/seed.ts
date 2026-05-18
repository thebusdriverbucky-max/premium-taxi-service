// prisma/seed.ts

import { db } from "@/lib/db";

async function main() {
  try {
    console.log("Seed script is currently disabled to prevent build errors.");
    // Add taxi-specific seeding here if needed
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
