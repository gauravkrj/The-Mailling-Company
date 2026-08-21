import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testPhase13EContextualPreview() {
  console.log('🧪 Starting Phase 13E Test: Contextual Preview & Sub-Step Flow...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ 1. Logged in successfully!');

  // 2. Create test campaign & save contacts
  const createCmp = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Contextual Preview Test ${Date.now()}` }),
  });
  const cmpData: any = await createCmp.json();
  const cmpId = cmpData.campaign.id;

  const testEmail = `substep_${Date.now()}@dgwrench.io`;

  await fetch(`${API_BASE}/contacts/${cmpId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'email', full_name: 'full_name', company: 'company' },
      contacts: [
        { email: testEmail, full_name: 'Substep User', company: 'Substep Corp' },
      ],
    }),
  });
  console.log('✅ 2. Campaign created & contacts saved!');

  // 3. Test Sub-step 1: AI Personalization Sample Preview Endpoint
  const aiPrevRes = await fetch(`${API_BASE}/campaigns/${cmpId}/preview-personalization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      prompt: 'Friendly intro pitch for {{company}}',
      tone: 'Friendly',
      sampleContact: { name: 'Substep User', company: 'Substep Corp', role: 'CTO' },
      subject: 'Quick question for {{company}}',
      body: 'Hi {{full_name}}, love what {{company}} is building.',
      format: 'html',
    }),
  });
  const aiPrevData: any = await aiPrevRes.json();
  if (!aiPrevData.success || !aiPrevData.preview?.body) {
    throw new Error(`AI personalization preview failed: ${JSON.stringify(aiPrevData)}`);
  }
  console.log('✅ 3. Sub-step 1: Generated on-demand inline AI sample preview successfully!');

  // 4. Save Draft Content (Sub-step 1 -> Sub-step 2 data persistence)
  const saveDraftRes = await fetch(`${API_BASE}/campaigns/${cmpId}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mode: 'ai_personalized',
      format: 'html',
      subject: 'Contextual Preview Test Subject {{company}}',
      body_template: 'Hi {{full_name}}, welcome to Phase 13E.',
      plain_signature: 'Best regards,\nGaurav Jha',
      ai_brief: 'Pitch for {{company}}',
      ai_tone: 'Professional',
    }),
  });
  const saveDraftData: any = await saveDraftRes.json();
  if (!saveDraftData.success) {
    throw new Error(`Draft save failed: ${JSON.stringify(saveDraftData)}`);
  }
  console.log('✅ 4. Sub-step 1 -> Sub-step 2 draft saved successfully!');

  // 5. Verify Campaign Draft Hydration
  const getCmpRes = await fetch(`${API_BASE}/campaigns/${cmpId}`, { headers: { Cookie: cookie } });
  const getCmpData: any = await getCmpRes.json();
  const draft = getCmpData.campaign.email_draft;

  if (
    !draft ||
    draft.subject !== 'Contextual Preview Test Subject {{company}}' ||
    draft.mode !== 'ai_personalized'
  ) {
    throw new Error(`Campaign draft hydration mismatch: ${JSON.stringify(draft)}`);
  }
  console.log('✅ 5. Verified campaign draft state hydration & data persistence across sub-steps!');

  console.log('🎉 ALL PHASE 13E CONTEXTUAL PREVIEW TESTS PASSED PERFECTLY!');
}

testPhase13EContextualPreview().catch((err) => {
  console.error('❌ Phase 13E Test Failed:', err);
  process.exit(1);
});
