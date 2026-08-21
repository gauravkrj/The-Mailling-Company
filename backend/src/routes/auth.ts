import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';
import { prisma, isPrismaConnected } from '../db.js';
import { requireAuth, AuthenticatedRequest, memoryUserStore, findOrCreateMemoryUser, saveMemoryUsersToFile } from '../middleware/auth.js';
import { encryptToken } from '../utils/crypto.js';
import { memoryAccountStore } from './accounts.js';
import { sendTransactionalSystemEmail } from '../services/emailSender.js';

const router = Router();

// Brute-force Login Rate Limiter (5 attempts limit per email/IP, 15 min lock)
const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function checkRateLimit(key: string): { locked: boolean; error?: string } {
  const record = failedLoginAttempts.get(key);
  if (record) {
    if (record.lockedUntil > Date.now()) {
      const waitMins = Math.ceil((record.lockedUntil - Date.now()) / 60000);
      return { locked: true, error: `Too many failed login attempts. Account locked for ${waitMins} minutes.` };
    }
    if (record.lockedUntil <= Date.now()) {
      failedLoginAttempts.delete(key);
    }
  }
  return { locked: false };
}

function recordFailedAttempt(key: string) {
  const record = failedLoginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
  }
  failedLoginAttempts.set(key, record);
}

function clearFailedAttempts(key: string) {
  failedLoginAttempts.delete(key);
}

// 1. Initiate Google OAuth Flow for User Login (Task 4 & CSRF Security)
router.get('/google', (req, res) => {
  const clientId = config.googleClientId;
  const clientSecret = config.googleClientSecret;

  if (!clientId || !clientSecret) {
    return res.status(400).json({
      success: false,
      error: 'Google OAuth Client ID & Secret not configured in backend environment.',
    });
  }

  const googleOAuthClient = new OAuth2Client(
    clientId,
    clientSecret,
    config.googleRedirectUri
  );

  const stateToken = crypto.randomBytes(24).toString('hex');
  res.cookie('oauth_state', stateToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });

  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  const authUrl = googleOAuthClient.generateAuthUrl({
    access_type: 'online',
    scope: scopes,
    state: stateToken,
    prompt: 'select_account',
  });

  return res.redirect(authUrl);
});

// 2. Google OAuth Callback Endpoint (Handles both Login & Gmail Send Connection)
router.get('/google/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(`${config.clientUrl}?auth_error=consent_denied`);
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    return res.redirect(`${config.clientUrl}?auth_error=missing_parameters`);
  }

  // A. HANDLE GMAIL SENDING ACCOUNT OAUTH CONNECTION (Phase 3 Flow)
  if (state.startsWith('send_') || state.startsWith('send:::')) {
    const savedSendState = req.cookies?.gmail_send_state;

    if (!savedSendState || state !== savedSendState) {
      return res.redirect(`${config.clientUrl}/dashboard?account_error=csrf_failed`);
    }

    res.clearCookie('gmail_send_state');

    try {
      const googleOAuthClient = new OAuth2Client(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );

      const { tokens } = await googleOAuthClient.getToken(code);
      const refreshToken = tokens.refresh_token || tokens.access_token || 'mock_token';

      // Fetch user profile
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await response.json();

      if (!profile.email) {
        return res.redirect(`${config.clientUrl}/dashboard?account_error=no_email`);
      }

      const senderEmail = profile.email;
      const displayName = profile.name || senderEmail;

      // Detect limit: 500 for personal @gmail.com vs 2000 for Google Workspace (Task 4 Requirement)
      const isPersonalGmail = /@gmail\.com$|@googlemail\.com$/i.test(senderEmail);
      const dailyLimit = isPersonalGmail ? 500 : 2000;

      // Encrypt refresh token using AES-256-GCM (Task 3 Requirement)
      const encryptedRefreshToken = encryptToken(refreshToken);

      // Extract user_id safely using token cookie or regex state matching
      let userId: string = 'usr_demo_123';
      const token = req.cookies?.token;
      if (token) {
        try {
          const decoded: any = jwt.verify(token, config.jwtSecret);
          if (decoded && decoded.userId) userId = decoded.userId;
        } catch (e) {
          // Fallback
        }
      }
      if (userId === 'usr_demo_123' && state.includes(':::')) {
        const parts = state.split(':::');
        if (parts[1]) userId = parts[1];
      }

      let sendingAccount: any = null;

      if (isPrismaConnected) {
        try {
          sendingAccount = await prisma.sendingAccount.upsert({
            where: {
              user_id_sender_email_provider: {
                user_id: userId,
                sender_email: senderEmail,
                provider: 'google_oauth',
              },
            },
            update: {
              display_name: displayName,
              encrypted_refresh_token: encryptedRefreshToken,
              daily_limit: dailyLimit,
              status: 'active',
              last_verified_at: new Date(),
            },
            create: {
              user_id: userId,
              provider: 'google_oauth',
              display_name: displayName,
              sender_email: senderEmail,
              encrypted_refresh_token: encryptedRefreshToken,
              daily_limit: dailyLimit,
              status: 'active',
            },
          });
        } catch (dbErr) {
          // Fallback
        }
      }

      if (!sendingAccount) {
        sendingAccount = {
          id: `acc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          user_id: userId,
          provider: 'google_oauth',
          display_name: displayName,
          sender_email: senderEmail,
          encrypted_refresh_token: encryptedRefreshToken,
          daily_limit: dailyLimit,
          status: 'active',
          connected_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
        };
        memoryAccountStore.set(sendingAccount.id, sendingAccount);
      }

      return res.redirect(`${config.clientUrl}/dashboard?account_success=connected`);
    } catch (err: any) {
      console.error('Gmail send connect error:', err?.message || err);
      return res.redirect(`${config.clientUrl}/dashboard?account_error=connection_failed`);
    }
  }

  // B. HANDLE STANDARD USER LOGIN OAUTH (Phase 1 Flow)
  const savedState = req.cookies?.oauth_state;

  if (!savedState || state !== savedState) {
    return res.redirect(`${config.clientUrl}?auth_error=csrf_validation_failed`);
  }

  res.clearCookie('oauth_state');

  try {
    const googleOAuthClient = new OAuth2Client(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );

    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await response.json();

    if (!googleUser.email) {
      return res.redirect(`${config.clientUrl}?auth_error=profile_email_missing`);
    }

    let user: any = null;

    if (isPrismaConnected) {
      try {
        user = await prisma.user.upsert({
          where: { email: googleUser.email },
          update: {
            name: googleUser.name || null,
            google_id: googleUser.id || null,
          },
          create: {
            email: googleUser.email,
            name: googleUser.name || null,
            google_id: googleUser.id || null,
            terms_accepted_at: new Date(),
          },
        });
      } catch (dbErr) {
        // Fallback
      }
    }

    if (!user) {
      user = findOrCreateMemoryUser({
        email: googleUser.email,
        name: googleUser.name || 'Google User',
        google_id: googleUser.id || undefined,
      });
    }

    const sessionToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.cookie('token', sessionToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    return res.redirect(`${config.clientUrl}/dashboard?auth=success`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err?.message || err);
    return res.redirect(`${config.clientUrl}?auth_error=token_exchange_failed`);
  }
});

// 3. Demo Sign-In Endpoint
router.post('/demo', async (req, res) => {
  let demoUser: any = null;

  if (isPrismaConnected) {
    try {
      demoUser = await prisma.user.upsert({
        where: { email: 'alex.rivera@startup.io' },
        update: { name: 'Alex Rivera', terms_accepted_at: new Date() },
        create: {
          id: 'usr_demo_123',
          email: 'alex.rivera@startup.io',
          name: 'Alex Rivera',
          google_id: 'google_demo_98765',
          terms_accepted_at: new Date(),
        },
      });
    } catch (err) {
      // Fallback
    }
  }

  if (!demoUser) {
    demoUser = findOrCreateMemoryUser({
      id: 'usr_demo_123',
      email: 'alex.rivera@startup.io',
      name: 'Alex Rivera',
      google_id: 'google_demo_98765',
    });
  }

  const sessionToken = jwt.sign(
    { userId: demoUser.id, email: demoUser.email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.cookie('token', sessionToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });

  return res.json({
    success: true,
    user: demoUser,
  });
});

// 4. Email + Password Signup Endpoint (Phase 5D Requirement)
router.post('/signup', async (req, res) => {
  const { name, email, password, company_website } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Full name is required.' });
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, error: 'Valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8 || !/\d/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long and contain at least one number.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check email uniqueness
  if (isPrismaConnected) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists — try logging in instead.',
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  for (const u of memoryUserStore.values()) {
    if (u.email && u.email.toLowerCase() === normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists — try logging in instead.',
      });
    }
  }

  const password_hash = await bcrypt.hash(password, 10);
  const verification_token = crypto.randomBytes(32).toString('hex');
  let user: any = null;

  if (isPrismaConnected) {
    try {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          password_hash,
          company_website: company_website ? String(company_website).trim() : null,
          is_email_verified: false,
          verification_token,
          terms_accepted_at: new Date(),
        },
      });
    } catch (dbErr: any) {
      if (dbErr.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'An account with this email already exists — try logging in instead.',
        });
      }
    }
  }

  const randomAvatar = `/assets/Avatar${Math.floor(Math.random() * 7) + 1}.png`;

  if (!user) {
    user = {
      id: `usr_${crypto.createHash('md5').update(normalizedEmail).digest('hex').substring(0, 16)}`,
      email: normalizedEmail,
      name: name.trim(),
      password_hash,
      company_website: company_website ? String(company_website).trim() : null,
      avatar_url: randomAvatar,
      is_email_verified: false,
      verification_token,
      terms_accepted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    memoryUserStore.set(user.id, user);
    saveMemoryUsersToFile();
  }

  // Issue Session JWT
  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.cookie('token', sessionToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });

  const verifyUrl = `${config.appUrl}/api/auth/verify-email?token=${verification_token}`;
  console.log(`📧 [Verification Link for ${normalizedEmail}]: ${verifyUrl}`);

  sendTransactionalSystemEmail({
    recipientEmail: normalizedEmail,
    subject: 'Confirm your account email — The Mailling Company',
    htmlContent: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0F0D0E;color:#F2EDEE;border-radius:16px;border:2px solid #054048;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align:center;margin-bottom:16px;">
        <img src="${config.appUrl}/assets/Avatar1.png" alt="The Mailling Company Avatar" style="width:64px;height:64px;border-radius:50%;border:2px solid #054048;object-fit:cover;display:inline-block;" />
      </div>
      <h2 style="color:#F2EDEE;text-align:center;margin-top:0;">Verify your email address</h2>
      <p style="color:#A89DA0;font-size:14px;line-height:1.6;">Hi ${name.trim()}, thank you for registering with The Mailling Company. Please confirm your email address by clicking the button below:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}" style="background:#054048;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:bold;font-size:14px;box-shadow:0 4px 12px rgba(5,64,72,0.4);">Verify Email Address</a>
      </div>
      <p style="color:#A89DA0;font-size:12px;line-height:1.5;">Or copy this link into your browser:<br><a href="${verifyUrl}" style="color:#4A9D6E;word-break:break-all;">${verifyUrl}</a></p>
    </div>`,
    textContent: `Hi ${name.trim()},\n\nPlease confirm your email address by clicking the link below:\n${verifyUrl}`,
  }).catch(() => {});

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url || randomAvatar,
      company_website: user.company_website,
      is_email_verified: user.is_email_verified,
      terms_accepted_at: user.terms_accepted_at ? (typeof user.terms_accepted_at === 'string' ? user.terms_accepted_at : user.terms_accepted_at.toISOString()) : new Date().toISOString(),
    },
    verificationUrl: verifyUrl,
  });
});

// 5. Email + Password Login Endpoint (Phase 5D Requirement)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid email or password.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rateLimitKey = `${clientIp}_${normalizedEmail}`;
  const rateLimitCheck = checkRateLimit(rateLimitKey);

  if (rateLimitCheck.locked) {
    return res.status(429).json({ success: false, error: rateLimitCheck.error });
  }

  let user: any = null;

  if (isPrismaConnected) {
    try {
      user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    } catch (e) {
      // Fallback
    }
  }

  if (!user) {
    for (const u of memoryUserStore.values()) {
      if (u.email && u.email.toLowerCase() === normalizedEmail) {
        user = u;
        break;
      }
    }
  }

  if (!user || !user.password_hash) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  }

  clearFailedAttempts(rateLimitKey);

  const sessionToken = jwt.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.cookie('token', sessionToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      company_website: user.company_website,
      is_email_verified: user.is_email_verified,
      terms_accepted_at: user.terms_accepted_at ? (typeof user.terms_accepted_at === 'string' ? user.terms_accepted_at : user.terms_accepted_at.toISOString()) : null,
    },
  });
});

// 6. Verify Email Confirmation Link Endpoint
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send('Invalid or missing verification token.');
  }

  if (isPrismaConnected) {
    try {
      const user = await prisma.user.findFirst({ where: { verification_token: token } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { is_email_verified: true, verification_token: null },
        });
      }
    } catch (e) {
      // Fallback
    }
  }

  memoryUserStore.forEach((u) => {
    if (u.verification_token === token) {
      u.is_email_verified = true;
      u.verification_token = null;
    }
  });

  return res.redirect(`${config.clientUrl}/dashboard?verified=true`);
});

// 7. Forgot Password Request Endpoint
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  if (isPrismaConnected) {
    try {
      await prisma.user.updateMany({
        where: { email: normalizedEmail },
        data: { reset_token: resetToken, reset_token_expires: expiresAt },
      });
    } catch (e) {}
  }

  memoryUserStore.forEach((u) => {
    if (u.email && u.email.toLowerCase() === normalizedEmail) {
      u.reset_token = resetToken;
      u.reset_token_expires = expiresAt.toISOString();
    }
  });

  const resetUrl = `${config.clientUrl}?reset_token=${resetToken}`;
  console.log(`🔑 [Password Reset Link for ${normalizedEmail}]: ${resetUrl}`);

  sendTransactionalSystemEmail({
    recipientEmail: normalizedEmail,
    subject: 'Reset your password — The Mailling Company',
    htmlContent: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#0F0D0E;color:#F2EDEE;border-radius:16px;border:2px solid #054048;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
      <div style="text-align:center;margin-bottom:16px;">
        <img src="${config.appUrl}/assets/Avatar1.png" alt="The Mailling Company Avatar" style="width:64px;height:64px;border-radius:50%;border:2px solid #054048;object-fit:cover;display:inline-block;" />
      </div>
      <h2 style="color:#F2EDEE;text-align:center;margin-top:0;">Reset Your Password</h2>
      <p style="color:#A89DA0;font-size:14px;line-height:1.6;">You requested a password reset for your account at The Mailling Company. Click the button below to set a new password:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="background:#054048;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:10px;display:inline-block;font-weight:bold;font-size:14px;box-shadow:0 4px 12px rgba(5,64,72,0.4);">Set New Password</a>
      </div>
      <p style="color:#A89DA0;font-size:12px;line-height:1.5;">Or copy this link into your browser:<br><a href="${resetUrl}" style="color:#4A9D6E;word-break:break-all;">${resetUrl}</a></p>
    </div>`,
    textContent: `You requested a password reset. Click here to reset your password:\n${resetUrl}`,
  }).catch(() => {});

  return res.json({
    success: true,
    message: 'If an account exists with that email address, a password reset link has been sent.',
    resetUrl: config.nodeEnv !== 'production' ? resetUrl : undefined,
  });
});

// 8. Reset Password Submit Endpoint
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid or missing reset token.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8 || !/\d/.test(password)) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long and contain at least one number.',
    });
  }

  const newHash = await bcrypt.hash(password, 10);
  let updated = false;

  if (isPrismaConnected) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          reset_token: token,
          reset_token_expires: { gte: new Date() },
        },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password_hash: newHash,
            reset_token: null,
            reset_token_expires: null,
          },
        });
        updated = true;
      }
    } catch (e) {}
  }

  memoryUserStore.forEach((u) => {
    if (u.reset_token === token) {
      u.password_hash = newHash;
      u.reset_token = null;
      u.reset_token_expires = null;
      updated = true;
    }
  });

  if (!updated) {
    return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
  }

  return res.json({
    success: true,
    message: 'Your password has been reset successfully. You can now log in.',
  });
});

// 9. Logout Endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// 10. Get Current Authenticated User Endpoint
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  let fullUser: any = req.user;

  if (isPrismaConnected && req.user?.id) {
    try {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (dbUser) {
        fullUser = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          company_website: dbUser.company_website,
          is_email_verified: dbUser.is_email_verified,
          terms_accepted_at: dbUser.terms_accepted_at ? dbUser.terms_accepted_at.toISOString() : null,
        };
      }
    } catch (e) {}
  }

  if (fullUser && memoryUserStore.has(fullUser.id)) {
    const memUser = memoryUserStore.get(fullUser.id);
    fullUser = {
      ...fullUser,
      company_website: memUser?.company_website || fullUser?.company_website,
      is_email_verified: memUser?.is_email_verified ?? fullUser?.is_email_verified,
      terms_accepted_at: memUser?.terms_accepted_at || fullUser?.terms_accepted_at || null,
    };
  }

  return res.json({
    authenticated: true,
    user: fullUser,
  });
});

export default router;
