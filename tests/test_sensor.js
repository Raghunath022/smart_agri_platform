const http = require('http');

const testPayload = {
  timestamp: new Date().toISOString(),
  temperature_humidity: {
    temperature_c: 32.5, // should trigger TEMP_HIGH warning
    humidity_percent: 65.0
  },
  npk: {
    nitrogen_mg_kg: 120,
    phosphorus_mg_kg: 30,
    potassium_mg_kg: 95
  },
  dissolved_oxygen: {
    do_mg_l: 4.2 // should trigger DO_LOW critical alert
  },
  bioelectrical: {
    voltage_mv: 25,
    plant_status: "High Stress"
  }
};

const payloadStr = JSON.stringify(testPayload);

const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/api/sensor-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadStr)
  }
};

console.log('Sending test payload to backend...');
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Response Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
      const parsed = JSON.parse(data);
      console.log('Test PASSED. Analysis results:');
      console.log(JSON.stringify(parsed.analysis, null, 2));
    } else {
      console.error(`Test FAILED. Response: ${data}`);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('Connection failed. Make sure the backend server is running on port 10000.');
  console.error(err.message);
  process.exit(1);
});

req.write(payloadStr);
req.end();
