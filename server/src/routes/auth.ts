import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma, inMemoryStore } from '../db.js';

const router = Router();

const googleOAuthClient = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri
);

// Returns Google OAuth Login URL
router.get('/google/url', (req, res) => {
  if (!config.googleClientId) {
    return res.json({
      url: null,
      message: 'Google Client ID not configured. Use instant demo login.',
    });
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/gmail.send',
  ];

  const url = googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });

  return res.json({ url });
});

// Callback route for Google OAuth
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect(`${config.clientUrl}?error=missing_code`);
  }

  try {
    const { tokens } = await googleOAuthClient.getToken(code);
    googleOAuthClient.setCredentials(tokens);

    const oauth2 = googleOAuthClient.credentials;
    // Get user info
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.access_token}`);
    const googleUser = await response.json();

    let user: any = null;
    try {
      user = await prisma.user.upsert({
        where: { email: googleUser.email },
        update: {
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          googleOAuthToken: tokens.access_token || null,
          googleRefreshToken: tokens.refresh_token || null,
        },
        create: {
          email: googleUser.email,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          googleOAuthToken: tokens.access_token || null,
          googleRefreshToken: tokens.refresh_token || null,
          workspaceType: googleUser.email.endsWith('@gmail.com') ? 'GMAIL_PERSONAL' : 'GMAIL_WORKSPACE',
        },
      });
    } catch (e) {
      user = {
        id: `usr_${Date.now()}`,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        workspaceType: googleUser.email.endsWith('@gmail.com') ? 'GMAIL_PERSONAL' : 'GMAIL_WORKSPACE',
      };
      inMemoryStore.users.set(user.id, user);
      inMemoryStore.users.set(user.email, user);
    }

    const sessionToken = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie('token', sessionToken, { httpOnly: true, secure: config.nodeEnv === 'production' });

    return res.redirect(`${config.clientUrl}?auth=success&token=${sessionToken}`);
  } catch (err: any) {
    console.error('Google OAuth Exchange error:', err);
    return res.redirect(`${config.clientUrl}?error=auth_failed`);
  }
});

// Demo Sign In for instant out-of-the-box usage
router.post('/demo-login', async (req, res) => {
  const demoUser = {
    id: 'usr_demo_123',
    email: 'alex.founder@startup.io',
    name: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    workspaceType: 'GMAIL_PERSONAL' as const,
    googleOAuthToken: 'mock_access_token',
  };

  try {
    await prisma.user.upsert({
      where: { id: demoUser.id },
      update: demoUser,
      create: demoUser,
    });
  } catch (e) {
    inMemoryStore.users.set(demoUser.id, demoUser);
  }

  const sessionToken = jwt.sign({ userId: demoUser.id, email: demoUser.email }, config.jwtSecret, { expiresIn: '7d' });
  return res.json({ success: true, token: sessionToken, user: demoUser });
});

// Get current session user
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  let userId = 'usr_demo_123';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded: any = jwt.verify(authHeader.substring(7), config.jwtSecret);
      userId = decoded.userId;
    } catch (e) {
      // Fallback demo user
    }
  }

  let user: any = null;
  try {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } catch (e) {
    user = inMemoryStore.users.get(userId) || inMemoryStore.users.get('usr_demo_123');
  }

  if (!user) {
    user = {
      id: 'usr_demo_123',
      email: 'alex.founder@startup.io',
      name: 'Alex Rivera',
      workspaceType: 'GMAIL_PERSONAL',
    };
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    workspaceType: user.workspaceType,
    hasGmailOAuth: Boolean(user.googleOAuthToken),
    hasSESConfigured: Boolean(config.awsAccessKeyId),
  });
});

export default router;
