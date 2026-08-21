import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { prisma, isPrismaConnected } from '../db.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

const MEMORY_USER_FILE = path.join(process.cwd(), '.memory_users.json');

function loadMemoryUsersFromFile(): Map<string, any> {
  const map = new Map<string, any>();
  try {
    if (fs.existsSync(MEMORY_USER_FILE)) {
      const data = JSON.parse(fs.readFileSync(MEMORY_USER_FILE, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach((u) => map.set(u.id, u));
      }
    }
  } catch (e) {}
  return map;
}

export function saveMemoryUsersToFile() {
  try {
    const list = Array.from(memoryUserStore.values());
    fs.writeFileSync(MEMORY_USER_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {}
}

export const memoryUserStore = loadMemoryUsersFromFile();

// Pre-seed user account gauravjha485@gmail.com
const gauravEmail = 'gauravjha485@gmail.com';
let hasGaurav = false;
for (const u of memoryUserStore.values()) {
  if (u.email && u.email.toLowerCase() === gauravEmail) {
    hasGaurav = true;
    u.password_hash = bcrypt.hashSync('raghubhai@007', 10);
    break;
  }
}

if (!hasGaurav) {
  const gauravUser = {
    id: 'usr_gauravjha485',
    email: gauravEmail,
    name: 'Gaurav Jha',
    password_hash: bcrypt.hashSync('raghubhai@007', 10),
    company_website: 'https://dgwrench.com',
    is_email_verified: true,
    terms_accepted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  memoryUserStore.set(gauravUser.id, gauravUser);
  saveMemoryUsersToFile();
}

export function findOrCreateMemoryUser(data: { email: string; name?: string; google_id?: string; id?: string }) {
  const emailKey = data.email.toLowerCase();
  for (const user of memoryUserStore.values()) {
    if (user.email && user.email.toLowerCase() === emailKey) {
      if (data.name) user.name = data.name;
      if (data.google_id) user.google_id = data.google_id;
      if (!user.terms_accepted_at) user.terms_accepted_at = new Date().toISOString();
      saveMemoryUsersToFile();
      return user;
    }
  }

  const userId = data.id || `usr_${data.google_id || emailKey.replace(/[^a-z0-9]/g, '_')}`;
  const newUser = {
    id: userId,
    email: data.email,
    name: data.name || data.email.split('@')[0],
    google_id: data.google_id || null,
    terms_accepted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  memoryUserStore.set(userId, newUser);
  saveMemoryUsersToFile();
  return newUser;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Session token missing or expired.' });
  }

  try {
    const decoded: any = jwt.verify(token, config.jwtSecret);
    let user: any = null;

    if (isPrismaConnected) {
      try {
        if (decoded.userId) {
          user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        }
        if (!user && decoded.email) {
          user = await prisma.user.findUnique({ where: { email: decoded.email } });
        }
      } catch (err) {
        // Fallback
      }
    }

    if (!user) {
      if (decoded.userId) {
        user = memoryUserStore.get(decoded.userId);
      }
      if (!user && decoded.email) {
        user = findOrCreateMemoryUser({ email: decoded.email });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: User account not found.' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return next();
  } catch (err: any) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid authentication session.' });
  }
}
