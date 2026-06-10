const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing Login API...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin01',
      password: 'Demo@1234'
    });
    
    const token = loginRes.data.access_token;
    console.log('Login successful! Got token.');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('\nTesting Dashboard Stats API...');
    const statsRes = await axios.get('http://localhost:3000/api/dashboard/stats', { headers });
    console.log('Stats:', statsRes.data);
    
    console.log('\nTesting Intelligence Hub API (Repeat Offenders)...');
    const repeatRes = await axios.get('http://localhost:3000/api/criminals/repeat-offenders', { headers });
    console.log(`Found ${repeatRes.data.length} repeat offenders.`);
    if (repeatRes.data.length > 0) console.log('First offender:', repeatRes.data[0]);

    console.log('\nTesting Admin Audit API...');
    const auditRes = await axios.get('http://localhost:3000/api/audit', { headers });
    console.log(`Found ${auditRes.data.length} audit logs.`);

    console.log('\nAll APIs are working perfectly!');
  } catch (error) {
    console.error('API Test Failed:', error.response ? error.response.data : error.message);
  }
}

testAPI();
