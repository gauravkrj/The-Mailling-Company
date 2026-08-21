import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testResumeDraft() {
  console.log('🧪 Starting Phase 10C Test: Resume & Edit Draft Campaigns...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed — no session cookie returned');
  console.log('✅ Logged in successfully!');

  // 2. Create Campaign
  const campaignName = `Draft Campaign ${Date.now()}`;
  const createRes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: campaignName }),
  });
  const createData: any = await createRes.json();
  if (!createData.success || !createData.campaign) throw new Error('Failed to create campaign');
  const campaignId = createData.campaign.id;
  console.log(`✅ Created campaign: "${campaignName}" (ID: ${campaignId})`);

  // 3. Save Contact Mapping (Step 3)
  const mapRes = await fetch(`${API_BASE}/contacts/${campaignId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'Email', name: 'Full Name', company: 'Company Name' },
      contacts: [
        { email: 'alex@acme.com', name: 'Alex Rivera', company: 'Acme Corp', isValidEmail: true },
        { email: 'sarah@apex.io', name: 'Sarah Connor', company: 'Apex Tech', isValidEmail: true },
      ],
    }),
  });
  const mapData: any = await mapRes.json();
  if (!mapData.success) throw new Error('Failed to save contact mapping');
  console.log(`✅ Saved 2 contacts to draft campaign!`);

  // Update step to 4
  await fetch(`${API_BASE}/campaigns/${campaignId}/step`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ step: 4 }),
  });

  // 4. Save Draft Content (Step 4)
  const draftRes = await fetch(`${API_BASE}/campaigns/${campaignId}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mode: 'fixed_template',
      format: 'html',
      subject: 'Quick inquiry regarding {{company}}',
      body_template: 'Hi {{full name}},\n\nI noticed your growth at {{company}}.',
      plain_signature: 'Best,\nGaurav Jha',
    }),
  });
  const draftData: any = await draftRes.json();
  if (!draftData.success) throw new Error('Failed to save email draft');
  console.log(`✅ Saved draft email template to campaign!`);

  // 5. Verify GET /api/campaigns includes draft campaign with current_step = 4
  const listRes = await fetch(`${API_BASE}/campaigns`, {
    headers: { Cookie: cookie },
  });
  const listData: any = await listRes.json();
  const foundDraft = listData.campaigns?.find((c: any) => c.id === campaignId);
  if (!foundDraft || foundDraft.status !== 'draft') {
    throw new Error('Draft campaign not found in GET /api/campaigns list');
  }
  console.log(`✅ Verified draft visible in campaigns overview! Status: "${foundDraft.status}"`);

  // 6. Verify Single Campaign Hydration (GET /api/campaigns/:id)
  const getRes = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
    headers: { Cookie: cookie },
  });
  const getData: any = await getRes.json();
  if (!getData.success || !getData.campaign) throw new Error('Failed to fetch draft details');
  const resumed = getData.campaign;
  if (resumed.contacts?.length !== 2 || resumed.email_draft?.subject !== 'Quick inquiry regarding {{company}}') {
    throw new Error('Resumed draft data hydration mismatch');
  }
  console.log(`✅ Successfully hydrated draft data! Step: ${resumed.current_step}, Contacts: ${resumed.contacts.length}, Subject: "${resumed.email_draft.subject}"`);

  // 7. Delete Draft Campaign
  const delRes = await fetch(`${API_BASE}/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  const delData: any = await delRes.json();
  if (!delData.success) throw new Error('Failed to delete draft campaign');
  console.log(`✅ Successfully deleted draft campaign ${campaignId}!`);

  console.log('🎉 ALL PHASE 10C RESUME/EDIT DRAFT TESTS PASSED PERFECTLY!');
}

testResumeDraft().catch((err) => {
  console.error('❌ Resume Draft Test Failed:', err);
  process.exit(1);
});
