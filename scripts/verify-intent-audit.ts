async function test() {
  console.log('1. Testing /api/rag/ground with "i want to order one kg of sugar"...');
  const gRes = await fetch('http://localhost:3000/api/rag/ground', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userPrompt: 'i want to order one kg of sugar' })
  });
  const gData = await gRes.json();
  console.log('Grounding status:', gData.status);
  console.log('SKU:', gData.draft?.sku);
  console.log('Units:', gData.draft?.targetUnits);
  console.log('MaxBudgetUSD:', gData.draft?.maxBudgetUSD);

  console.log('\n2. Executing 1-Click PayPal Hold...');
  const aRes = await fetch('http://localhost:3000/api/autopilot/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: gData.draft.sku,
      customUnits: gData.draft.targetUnits,
      oneTimeMandateOverrideUSD: gData.draft.maxBudgetUSD,
      userPrompt: 'i want to order one kg of sugar'
    })
  });
  const aData = await aRes.json();
  console.log('Autopilot status:', aData.status);
  console.log('PayPal Order ID:', aData.paypalOrderId);
  console.log('Supplier:', aData.dealComparison?.recommendedDeal?.supplierName);
  console.log('Total:', '$' + aData.dealComparison?.recommendedDeal?.grossTotalUSD);
  console.log('Shield cleared:', aData.shieldVerdict?.clearedForPayment);

  console.log('\n3. Fetching AI Intent Audit Ledger records...');
  const auditRes = await fetch('http://localhost:3000/api/audit/records');
  const auditData = await auditRes.json();
  console.log('Audit records count:', auditData.records?.length);
  const latest = auditData.records?.[0];
  console.log('Latest Audit Record:');
  console.log('  ID:', latest?.id);
  console.log('  Original Prompt:', latest?.originalPrompt);
  console.log('  Business Goal:', latest?.businessGoal);
  console.log('  Why Reasoning:', latest?.whyReasoning?.sourcingRationalization);
  console.log('  Solvency Verification:', latest?.whyReasoning?.solvencyVerification);
  console.log('  Audit Hash:', latest?.auditHash?.slice(0, 24) + '...');

  console.log('\n4. Testing CSV Export...');
  const csvRes = await fetch('http://localhost:3000/api/audit/export/csv');
  const csvText = await csvRes.text();
  console.log('CSV Lines count:', csvText.split('\n').length);
}

test().catch(console.error);
