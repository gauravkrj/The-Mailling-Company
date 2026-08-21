import { PrismaClient } from '@prisma/client';

export let isPrismaConnected = false;

export const prisma = new PrismaClient({
  log: ['error'],
});

prisma.$connect()
  .then(() => {
    isPrismaConnected = true;
    console.log('✅ Connected to PostgreSQL via Prisma');
  })
  .catch(() => {
    isPrismaConnected = false;
    console.warn('⚠️ PostgreSQL database offline. Standalone scaffolding mode active.');
  });
