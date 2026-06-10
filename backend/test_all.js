const axios = require('axios');

async function test() {
  try {
    const login = await axios.post('http://localhost:3000/api/auth/login', {username: 'admin01', password: 'Demo@1234'});
    const token = login.data.access_token;
    const headers = { Authorization: `Bearer ${token}` };

    const endpoints = [
      '/api/dashboard/stats',
      '/api/dashboard/crime-trends',
      '/api/dashboard/officer-workload',
      '/api/cases',
      '/api/cases/1',
      '/api/cases/1/timeline',
      '/api/fir',
      '/api/criminals',
      '/api/evidence?case_id=1',
      '/api/officers',
      '/api/audit'
    ];

    for (const ep of endpoints) {
      try {
        await axios.get(`http://localhost:3000${ep}`, { headers });
        console.log(`✅ ${ep} worked`);
      } catch (e) {
        console.log(`❌ ${ep} failed: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
      }
    }
  } catch (e) {
    console.error("Login failed", e.message);
  }
}

test();
