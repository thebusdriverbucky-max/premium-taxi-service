import { db } from "../lib/db";

async function main() {
  try {
    console.log("Test order script is currently disabled to prevent build errors.");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

main();
