import { prisma, isPrismaConnected } from '../db.js';

export interface DirectoryContactInput {
  email: string;
  name?: string;
  full_name?: string;
  custom_fields?: Record<string, any>;
}

export const memoryContactDirectoryStore = new Map<string, any>();

/**
 * Merge two custom fields objects cleanly without overwriting existing non-empty values with blanks.
 */
function mergeCustomFields(existing: Record<string, any> = {}, incoming: Record<string, any> = {}): Record<string, any> {
  const merged = { ...existing };
  for (const [key, val] of Object.entries(incoming)) {
    if (key === 'attribute_labels') {
      merged.attribute_labels = {
        ...(existing.attribute_labels || {}),
        ...(incoming.attribute_labels || {}),
      };
      continue;
    }
    if (val !== null && val !== undefined && val !== '') {
      if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
        merged[key] = val;
      }
    }
  }
  return merged;
}

/**
 * Auto-sync imported campaign contacts into the master ContactDirectory.
 */
export async function syncContactsToDirectory(
  userId: string,
  campaignId: string,
  contacts: DirectoryContactInput[]
): Promise<void> {
  if (!userId || !contacts || contacts.length === 0) return;

  // Deduplicate by lowercase email
  const uniqueByEmail = new Map<string, DirectoryContactInput>();
  for (const c of contacts) {
    if (c.email && c.email.trim()) {
      const emailLower = c.email.trim().toLowerCase();
      if (!uniqueByEmail.has(emailLower)) {
        uniqueByEmail.set(emailLower, c);
      }
    }
  }

  for (const [emailLower, contactData] of uniqueByEmail.entries()) {
    const fullName =
      contactData.full_name?.trim() ||
      contactData.name?.trim() ||
      contactData.custom_fields?.full_name?.trim() ||
      contactData.custom_fields?.name?.trim() ||
      null;

    const incomingFields = contactData.custom_fields || {};
    const now = new Date();

    if (isPrismaConnected) {
      try {
        const existing = await prisma.contactDirectory.findUnique({
          where: {
            user_id_email: {
              user_id: userId,
              email: emailLower,
            },
          },
        });

        if (existing) {
          const mergedFields = mergeCustomFields((existing.custom_fields as Record<string, any>) || {}, incomingFields);
          const updatedFullName = existing.full_name || fullName;

          await prisma.contactDirectory.update({
            where: { id: existing.id },
            data: {
              full_name: updatedFullName,
              custom_fields: mergedFields,
              campaigns_count: existing.campaigns_count + 1,
              last_updated_at: now,
            },
          });
        } else {
          await prisma.contactDirectory.create({
            data: {
              user_id: userId,
              email: emailLower,
              full_name: fullName,
              custom_fields: incomingFields,
              status: 'active',
              campaigns_count: 1,
              first_seen_at: now,
              last_updated_at: now,
            },
          });
        }
      } catch (dbErr) {
        console.warn(`⚠️ [ContactDirectory Sync Error] for DB user ${userId} email ${emailLower}:`, dbErr);
      }
    }

    // Always keep memory store updated for fallback environment
    const memKey = `${userId}:${emailLower}`;
    const memExisting = memoryContactDirectoryStore.get(memKey);

    if (memExisting) {
      memExisting.full_name = memExisting.full_name || fullName;
      memExisting.custom_fields = mergeCustomFields(memExisting.custom_fields || {}, incomingFields);
      memExisting.campaigns_count = (memExisting.campaigns_count || 1) + 1;
      memExisting.last_updated_at = now.toISOString();
    } else {
      memoryContactDirectoryStore.set(memKey, {
        id: `cdir_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user_id: userId,
        email: emailLower,
        full_name: fullName,
        custom_fields: incomingFields,
        status: 'active',
        campaigns_count: 1,
        first_seen_at: now.toISOString(),
        last_updated_at: now.toISOString(),
      });
    }
  }

  console.log(`✅ [ContactDirectory Auto-Sync]: Synced ${uniqueByEmail.size} contacts for user ${userId} (Campaign: ${campaignId})`);
}

/**
 * Mark a contact as suppressed globally in ContactDirectory.
 */
export async function markDirectorySuppressed(userId: string, email: string): Promise<void> {
  if (!userId || !email) return;
  const emailLower = email.trim().toLowerCase();
  const now = new Date();

  if (isPrismaConnected) {
    try {
      await prisma.contactDirectory.updateMany({
        where: { user_id: userId, email: emailLower },
        data: { status: 'suppressed', last_updated_at: now },
      });
    } catch (dbErr) {
      console.warn(`⚠️ [ContactDirectory Suppress Error]:`, dbErr);
    }
  }

  const memKey = `${userId}:${emailLower}`;
  const memExisting = memoryContactDirectoryStore.get(memKey);
  if (memExisting) {
    memExisting.status = 'suppressed';
    memExisting.last_updated_at = now.toISOString();
  } else {
    memoryContactDirectoryStore.set(memKey, {
      id: `cdir_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: userId,
      email: emailLower,
      full_name: null,
      custom_fields: {},
      status: 'suppressed',
      campaigns_count: 0,
      first_seen_at: now.toISOString(),
      last_updated_at: now.toISOString(),
    });
  }
}

/**
 * Mark a contact as bounced globally in ContactDirectory.
 */
export async function markDirectoryBounced(userId: string | null | undefined, email: string): Promise<void> {
  if (!email) return;
  const emailLower = email.trim().toLowerCase();
  const now = new Date();

  if (isPrismaConnected) {
    try {
      const whereClause: any = { email: emailLower };
      if (userId) whereClause.user_id = userId;

      await prisma.contactDirectory.updateMany({
        where: whereClause,
        data: { status: 'bounced', last_updated_at: now },
      });
    } catch (dbErr) {
      console.warn(`⚠️ [ContactDirectory Bounce Error]:`, dbErr);
    }
  }

  // Update memory store entries matching email
  memoryContactDirectoryStore.forEach((entry) => {
    if (entry.email.toLowerCase() === emailLower && (!userId || entry.user_id === userId)) {
      entry.status = 'bounced';
      entry.last_updated_at = now.toISOString();
    }
  });
}

/**
 * Check if a contact is globally suppressed or bounced in ContactDirectory.
 */
export async function isContactSuppressedOrBounced(
  userId: string,
  email: string
): Promise<{ suppressed: boolean; reason?: 'suppressed' | 'bounced' }> {
  if (!userId || !email) return { suppressed: false };
  const emailLower = email.trim().toLowerCase();

  if (isPrismaConnected) {
    try {
      const existing = await prisma.contactDirectory.findUnique({
        where: {
          user_id_email: {
            user_id: userId,
            email: emailLower,
          },
        },
      });
      if (existing && (existing.status === 'suppressed' || existing.status === 'bounced')) {
        return { suppressed: true, reason: existing.status as 'suppressed' | 'bounced' };
      }
    } catch (e) {}
  }

  const memKey = `${userId}:${emailLower}`;
  const memExisting = memoryContactDirectoryStore.get(memKey);
  if (memExisting && (memExisting.status === 'suppressed' || memExisting.status === 'bounced')) {
    return { suppressed: true, reason: memExisting.status };
  }

  return { suppressed: false };
}
