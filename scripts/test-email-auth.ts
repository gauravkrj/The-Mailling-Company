import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testEmailAuth() {
  console.log('🧪 Starting Phase 5D Test: Email + Password Authentication & Security...');

  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123';
  const testName = 'Test User';

  // 1. Weak Password Signup Test
  console.log('1. Testing weak password validation...');
  const weakRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: 'short' }),
  });
  const weakData: any = await weakRes.json();
  if (weakRes.ok || weakData.success) throw new Error('Expected failure for weak password');
  console.log('✅ Weak password rejected cleanly:', weakData.error);

  // 2. Valid Signup Test
  console.log('2. Testing valid email/password signup...');
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword, company_website: 'https://acme.io' }),
  });
  const signupData: any = await signupRes.json();
  if (!signupData.success || !signupData.user) throw new Error('Signup failed: ' + (signupData.error || ''));
  console.log(`✅ Signup successful! User ID: ${signupData.user.id}, Verified: ${signupData.user.is_email_verified}`);

  // 3. Duplicate Email Signup Test
  console.log('3. Testing duplicate email signup...');
  const dupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
  });
  const dupData: any = await dupRes.json();
  if (dupRes.ok || dupData.success) throw new Error('Expected failure for duplicate email');
  console.log('✅ Duplicate email rejected with clear message:', dupData.error);

  // 4. Invalid Password Login Test
  console.log('4. Testing wrong password login security...');
  const wrongLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
  });
  const wrongLoginData: any = await wrongLoginRes.json();
  if (wrongLoginRes.ok || wrongLoginData.success) throw new Error('Expected failure for wrong password');
  console.log('✅ Wrong password rejected with non-specific message:', wrongLoginData.error);

  // 5. Valid Login Test
  console.log('5. Testing valid email/password login...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const loginCookie = loginRes.headers.get('set-cookie');
  const loginData: any = await loginRes.json();
  if (!loginData.success || !loginData.user) throw new Error('Login failed: ' + (loginData.error || ''));
  console.log(`✅ Login successful! Session token issued.`);

  // 6. Verify /api/auth/me session parity
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: { Cookie: loginCookie || '' },
  });
  const meData: any = await meRes.json();
  if (!meData.authenticated || !meData.user) throw new Error('Auth session verification failed');
  console.log(`✅ Session verified via /api/auth/me! User: ${meData.user.name} (${meData.user.email})`);

  console.log('🎉 ALL EMAIL/PASSWORD AUTH TESTS PASSED PERFECTLY!');
}

testEmailAuth().catch((err) => {
  console.error('❌ Email Auth Test Failed:', err);
  process.exit(1);
});
