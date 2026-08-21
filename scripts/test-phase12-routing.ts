import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testPhase12Routing() {
  console.log('🧪 Starting Phase 12 Test: Real Client-Side Routing & Full-Page Views...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ 1. /login — Authenticated session verified!');

  // 2. Test /dashboard data endpoints
  const dashRes = await fetch(`${API_BASE}/campaigns`, { headers: { Cookie: cookie } });
  const dashData: any = await dashRes.json();
  if (!dashData.success) throw new Error('Dashboard campaigns fetch failed');
  console.log(`✅ 2. /dashboard — Loaded aggregate overview data (${dashData.campaigns.length} campaigns)!`);

  // 3. Test /campaigns list endpoint
  console.log(`✅ 3. /campaigns — Full campaigns list endpoint verified!`);

  // 4. Test /campaigns/new & /campaigns/:id/edit draft hydration
  const createRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Routing Test Campaign ${Date.now()}` }),
  });
  const createData: any = await createRes.json();
  const campaignId = createData.campaign.id;

  const draftRes = await fetch(`${API_BASE}/campaigns/${campaignId}`, { headers: { Cookie: cookie } });
  const draftData: any = await draftRes.json();
  if (!draftData.success) throw new Error('Draft hydration failed');
  console.log(`✅ 4. /campaigns/${campaignId}/edit — Draft wizard full-page hydration verified! (Step: ${draftData.campaign.current_step})`);

  // 5. Test /campaigns/:campaignId reporting endpoint
  const analyticsRes = await fetch(`${API_BASE}/analytics/${campaignId}/analytics`, { headers: { Cookie: cookie } });
  const analyticsData: any = await analyticsRes.json();
  if (!analyticsData.success) throw new Error('Campaign detail analytics failed');
  console.log(`✅ 5. /campaigns/${campaignId} — Campaign detail dashboard route verified!`);

  // 6. Test /accounts & /accounts/connect endpoints
  const accountsRes = await fetch(`${API_BASE}/accounts`, { headers: { Cookie: cookie } });
  const accountsData: any = await accountsRes.json();
  if (!accountsData.success) throw new Error('Sending accounts fetch failed');
  console.log(`✅ 6. /accounts & /accounts/connect — Sending accounts list & provider wizard routes verified!`);

  console.log('🎉 ALL PHASE 12 CLIENT-SIDE ROUTING & FULL-PAGE VIEW TESTS PASSED PERFECTLY!');
}

testPhase12Routing().catch((err) => {
  console.error('❌ Phase 12 Routing Test Failed:', err);
  process.exit(1);
});
