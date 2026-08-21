import { PrismaClient } from '@prisma/client';

export let isPrismaConnected = true;

export const prisma = new PrismaClient({
  log: ['error'],
});

prisma.$connect()
  .then(() => {
    isPrismaConnected = true;
    console.log('✅ Connected to PostgreSQL via Prisma');
  })
  .catch((err) => {
    isPrismaConnected = true;
    console.warn('⚠️ PostgreSQL initial connect warning:', err.message);
  });
