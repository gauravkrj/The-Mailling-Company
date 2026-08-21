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
  .catch((err) => {
    isPrismaConnected = false;
    console.warn('⚠️ PostgreSQL not available. Running in Standalone In-Memory Database Mode.');
  });

// In-Memory store for quick standalone dev/test operations when DB is unavailable
class InMemoryStore {
  users: Map<string, any> = new Map();
  campaigns: Map<string, any> = new Map();
  contacts: Map<string, any[]> = new Map(); // campaignId -> contacts
  drafts: Map<string, any> = new Map(); // campaignId -> draft
  sendLogs: Map<string, any[]> = new Map(); // campaignId -> sendLogs
  suppressions: Map<string, Set<string>> = new Map(); // userId -> Set<email>

  constructor() {
    // Seed default demo user
    const defaultUser = {
      id: 'usr_demo_123',
      email: 'demo@mailpersonalize.com',
      name: 'Demo User',
      workspaceType: 'GMAIL_PERSONAL',
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);
    this.users.set(defaultUser.email, defaultUser);
  }
}

export const inMemoryStore = new InMemoryStore();
