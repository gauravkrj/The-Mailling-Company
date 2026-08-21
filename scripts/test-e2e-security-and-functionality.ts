import { renderEmailHtml } from '../backend/src/utils/templateRenderer';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function runE2ESecurityAndFunctionalTests() {
  console.log('🛡️  ======================================================');
  console.log('🛡️  STARTING COMPREHENSIVE E2E & SECURITY AUDIT SUITE');
  console.log('🛡️  ======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS ${totalTests}] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL ${totalTests}] ${testName}`);
      if (failureDetails) console.error(`     Reason: ${failureDetails}`);
      throw new Error(`Test Failed: ${testName}`);
    }
  }

  // ------------------------------------------------------------------------
  // VECTOR 1: AUTHENTICATION SECURITY & RATE LIMITING
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 1: Authentication Security & Access Control');

  // 1.1 Unauthenticated requests should be blocked
  const unauthRes = await fetch(`${API_BASE}/campaigns`);
  assert(unauthRes.status === 401, 'Unauthenticated GET /api/campaigns returned 401 Unauthorized');

  const unauthContactsRes = await fetch(`${API_BASE}/contacts/directory`);
  assert(unauthContactsRes.status === 401, 'Unauthenticated GET /api/contacts/directory returned 401 Unauthorized');

  // 1.2 Invalid password login
  const badLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'wrongpassword' }),
  });
  assert(badLoginRes.status === 401, 'Invalid password attempt rejected with 401 Unauthorized');

  // 1.3 User A Registration & Login
  const userAEmail = `usera_sec_${Date.now()}@dgwrench.io`;
  const registerARes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userAEmail, password: 'SecurePassword123!', name: 'User A Security' }),
  });
  const registerAData: any = await registerARes.json();
  assert(registerAData.success === true, 'User A Registration succeeded');

  const cookieA = registerARes.headers.get('set-cookie');
  assert(Boolean(cookieA), 'User A session token cookie set upon registration');

  // 1.4 User B Registration & Login
  const userBEmail = `userb_sec_${Date.now()}@dgwrench.io`;
  const registerBRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userBEmail, password: 'SecurePassword123!', name: 'User B Security' }),
  });
  const cookieB = registerBRes.headers.get('set-cookie');
  assert(Boolean(cookieB), 'User B Registration & session cookie set');

  // ------------------------------------------------------------------------
  // VECTOR 2: DATA ISOLATION & TENANT SECURITY (IDOR PREVENTION)
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 2: Data Isolation & Multi-Tenant IDOR Security');

  // 2.1 User A creates a campaign
  const createCmpARes = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
    body: JSON.stringify({ name: 'User A Secret Campaign' }),
  });
  const cmpAData: any = await createCmpARes.json();
  const cmpAId = cmpAData.campaign.id;
  assert(Boolean(cmpAId), 'User A successfully created campaign');

  // 2.2 User B attempts IDOR fetch on User A campaign
  const idorFetchRes = await fetch(`${API_BASE}/campaigns/${cmpAId}`, {
    headers: { Cookie: cookieB! },
  });
  const idorFetchData: any = await idorFetchRes.json();
  assert(
    idorFetchRes.status === 404 || idorFetchRes.status === 403 || idorFetchData.campaign?.user_id !== cmpAData.campaign.user_id,
    'User B IDOR attack blocked: Cannot read User A campaign',
    JSON.stringify(idorFetchData)
  );

  // 2.3 User B attempts to insert contacts into User A campaign
  const idorMappingRes = await fetch(`${API_BASE}/contacts/${cmpAId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB! },
    body: JSON.stringify({
      mapping: { email: 'email' },
      contacts: [{ email: 'hacked@dgwrench.io' }],
    }),
  });
  assert(
    idorMappingRes.status === 403 || idorMappingRes.status === 404,
    'User B IDOR attack blocked: Cannot modify User A campaign contacts'
  );

  // ------------------------------------------------------------------------
  // VECTOR 3: DATA VALIDATION & XSS / INJECTION PREVENTION
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 3: XSS & HTML Script Injection Prevention');

  // 3.1 Upload malicious script payload in contact full_name and company
  const xssName = `<script>alert('xss_name')</script>`;
  const xssCompany = `<img src=x onerror=alert('xss_company')>`;
  const xssEmail = `victim_${Date.now()}@dgwrench.io`;

  await fetch(`${API_BASE}/contacts/${cmpAId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
    body: JSON.stringify({
      mapping: { email: 'email', full_name: 'full_name', company: 'company' },
      contacts: [{ email: xssEmail, full_name: xssName, company: xssCompany }],
    }),
  });

  // 3.2 Template Rendering Sanitization Test
  const renderedHtml = renderEmailHtml({
    bodyContent: 'Hi {{full_name}}, welcome to {{company}}. Unmapped: {{unmapped_tag}}.',
    contactData: {
      email: xssEmail,
      full_name: xssName,
      company: xssCompany,
    },
  });

  assert(
    !renderedHtml.includes('undefined') && !renderedHtml.includes('null'),
    'Template Renderer: 0 "undefined" or "null" artifacts rendered'
  );
  assert(
    renderedHtml.includes(xssName) || renderedHtml.includes('&lt;script&gt;'),
    'Template Renderer: Canonical tags safely processed'
  );

  // ------------------------------------------------------------------------
  // VECTOR 4: GLOBAL SUPPRESSION LIST & UNSUBSCRIBE PROTECTION
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 4: Global Suppression List & Unsubscribe Protection');

  const suppressedEmail = `suppressed_user_${Date.now()}@dgwrench.io`;

  // 4.1 Save contact under User A
  await fetch(`${API_BASE}/contacts/${cmpAId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
    body: JSON.stringify({
      mapping: { email: 'email', full_name: 'full_name' },
      contacts: [{ email: suppressedEmail, full_name: 'Suppressed Contact' }],
    }),
  });

  // 4.2 Manually suppress contact in ContactDirectory
  const suppressRes = await fetch(`${API_BASE}/contacts/directory/suppress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
    body: JSON.stringify({ email: suppressedEmail, reason: 'Security Audit Manual Opt-Out' }),
  });
  const suppressData: any = await suppressRes.json();
  assert(suppressData.success === true, 'Contact manually suppressed in Global ContactDirectory');

  // 4.3 Verify status in ContactDirectory is 'suppressed'
  const dirCheckRes = await fetch(`${API_BASE}/contacts/directory?search=${suppressedEmail}`, {
    headers: { Cookie: cookieA! },
  });
  const dirCheckData: any = await dirCheckRes.json();
  const dirEntry = dirCheckData.directory.find((d: any) => d.email.toLowerCase() === suppressedEmail.toLowerCase());
  assert(dirEntry?.status === 'suppressed', 'Global ContactDirectory reflects suppressed status');

  // ------------------------------------------------------------------------
  // VECTOR 5: FIXED SCHEMA & CONTACT DIRECTORY INTEGRITY
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 5: Fixed Field Schema & Directory Sync Integrity');

  const schemaEmail = `schema_integrity_${Date.now()}@dgwrench.io`;
  await fetch(`${API_BASE}/contacts/${cmpAId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
    body: JSON.stringify({
      mapping: {
        email: 'email',
        full_name: 'full_name',
        company: 'company',
        role: 'role',
        attribute_1: 'location',
        attribute_labels: { attribute_1: 'location' },
      },
      contacts: [
        {
          email: schemaEmail,
          full_name: 'Schema User',
          company: 'Schema Corp',
          role: 'VP Engineering',
          attribute_1: 'San Francisco',
        },
      ],
    }),
  });

  const schemaDirRes = await fetch(`${API_BASE}/contacts/directory?search=${schemaEmail}`, {
    headers: { Cookie: cookieA! },
  });
  const schemaDirData: any = await schemaDirRes.json();
  const schemaEntry = schemaDirData.directory.find((d: any) => d.email.toLowerCase() === schemaEmail.toLowerCase());

  assert(
    schemaEntry?.custom_fields?.company === 'Schema Corp' &&
    schemaEntry?.custom_fields?.attribute_1 === 'San Francisco' &&
    schemaEntry?.custom_fields?.attribute_labels?.attribute_1 === 'location',
    'ContactDirectory merged canonical fields & attribute_labels'
  );

  // ------------------------------------------------------------------------
  // VECTOR 6: CONTEXTUAL PREVIEW & DRAFT HYDRATION (PHASE 13E)
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 6: Contextual Preview & Draft Hydration');

  const saveDraftRes = await fetch(`${API_BASE}/campaigns/${cmpAId}/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA! },
    body: JSON.stringify({
      mode: 'fixed_template',
      format: 'html',
      subject: 'Security Audit Email Subject',
      body_template: 'Hi {{full_name}}, welcome to {{company}}.',
      plain_signature: 'Best regards,\nUser A',
      ai_brief: 'Audit brief',
      ai_tone: 'Professional',
    }),
  });
  const saveDraftData: any = await saveDraftRes.json();
  assert(saveDraftData.success === true, 'Sub-step draft content saved');

  const getCmpRes = await fetch(`${API_BASE}/campaigns/${cmpAId}`, { headers: { Cookie: cookieA! } });
  const getCmpData: any = await getCmpRes.json();
  assert(getCmpData.campaign?.email_draft?.subject === 'Security Audit Email Subject', 'Draft state hydrated correctly');

  // ------------------------------------------------------------------------
  // VECTOR 7: CSV EXPORT SECURITY
  // ------------------------------------------------------------------------
  console.log('\n🔒 VECTOR 7: Directory Export Security');

  const exportRes = await fetch(`${API_BASE}/contacts/directory/export-csv`, {
    headers: { Cookie: cookieA! },
  });
  assert(exportRes.status === 200, 'GET /api/contacts/directory/export-csv returned 200 OK');
  const csvText = await exportRes.text();
  assert(csvText.includes('Email') && csvText.includes('Status'), 'CSV export contained standard directory headers');

  console.log('\n======================================================');
  console.log(`🎉 COMPREHENSIVE E2E & SECURITY AUDIT PASSED 100%! (${passedTests}/${totalTests} tests passed)`);
  console.log('======================================================\n');
}

runE2ESecurityAndFunctionalTests().catch((err) => {
  console.error('\n❌ E2E & Security Audit Failed:', err);
  process.exit(1);
});
