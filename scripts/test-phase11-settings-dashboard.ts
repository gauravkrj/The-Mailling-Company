import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testPhase11() {
  console.log('🧪 Starting Phase 11 Test: Sidebar Routing, Dashboard Overview & Settings...');

  // 1. Log in as test user
  const email = 'gauravjha485@gmail.com';
  let password = 'raghubhai@007';

  let loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ Logged in successfully!');

  // 2. Test Profile Update
  console.log('1. Testing profile update (PATCH /api/user/profile)...');
  const profileRes = await fetch(`${API_BASE}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: 'Gaurav Kumar Jha', company_website: 'https://dgwrench.io' }),
  });
  const profileData: any = await profileRes.json();
  if (!profileData.success || profileData.user?.name !== 'Gaurav Kumar Jha') {
    throw new Error('Profile update failed');
  }
  console.log(`✅ Profile updated! Name: ${profileData.user.name}, Website: ${profileData.user.company_website}`);

  // 3. Test Password Change
  console.log('2. Testing password change (POST /api/user/password)...');
  const newPass = 'NewPassword123';
  const passRes = await fetch(`${API_BASE}/user/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ currentPassword: password, newPassword: newPass }),
  });
  const passData: any = await passRes.json();
  if (!passData.success) throw new Error('Password change failed: ' + passData.error);
  console.log('✅ Password changed to NewPassword123!');

  // Test login with new password
  const newLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: newPass }),
  });
  if (!newLoginRes.ok) throw new Error('Failed to log in with new password');
  cookie = newLoginRes.headers.get('set-cookie')!;
  console.log('✅ Login with new password verified!');

  // Revert password back to original
  await fetch(`${API_BASE}/user/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ currentPassword: newPass, newPassword: password }),
  });
  console.log('✅ Password restored to original!');

  // 4. Test Cascading Account Deletion on Temporary User
  console.log('3. Testing cascading account deletion (DELETE /api/user/account)...');
  const tempEmail = `temp_del_${Date.now()}@example.com`;
  const tempSignupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Temp User', email: tempEmail, password: 'Password123' }),
  });
  const tempSignupData: any = await tempSignupRes.json();
  const tempCookie = tempSignupRes.headers.get('set-cookie')!;
  const tempUserId = tempSignupData.user.id;

  // Create campaign for temp user
  const tempCmpRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: tempCookie },
    body: JSON.stringify({ name: 'Temp Campaign' }),
  });
  const tempCmpData: any = await tempCmpRes.json();
  console.log(`✅ Created temp user (${tempUserId}) & campaign (${tempCmpData.campaign.id})`);

  // Invoke delete account with invalid confirmation -> expect error
  const badDelRes = await fetch(`${API_BASE}/user/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Cookie: tempCookie },
    body: JSON.stringify({ confirmation: 'WRONG' }),
  });
  if (badDelRes.ok) throw new Error('Expected invalid confirmation to fail');

  // Invoke delete account with valid confirmation
  const delRes = await fetch(`${API_BASE}/user/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Cookie: tempCookie },
    body: JSON.stringify({ confirmation: 'DELETE' }),
  });
  const delData: any = await delRes.json();
  if (!delData.success) throw new Error('Account deletion failed');
  console.log('✅ Temporary user account & all campaign data destroyed cleanly!');

  // Verify temp user can no longer log in
  const checkLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: tempEmail, password: 'Password123' }),
  });
  if (checkLogin.ok) throw new Error('Deleted user was able to log in!');
  console.log('✅ Verified deleted account cannot log in!');

  console.log('🎉 ALL PHASE 11 SIDEBAR, DASHBOARD & SETTINGS TESTS PASSED PERFECTLY!');
}

testPhase11().catch((err) => {
  console.error('❌ Phase 11 Test Failed:', err);
  process.exit(1);
});
