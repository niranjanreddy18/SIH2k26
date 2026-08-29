import app from './server';
import http from 'http';
import crypto from 'crypto';

const PORT = 5099;
let server: http.Server;

async function runVerificationSuite() {
  server = app.listen(PORT, async () => {
    console.log(`\n=======================================================`);
    console.log(`🧪 Running SLIDMS Backend API Automated Verification Suite`);
    console.log(`=======================================================\n`);

    const baseUrl = `http://localhost:${PORT}`;

    try {
      // 1. Test Login (Investigator)
      console.log('▶ [1/8] Testing POST /auth/login (Investigator)...');
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'investigator@police.gov.in', password: 'Password123!' })
      });
      const loginData = await loginRes.json();
      console.log('   Response:', JSON.stringify(loginData));
      if (!loginData.success || !loginData.data.accessToken) throw new Error('Login failed');
      const invToken = loginData.data.accessToken;

      // 2. Test Login (Senior Officer)
      console.log('\n▶ [2/8] Testing POST /auth/login (Senior Officer)...');
      const snrLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'senior@police.gov.in', password: 'Password123!' })
      });
      const snrLoginData = await snrLoginRes.json();
      const snrToken = snrLoginData.data.accessToken;

      // 3. Test Create Case
      console.log('\n▶ [3/8] Testing POST /cases (Create Case)...');
      const caseRes = await fetch(`${baseUrl}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${invToken}`
        },
        body: JSON.stringify({
          firNumber: 'FIR-2026-TEST-99',
          title: 'Automated Integrity Test Case',
          crimeType: 'Cyber Hacking',
          classification: 'CONFIDENTIAL'
        })
      });
      const caseData = await caseRes.json();
      console.log('   Response:', JSON.stringify(caseData));
      const caseId = caseData.data.id;

      // 4. Test Document Upload
      console.log('\n▶ [4/8] Testing POST /cases/:caseId/documents (Upload Document)...');
      const docRes = await fetch(`${baseUrl}/cases/${caseId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${invToken}`
        },
        body: JSON.stringify({
          name: 'Forensic Memory Dump Log',
          type: 'FORENSIC_REPORT',
          classification: 'CONFIDENTIAL'
        })
      });
      const docData = await docRes.json();
      console.log('   Response:', JSON.stringify(docData));
      const docId = docData.data.id;

      // 5. Workflow State Transitions (Submit -> Approve -> Sign -> Lock)
      console.log('\n▶ [5/8] Testing Workflow Transitions (Submit -> Approve -> Sign -> Lock)...');
      await fetch(`${baseUrl}/documents/${docId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${invToken}` }
      });

      await fetch(`${baseUrl}/documents/${docId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${snrToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: 'Verified by Senior Officer.' })
      });

      await fetch(`${baseUrl}/documents/${docId}/sign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${snrToken}` }
      });

      const lockRes = await fetch(`${baseUrl}/documents/${docId}/lock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${snrToken}` }
      });
      const lockData = await lockRes.json();
      console.log('   Lock Response:', JSON.stringify(lockData));

      // 6. Verification Test (Initial status should be VERIFIED)
      console.log('\n▶ [6/8] Testing POST /documents/:id/verify (Pre-tamper verification)...');
      const verifyRes1 = await fetch(`${baseUrl}/documents/${docId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${invToken}` }
      });
      const verifyData1 = await verifyRes1.json();
      console.log('   Pre-tamper Result:', JSON.stringify(verifyData1));
      if (verifyData1.data.status !== 'VERIFIED') throw new Error('Expected status VERIFIED');

      // 7. Simulating Out-of-band File Tampering
      console.log('\n▶ [7/8] Simulating Out-of-Band File Modification on Storage Disk...');
      const tamperRes = await fetch(`${baseUrl}/documents/${docId}/tamper-demo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${invToken}` }
      });
      console.log('   Tamper Trigger Response:', await tamperRes.text());

      // 8. Verification Test (Post-tamper status must be MISMATCH!)
      console.log('\n▶ [8/8] Testing POST /documents/:id/verify (Post-tamper verification climax)...');
      const verifyRes2 = await fetch(`${baseUrl}/documents/${docId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${invToken}` }
      });
      const verifyData2 = await verifyRes2.json();
      console.log('   Post-tamper Result:', JSON.stringify(verifyData2));

      if (verifyData2.data.status === 'MISMATCH') {
        console.log('\n=======================================================');
        console.log('🎉 SUCCESS: TAMPER DETECTION VERIFIED END-TO-END!');
        console.log('   Registered Hash vs Modified Current Hash properly flagged MISMATCH!');
        console.log('=======================================================\n');
      } else {
        throw new Error('Tamper detection failed to flag MISMATCH!');
      }

    } catch (err: any) {
      console.error('\n❌ Verification Failed:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runVerificationSuite();

