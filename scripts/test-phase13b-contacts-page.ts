import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';

async function testPhase13BContactsPage() {
  console.log('🧪 Starting Phase 13B Test: Contacts Page (View, Search, Export, Manage)...');

  // 1. Log in
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gauravjha485@gmail.com', password: 'raghubhai@007' }),
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('Login failed');
  console.log('✅ 1. Logged in successfully!');

  // 2. Populate directory by uploading campaign contacts
  const createCmp = await fetch(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: `Contacts Page Test Cmp ${Date.now()}` }),
  });
  const cmpData: any = await createCmp.json();
  const campaignId = cmpData.campaign.id;

  const testEmail1 = `page_test1_${Date.now()}@dgwrench.io`;
  const testEmail2 = `page_test2_${Date.now()}@dgwrench.io`;

  await fetch(`${API_BASE}/contacts/${campaignId}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      mapping: { email: 'email', name: 'name', company: 'company' },
      contacts: [
        { email: testEmail1, name: 'Gaurav PageTest', company: 'DG Wrench' },
        { email: testEmail2, name: 'Alice PageTest', company: 'TechCorp' },
      ],
    }),
  });
  console.log('✅ 2. Created campaign & populated contacts directory!');

  // 3. Test GET /api/contacts/directory with search and status filters
  const searchRes = await fetch(`${API_BASE}/contacts/directory?search=PageTest&status=all`, { headers: { Cookie: cookie } });
  const searchData: any = await searchRes.json();
  if (!searchData.success || searchData.count < 2) {
    throw new Error(`Search filter failed: ${JSON.stringify(searchData)}`);
  }
  console.log(`✅ 3. Searched directory: found ${searchData.count} matching contacts!`);

  // 4. Test GET /api/contacts/directory/:id for contact detail & send history
  const targetContact = searchData.directory.find((c: any) => c.email.toLowerCase() === testEmail1.toLowerCase());
  const detailRes = await fetch(`${API_BASE}/contacts/directory/${targetContact.id}`, { headers: { Cookie: cookie } });
  const detailData: any = await detailRes.json();
  if (!detailData.success || !detailData.contact) {
    throw new Error(`Contact detail fetch failed: ${JSON.stringify(detailData)}`);
  }
  console.log(`✅ 4. Fetched contact detail for ${testEmail1}! Full Name: '${detailData.contact.full_name}'`);

  // 5. Test Manual Suppression POST /api/contacts/directory/suppress
  const suppressRes = await fetch(`${API_BASE}/contacts/directory/suppress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      ids: [targetContact.id],
      reason: 'Manual support opt-out request',
    }),
  });
  const suppressData: any = await suppressRes.json();
  if (!suppressData.success || suppressData.count < 1) {
    throw new Error(`Manual suppression failed: ${JSON.stringify(suppressData)}`);
  }

  // Verify status updated to suppressed
  const checkSuppressedRes = await fetch(`${API_BASE}/contacts/directory?search=${testEmail1}&status=suppressed`, { headers: { Cookie: cookie } });
  const checkSuppressedData: any = await checkSuppressedRes.json();
  if (checkSuppressedData.count < 1) {
    throw new Error('Manual suppression status check failed');
  }
  console.log(`✅ 5. Manually suppressed ${testEmail1}! Verified status changed to 'suppressed'`);

  // 6. Test CSV Export GET /api/contacts/directory/export-csv
  const csvRes = await fetch(`${API_BASE}/contacts/directory/export-csv?status=all`, { headers: { Cookie: cookie } });
  const csvText = await csvRes.text();
  if (!csvText.includes('Email') || !csvText.includes(testEmail1)) {
    throw new Error(`CSV export failed: ${csvText.substring(0, 100)}`);
  }
  console.log('✅ 6. Exported CSV directory file successfully!');

  // 7. Test Manual Deletion POST /api/contacts/directory/delete
  const deleteRes = await fetch(`${API_BASE}/contacts/directory/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      ids: [targetContact.id],
    }),
  });
  const deleteData: any = await deleteRes.json();
  if (!deleteData.success || deleteData.deletedCount < 1) {
    throw new Error(`Manual deletion failed: ${JSON.stringify(deleteData)}`);
  }
  console.log(`✅ 7. Deleted contact ${testEmail1} from directory view cleanly!`);

  console.log('🎉 ALL PHASE 13B CONTACTS PAGE TESTS PASSED PERFECTLY!');
}

testPhase13BContactsPage().catch((err) => {
  console.error('❌ Phase 13B Contacts Page Test Failed:', err);
  process.exit(1);
});
