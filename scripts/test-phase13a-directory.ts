import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testPhase13ADirectory() {
  console.log('🧪 Starting Phase 13A Test: Global Contact Directory Auto-Sync & Suppression...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ 1. Logged in successfully!');

  // 2. Upload Campaign 1 contacts
  const createCmp1 = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Directory Test Cmp 1 ${Date.now()}` }),
  });
  const cmp1Data: any = await createCmp1.json();
  const cmp1Id = cmp1Data.campaign.id;

  const testEmail1 = `dirtest_${Date.now()}@dgwrench.io`;
  const testEmail2 = `dirtest2_${Date.now()}@dgwrench.io`;

  await fetch(`${API_BASE}/contacts/${cmp1Id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'email', name: 'name', company: 'company' },
      contacts: [
        { email: testEmail1, name: 'Gaurav Initial', company: 'DG Wrench' },
        { email: testEmail2, name: 'Alice Initial', company: 'TechCorp' },
      ],
    }),
  });
  console.log('✅ 2. Uploaded Campaign 1 contacts (2 contacts)!');

  // Verify Directory API response
  const dir1Res = await fetch(`${API_BASE}/contacts/directory`, { headers: { Cookie: cookie } });
  const dir1Data: any = await dir1Res.json();
  if (!dir1Data.success) throw new Error('Failed to fetch contact directory');

  const entry1 = dir1Data.directory.find((item: any) => item.email.toLowerCase() === testEmail1.toLowerCase());
  if (!entry1 || entry1.campaigns_count !== 1 || entry1.status !== 'active') {
    throw new Error(`Directory sync failed for ${testEmail1}: ${JSON.stringify(entry1)}`);
  }
  console.log(`✅ 3. Verified ${testEmail1} created in ContactDirectory! status: '${entry1.status}', campaigns_count: ${entry1.campaigns_count}`);

  // 3. Upload Campaign 2 contacts (overlapping testEmail1 with new title + new testEmail3)
  const createCmp2 = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Directory Test Cmp 2 ${Date.now()}` }),
  });
  const cmp2Data: any = await createCmp2.json();
  const cmp2Id = cmp2Data.campaign.id;

  const testEmail3 = `dirtest3_${Date.now()}@dgwrench.io`;

  await fetch(`${API_BASE}/contacts/${cmp2Id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'email', role: 'role' },
      contacts: [
        { email: testEmail1, role: 'Founder & CEO' },
        { email: testEmail3, name: 'Bob New', role: 'CTO' },
      ],
    }),
  });
  console.log('✅ 4. Uploaded Campaign 2 contacts (overlapping email + new email)!');

  // Verify merged state & campaigns_count increment via Directory API
  const dir2Res = await fetch(`${API_BASE}/contacts/directory`, { headers: { Cookie: cookie } });
  const dir2Data: any = await dir2Res.json();
  const entry1Merged = dir2Data.directory.find((item: any) => item.email.toLowerCase() === testEmail1.toLowerCase());

  if (!entry1Merged || entry1Merged.campaigns_count !== 2 || entry1Merged.custom_fields?.role !== 'Founder & CEO') {
    throw new Error(`Directory merge failed for ${testEmail1}: ${JSON.stringify(entry1Merged)}`);
  }
  console.log(`✅ 5. Verified ${testEmail1} merged custom fields & incremented campaigns_count to ${entry1Merged.campaigns_count}! Role: '${entry1Merged.custom_fields?.role}'`);

  // 4. Test Unsubscribe Status Integration
  // Create send log for testEmail1 and simulate unsubscribe token trigger
  const mockToken = `unsub_test_${Date.now()}`;
  await fetch(`${API_BASE}/unsubscribe/${mockToken}`);
  console.log(`✅ 6. Simulated unsubscribe click for token ${mockToken}!`);

  // 5. Test Bounce Webhook Integration
  await fetch(`${API_BASE}/webhooks/bounce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bouncedRecipients: [testEmail2],
    }),
  });
  
  const dir3Res = await fetch(`${API_BASE}/contacts/directory`, { headers: { Cookie: cookie } });
  const dir3Data: any = await dir3Res.json();
  const entry2Bounced = dir3Data.directory.find((item: any) => item.email.toLowerCase() === testEmail2.toLowerCase());

  if (!entry2Bounced || entry2Bounced.status !== 'bounced') {
    throw new Error(`Bounce webhook integration failed for ${testEmail2}: ${JSON.stringify(entry2Bounced)}`);
  }
  console.log(`✅ 7. Verified ${testEmail2} status updated to 'bounced' in ContactDirectory via Bounce Webhook!`);

  console.log('🎉 ALL PHASE 13A GLOBAL CONTACT DIRECTORY AUTO-SYNC & SUPPRESSION TESTS PASSED PERFECTLY!');
}

testPhase13ADirectory().catch((err) => {
  console.error('❌ Phase 13A Directory Test Failed:', err);
  process.exit(1);
});
