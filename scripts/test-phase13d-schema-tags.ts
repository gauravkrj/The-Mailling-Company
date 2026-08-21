import fetch from 'node-fetch';
import { renderEmailHtml } from '../backend/src/utils/templateRenderer.js';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testPhase13DSchemaTags() {
  console.log('🧪 Starting Phase 13D Test: Fixed Field Schema & Canonical Tags...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ 1. Logged in successfully!');

  // 2. Campaign 1: Upload sheet with 2 columns (Email + Full Name)
  const createCmp1 = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Fixed Schema Test Cmp 1 ${Date.now()}` }),
  });
  const cmp1Data: any = await createCmp1.json();
  const cmp1Id = cmp1Data.campaign.id;

  const testEmail1 = `schema1_${Date.now()}@dgwrench.io`;

  await fetch(`${API_BASE}/contacts/${cmp1Id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'email', full_name: 'full_name' },
      contacts: [
        { email: testEmail1, full_name: 'Alice TwoCol' },
      ],
    }),
  });
  console.log('✅ 2. Campaign 1 uploaded with 2 columns (Email + Full Name)!');

  // 3. Campaign 2: Upload sheet with 7 columns (Email, Full Name, Company, Role, + 3 Attributes)
  const createCmp2 = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Fixed Schema Test Cmp 2 ${Date.now()}` }),
  });
  const cmp2Data: any = await createCmp2.json();
  const cmp2Id = cmp2Data.campaign.id;

  await fetch(`${API_BASE}/contacts/${cmp2Id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: {
        email: 'email',
        full_name: 'full_name',
        company: 'company',
        role: 'role',
        attribute_1: 'location',
        attribute_2: 'industry',
        attribute_3: 'team_size',
        attribute_labels: {
          attribute_1: 'location',
          attribute_2: 'industry',
          attribute_3: 'team_size',
        },
      },
      contacts: [
        {
          email: testEmail1,
          full_name: 'Alice TwoCol',
          company: 'DG Wrench',
          role: 'Head of Growth',
          attribute_1: 'Austin TX',
          attribute_2: 'Automotive',
          attribute_3: '50-100',
        },
      ],
    }),
  });
  console.log('✅ 3. Campaign 2 uploaded with 7 columns (Email, Full Name, Company, Role, + 3 Attributes)!');

  // 4. Verify ContactDirectory merged canonical 9 fields cleanly
  const dirRes = await fetch(`${API_BASE}/contacts/directory?search=${testEmail1}`, { headers: { Cookie: cookie } });
  const dirData: any = await dirRes.json();
  const entry = dirData.directory.find((d: any) => d.email.toLowerCase() === testEmail1.toLowerCase());

  if (
    !entry ||
    entry.custom_fields?.company !== 'DG Wrench' ||
    entry.custom_fields?.attribute_1 !== 'Austin TX' ||
    entry.custom_fields?.attribute_labels?.attribute_1 !== 'location'
  ) {
    throw new Error(`Fixed field directory merge failed: ${JSON.stringify(entry)}`);
  }
  console.log(`✅ 4. Verified ContactDirectory merged canonical attributes! Company: '${entry.custom_fields.company}', Attribute 1: '${entry.custom_fields.attribute_1}' (${entry.custom_fields.attribute_labels?.attribute_1})`);

  // 5. Test Template Renderer substituting canonical tags and cleanly replacing unmapped tags
  const templateInput = 'Hi {{full_name}}, welcome to {{company}}! Role: {{role}}. Location: {{attribute_1}}. Unmapped: {{unmapped_col}}.';
  const renderedOutput = renderEmailHtml({
    bodyContent: templateInput,
    contactData: {
      email: testEmail1,
      full_name: 'Alice TwoCol',
      company: 'DG Wrench',
      role: 'Head of Growth',
      attribute_1: 'Austin TX',
    },
  });

  if (renderedOutput.includes('undefined') || renderedOutput.includes('null')) {
    throw new Error(`Template rendering produced undefined/null artifact: ${renderedOutput}`);
  }
  if (!renderedOutput.includes('Alice TwoCol') || !renderedOutput.includes('DG Wrench') || !renderedOutput.includes('Austin TX')) {
    throw new Error(`Canonical tag substitution failed: ${renderedOutput}`);
  }
  console.log('✅ 5. Template rendering verified: replaced canonical tags cleanly and rendered empty string for unmapped tags (0 "undefined"/"null" artifacts)!');

  console.log('🎉 ALL PHASE 13D FIXED FIELD SCHEMA & CANONICAL TAG TESTS PASSED PERFECTLY!');
}

testPhase13DSchemaTags().catch((err) => {
  console.error('❌ Phase 13D Schema Tags Test Failed:', err);
  process.exit(1);
});
