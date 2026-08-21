import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testViewSentContent() {
  console.log('🧪 Starting Phase 10D Test: View Sent Email Content Per Campaign...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ Logged in successfully!');

  // 2. Create Campaign
  const campaignName = `Sent Content Test ${Date.now()}`;
  const createRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: campaignName }),
  });
  const createData: any = await createRes.json();
  const campaignId = createData.campaign.id;
  console.log(`✅ Created campaign: "${campaignName}" (${campaignId})`);

  // 3. Save 2 Contacts
  const contacts = [
    { email: 'alex@acme.io', name: 'Alex Rivera', company: 'Acme Corp', role: 'CMO', isValidEmail: true },
    { email: 'sarah@apex.tech', name: 'Sarah Connor', company: 'Apex Tech', role: 'CTO', isValidEmail: true },
  ];
  await fetch(`${API_BASE}/contacts/${campaignId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'Email', name: 'Full Name', company: 'Company Name', role: 'Role' },
      contacts,
    }),
  });
  console.log(`✅ Saved 2 test contacts!`);

  // 4. Save Draft Template
  await fetch(`${API_BASE}/campaigns/${campaignId}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mode: 'fixed_template',
      format: 'html',
      subject: 'Quick question regarding {{company}}',
      body_template: 'Hello {{full name}},\n\nI noticed your role as {{role}} at {{company}}.',
      plain_signature: 'Best regards,\nGaurav Jha',
    }),
  });
  console.log(`✅ Saved draft email template!`);

  // 5. Send Campaign
  const sendRes = await fetch(`${API_BASE}/campaigns/${campaignId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ sendingAccountId: 'demo_account_1' }),
  });
  const sendData: any = await sendRes.json();
  if (!sendData.success) throw new Error('Failed to send campaign');
  console.log(`✅ Enqueued sending pipeline! Sent count: ${sendData.sentCount}`);

  // 6. Query Analytics Logs & Per-Contact Sent Content
  const analyticsRes = await fetch(`${API_BASE}/analytics/${campaignId}/analytics`, {
    headers: { Cookie: cookie },
  });
  const analyticsData: any = await analyticsRes.json();
  const logs = analyticsData.data?.logs || [];
  if (logs.length !== 2) throw new Error(`Expected 2 send logs, found ${logs.length}`);

  for (const log of logs) {
    const contactId = log.contactId || log.id;
    const logRes = await fetch(`${API_BASE}/analytics/${campaignId}/contact-log/${contactId}`, {
      headers: { Cookie: cookie },
    });
    const logData: any = await logRes.json();
    if (!logData.success || !logData.log) throw new Error(`Failed to fetch contact log for ${log.email}`);

    const renderedSubject = logData.log.renderedSubject;
    const renderedBody = logData.log.renderedBody;

    if (log.email.includes('alex')) {
      if (!renderedSubject.includes('Acme Corp') || !renderedBody.includes('Alex Rivera')) {
        throw new Error(`Personalized substitution failed for Alex Rivera! Received: ${renderedBody}`);
      }
      console.log(`✅ Verified rendered sent content for Alex Rivera (Acme Corp)!`);
    } else if (log.email.includes('sarah')) {
      if (!renderedSubject.includes('Apex Tech') || !renderedBody.includes('Sarah Connor')) {
        throw new Error(`Personalized substitution failed for Sarah Connor! Received: ${renderedBody}`);
      }
      console.log(`✅ Verified rendered sent content for Sarah Connor (Apex Tech)!`);
    }
  }

  console.log('🎉 ALL PHASE 10D SENT EMAIL CONTENT VIEW TESTS PASSED PERFECTLY!');
}

testViewSentContent().catch((err) => {
  console.error('❌ View Sent Content Test Failed:', err);
  process.exit(1);
});
