import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';
const LOAD_TEST_CONTACT_COUNT = parseInt(process.env.LOAD_TEST_COUNT || '5000', 10);

async function runHighVolumeLoadTest() {
  console.log(`🚀 Starting Phase 8 Task 12 Load Test (${LOAD_TEST_CONTACT_COUNT.toLocaleString()} Synthetic Contacts)...`);
  const startTime = Date.now();

  // 1. Authenticate Demo Session
  const loginRes = await fetch(`${API_BASE}/auth/demo`, { method: 'POST' });
  const loginCookie = loginRes.headers.get('set-cookie');
  const loginData: any = await loginRes.json();
  if (!loginData.success) throw new Error('Failed load test auth login');
  console.log(`✅ Authenticated load test session as ${loginData.user.name}`);

  // 2. Create High-Volume Campaign
  const campaignName = `Load Test Campaign 5K (${new Date().toISOString()})`;
  const createRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: loginCookie || '',
    },
    body: JSON.stringify({ name: campaignName }),
  });
  const createData: any = await createRes.json();
  if (!createData.success) throw new Error('Failed to create load test campaign');
  const campaignId = createData.campaign.id;
  console.log(`✅ Created campaign: "${campaignName}" (ID: ${campaignId})`);

  // 3. Batch Generate Synthetic Contacts
  console.log(`⏳ Generating ${LOAD_TEST_CONTACT_COUNT.toLocaleString()} synthetic contacts in batch...`);
  const contacts: any[] = [];
  for (let i = 1; i <= LOAD_TEST_CONTACT_COUNT; i++) {
    contacts.push({
      'Full Name': `Synthetic Lead ${i}`,
      'Email Address': `lead_${i}@synthetic-test-domain.io`,
      Company: `Synthetic Corp ${Math.ceil(i / 10)}`,
      'Job Title': 'Director of Operations',
    });
  }

  // 4. Import Contacts via API in chunks of 1,000
  const importStart = Date.now();
  const CHUNK_SIZE = 1000;
  let totalImported = 0;

  for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
    const chunk = contacts.slice(i, i + CHUNK_SIZE);
    const importRes = await fetch(`${API_BASE}/contacts/${campaignId}/save-mapping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: loginCookie || '',
      },
      body: JSON.stringify({
        mapping: { email: 'Email Address', name: 'Full Name', company: 'Company', role: 'Job Title' },
        contacts: chunk,
      }),
    });
    const importData: any = await importRes.json();
    if (!importData.success) throw new Error('Failed to import contact chunk: ' + (importData.error || 'Unknown error'));
    totalImported += importData.importedCount;
  }

  const importTimeMs = Date.now() - importStart;
  console.log(`✅ Batch import of ${totalImported.toLocaleString()} contacts completed in ${(importTimeMs / 1000).toFixed(2)}s (${(totalImported / (importTimeMs / 1000)).toFixed(0)} contacts/sec)`);

  // 5. Save Draft
  await fetch(`${API_BASE}/campaigns/${campaignId}/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: loginCookie || '',
    },
    body: JSON.stringify({
      mode: 'fixed_template',
      format: 'plain_text',
      subject: 'Scalability benchmark for {{company}}',
      body_template: 'Hi {{full name}},\n\nTesting campaign pipeline under high volume.',
      plain_signature: 'Best regards,\nLoad Tester',
    }),
  });

  // 6. Query Queue Monitoring Endpoint (Task 6 Verification)
  const queueRes = await fetch(`${API_BASE}/admin/queues`, {
    headers: { Cookie: loginCookie || '' },
  });
  const queueData: any = await queueRes.json();
  console.log(`📊 Queue Monitoring Metrics:`, queueData.jobCounts || { status: 'Memory Queue' });

  const totalTimeMs = Date.now() - startTime;
  console.log(`🎉 HIGH-VOLUME LOAD TEST COMPLETED SUCCESSFULLY in ${(totalTimeMs / 1000).toFixed(2)}s!`);
}

runHighVolumeLoadTest().catch((err) => {
  console.error('❌ Load Test Error:', err);
  process.exit(1);
});
