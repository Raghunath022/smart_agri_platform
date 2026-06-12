// Integration Test for Agri AI Predict API
const http = require('http');

function postJSON(path, payload, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

async function runTest() {
  console.log('🧪 Starting API Integration Tests...\n');

  try {
    // 1. Authenticate (Login as seeded farmer)
    console.log('Step 1: Authenticating as seeded farmer (ram@agriai.com)...');
    const authRes = await postJSON('/api/auth/login', {
      email: 'ram@agriai.com',
      password: 'farmerpassword'
    });

    if (authRes.statusCode !== 200) {
      console.error('❌ Authentication Failed:', authRes.data);
      process.exit(1);
    }
    console.log(' ✅ Authentication Successful! Token retrieved.');
    const token = authRes.data.token;

    // 2. Call Predict Endpoint
    console.log('\nStep 2: Calling /api/predict with soil attributes...');
    const predRes = await postJSON('/api/predict', {
      N: 70,
      P: 45,
      K: 30,
      ph: 6.2,
      state: 'Tamil Nadu',
      district: 'Coimbatore'
    }, token);

    console.log(' - Status Code:', predRes.statusCode);
    if (predRes.statusCode !== 200) {
      console.error('❌ Prediction Failed:', predRes.data);
      process.exit(1);
    }

    console.log(' ✅ Prediction Endpoint Successful!');
    console.log(' - Recommended Crop:', predRes.data.recommendation.crop);
    console.log(' - Confidence:', (predRes.data.recommendation.confidence * 100).toFixed(1) + '%');
    console.log(' - Mandi Rate (Modal): ₹' + predRes.data.market.modal);
    console.log(' - Weather Forecast: Temp=' + predRes.data.weather.temperature + 'C, Rain=' + predRes.data.weather.rainfall + 'mm');
    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULY!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test encountered unexpected error:', err.message);
    process.exit(1);
  }
}

runTest();
