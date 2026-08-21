import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testReloginPersistence() {
  console.log('🧪 Starting Phase 10B Regression Test: Campaign Persistence on Re-Login...');

  // 1. Initial Login
  const loginRes = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
  const loginCookie = loginRes.headers.get('set-cookie');
  const loginData: any = await loginRes.json();
  if (!loginData.success) throw new Error('Failed initial login');
  const user = loginData.user;
  console.log(`✅ Logged in as user: ${user.name} (${user.email}) - ID: ${user.id}`);

  // 2. Create Campaign
  const campaignName = `Test Campaign ${Date.now()}`;
  const createRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: loginCookie || '',
    },
    body: JSON.stringify({ name: campaignName }),
  });
  const createData: any = await createRes.json();
  if (!createData.success) throw new Error('Failed to create test campaign');
  const campaignId = createData.campaign.id;
  console.log(`✅ Created test campaign: "${campaignName}" (ID: ${campaignId})`);

  // 3. Save Contacts & Draft
  await fetch(`${API_BASE}/contacts/${campaignId}/save-mapping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: loginCookie || '',
    },
    body: JSON.stringify({
      mapping: { email: 'Email Address', name: 'Full Name' },
      contacts: [{ 'Full Name': 'Test Lead', 'Email Address': 'lead@example.com' }],
    }),
  });

  await fetch(`${API_BASE}/campaigns/${campaignId}/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: loginCookie || '',
    },
    body: JSON.stringify({
      mode: 'fixed_template',
      format: 'plain_text',
      subject: 'Hello {{name}}',
      body_template: 'Hi {{name}}, this is a test.',
      plain_signature: 'Best regards,\nAlex',
    }),
  });
  console.log(`✅ Imported contacts & saved draft for campaign ${campaignId}`);

  // 4. Simulate Logout
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Cookie: loginCookie || '' },
  });
  console.log(`🚪 Simulated user logout.`);

  // 5. Simulate Re-Login with SAME account
  const reloginRes = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
  const reloginCookie = reloginRes.headers.get('set-cookie');
  const reloginData: any = await reloginRes.json();
  if (!reloginData.success) throw new Error('Failed re-login');
  const reloggedUser = reloginData.user;
  console.log(`🔑 Re-logged in as user: ${reloggedUser.name} (${reloggedUser.email}) - ID: ${reloggedUser.id}`);

  if (reloggedUser.id !== user.id) {
    throw new Error(`CRITICAL FAIL: User ID changed on re-login! Old: ${user.id}, New: ${reloggedUser.id}`);
  }

  // 6. Query Campaigns after Re-Login
  const listRes = await fetch(`${API_BASE}/campaigns`, {
    headers: { Cookie: reloginCookie || '' },
  });
  const listData: any = await listRes.json();
  if (!listData.success) throw new Error('Failed to fetch campaigns after re-login');

  const found = listData.campaigns.find((c: any) => c.id === campaignId);
  if (!found) {
    throw new Error(`CRITICAL FAIL: Campaign ${campaignId} disappeared on re-login! Total found: ${listData.campaigns.length}`);
  }

  console.log(`🎉 SUCCESS: Campaign "${found.name}" (ID: ${found.id}) persisted cleanly on re-login! Contacts: ${found.stats?.totalContacts || found._count?.contacts || 1}`);
}

testReloginPersistence().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
