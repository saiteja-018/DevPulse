const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function test() {
  try {
    const connectionString = "postgresql://postgres:postgres@localhost:5432/devpulse?connect_timeout=1";
    console.log("Connecting to", connectionString);
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    await prisma.$connect();
    console.log("Prisma connected successfully!");
    
    const count = await prisma.user.count();
    console.log("User count:", count);
  } catch (error) {
    console.error("Prisma connection failed:", error);
  }
}

test();
