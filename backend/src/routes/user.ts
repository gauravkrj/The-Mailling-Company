import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma, isPrismaConnected } from '../db.js';
import { requireAuth, AuthenticatedRequest, memoryUserStore, saveMemoryUsersToFile } from '../middleware/auth.js';
import { memoryCampaignStore, memoryDraftStore, memoryDesignStore } from './campaigns.js';
import { memoryContactStore } from './contacts.js';
import { memorySendLogStore, memorySuppressionStore } from '../services/queue.js';
import { memoryAccountStore } from './accounts.js';

const router = Router();

// 1. Update User Profile: PATCH /api/user/profile
router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { name, company_website, email } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Name cannot be empty.' });
  }

  const trimmedName = name.trim();
  const trimmedWebsite = company_website ? String(company_website).trim() : null;
  const trimmedEmail = email ? String(email).trim().toLowerCase() : null;

  let updatedUser: any = null;

  if (isPrismaConnected) {
    try {
      const updateData: any = {
        name: trimmedName,
        company_website: trimmedWebsite,
      };

      if (trimmedEmail && trimmedEmail !== req.user!.email) {
        updateData.email = trimmedEmail;
        updateData.is_email_verified = false;
        updateData.verification_token = crypto.randomBytes(32).toString('hex');
      }

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    } catch (dbErr: any) {
      if (dbErr.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
      }
    }
  }

  // Memory Fallback
  const memUser = memoryUserStore.get(userId);
  if (memUser) {
    memUser.name = trimmedName;
    memUser.company_website = trimmedWebsite;
    if (trimmedEmail && trimmedEmail !== memUser.email) {
      memUser.email = trimmedEmail;
      memUser.is_email_verified = false;
      memUser.verification_token = crypto.randomBytes(32).toString('hex');
    }
    saveMemoryUsersToFile();
    if (!updatedUser) updatedUser = memUser;
  }

  if (!updatedUser) {
    return res.status(404).json({ success: false, error: 'User profile not found.' });
  }

  return res.json({
    success: true,
    message: 'Profile updated successfully!',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      company_website: updatedUser.company_website,
      is_email_verified: updatedUser.is_email_verified ?? true,
      google_id: updatedUser.google_id || null,
    },
  });
});

// 2. Change Password: PATCH /api/user/password
router.post('/password', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Current password and new password are required.' });
  }

  // Validate Password Strength (Min 8 chars, 1 number)
  if (newPassword.length < 8 || !/\d/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long and contain at least one number.',
    });
  }

  let dbUser: any = null;
  if (isPrismaConnected) {
    try {
      dbUser = await prisma.user.findUnique({ where: { id: userId } });
    } catch (e) {}
  }

  const memUser = memoryUserStore.get(userId);
  const user = dbUser || memUser;

  if (!user || !user.password_hash) {
    return res.status(400).json({
      success: false,
      error: 'Password changes are not allowed for Google OAuth accounts.',
    });
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isCurrentValid) {
    return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  if (isPrismaConnected) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: newHash },
      });
    } catch (e) {}
  }

  if (memUser) {
    memUser.password_hash = newHash;
    saveMemoryUsersToFile();
  }

  return res.json({
    success: true,
    message: 'Password updated successfully!',
  });
});

// 3. Cascading Delete Account: DELETE /api/user/account
router.delete('/account', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { confirmation } = req.body;

  if (confirmation !== 'DELETE') {
    return res.status(400).json({
      success: false,
      error: 'Please type "DELETE" to confirm account destruction.',
    });
  }

  // 1. Delete from Prisma Database with full cascade
  if (isPrismaConnected) {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
    } catch (err: any) {
      console.warn('Prisma cascade delete warning:', err?.message);
    }
  }

  // 2. Cascade delete from In-Memory Stores
  memoryUserStore.delete(userId);
  saveMemoryUsersToFile();

  for (const [cmpId, cmp] of memoryCampaignStore.entries()) {
    if (cmp.user_id === userId) {
      memoryCampaignStore.delete(cmpId);
      memoryDraftStore.delete(cmpId);
      memoryDesignStore.delete(cmpId);
      memoryContactStore.delete(cmpId);
      memorySendLogStore.delete(cmpId);
    }
  }

  for (const [accId, acc] of memoryAccountStore.entries()) {
    if (acc.user_id === userId) {
      memoryAccountStore.delete(accId);
    }
  }

  // Clear HTTP-only session cookie
  res.clearCookie('token');

  return res.json({
    success: true,
    message: 'Your account and all associated campaign data have been permanently deleted.',
  });
});

// 4. Record Legal Terms & Consent: PATCH /api/user/consent
router.patch('/consent', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const acceptedAt = new Date();

  let updatedUser: any = null;

  if (isPrismaConnected) {
    try {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { terms_accepted_at: acceptedAt },
      });
    } catch (dbErr: any) {
      // Fallback
    }
  }

  const memUser = memoryUserStore.get(userId);
  if (memUser) {
    memUser.terms_accepted_at = acceptedAt.toISOString();
    saveMemoryUsersToFile();
    if (!updatedUser) updatedUser = memUser;
  }

  if (!updatedUser) {
    updatedUser = {
      id: userId,
      email: req.user!.email,
      name: req.user!.name || null,
      terms_accepted_at: acceptedAt.toISOString(),
    };
  }

  return res.json({
    success: true,
    user: updatedUser,
  });
});

export default router;
