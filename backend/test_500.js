const axios = require('axios');

async function test() {
  const login = await axios.post('http://localhost:3000/api/auth/login', {username: 'admin01', password: 'Demo@1234'});
  const token = login.data.access_token;
  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    '/api/cases',
    '/api/fir',
    '/api/criminals',
    '/api/criminals/network',
    '/api/dashboard/analytics',
    '/api/dashboard/crime-trends'
  ];

  for (const ep of endpoints) {
    try {
      await axios.get(`http://localhost:3000${ep}`, { headers });
      console.log(`✅ ${ep} worked`);
    } catch (e) {
      console.log(`❌ ${ep} failed: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
    }
  }
}

test();
