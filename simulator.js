const http = require('http');
const https = require('https');
const readline = require('readline');

const API_URL = process.argv.includes('--cloud')
  ? 'https://smart-agri-platform-1.onrender.com/api/sensor-data'
  : 'http://localhost:10000/api/sensor-data';

// Simulation state: 'normal', 'heat', 'humidity', 'hypoxia', 'bioelectrical'
let currentState = 'normal';

function printMenu() {
  console.clear();
  console.log("============================================================");
  console.log("   Agri AI IoT Hardware Simulator (Node.js Edition)  ");
  console.log("============================================================");
  console.log("Interactive Stress Controls:");
  console.log("  [n] - Reset to NORMAL state");
  console.log("  [t] - Inject HEAT stress (High Temperature)");
  console.log("  [h] - Inject DRY stress (Low Humidity)");
  console.log("  [o] - Inject HYPOXIA stress (Low Dissolved Oxygen)");
  console.log("  [s] - Inject BIOELECTRICAL stress (High Stress status)");
  console.log("  [q] / [Ctrl+C] - Quit Simulator");
  console.log("------------------------------------------------------------");
  console.log(`Current Simulation State: ${currentState.toUpperCase()}`);
  console.log("============================================================");
  console.log("Press a key at any time to inject/change stress conditions...");
}

// Enable keypress reading in TTY
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

process.stdin.on('keypress', (str, key) => {
  if (key && (key.name === 'q' || (key.ctrl && key.name === 'c'))) {
    console.log('\n[SIMULATOR] Exiting...');
    process.exit();
  }

  const char = str ? str.toLowerCase() : '';
  if (['n', 't', 'h', 'o', 's'].includes(char)) {
    if (char === 'n') currentState = 'normal';
    if (char === 't') currentState = 'heat';
    if (char === 'h') currentState = 'humidity';
    if (char === 'o') currentState = 'hypoxia';
    if (char === 's') currentState = 'bioelectrical';
    
    printMenu();
    console.log(`\n[SIMULATOR] State changed to: ${currentState.toUpperCase()}`);
  }
});

function generateTelemetry(state) {
  const timestamp = new Date().toISOString();
  
  // Base normal values
  let temp = +(22 + Math.random() * 4).toFixed(1);
  let humidity = +(60 + Math.random() * 15).toFixed(1);
  let n = Math.floor(110 + Math.random() * 20);
  let p = Math.floor(25 + Math.random() * 10);
  let k = Math.floor(85 + Math.random() * 20);
  let do_mg = +(6.5 + Math.random()).toFixed(2);
  let voltage = Math.floor(45 + Math.random() * 10);
  let plant_status = "Healthy";
  
  if (state === 'heat') {
    temp = +(32 + Math.random() * 4).toFixed(1);
    voltage = Math.floor(30 + Math.random() * 12);
    plant_status = "Moderate Stress";
  } else if (state === 'humidity') {
    humidity = +(40 + Math.random() * 8).toFixed(1);
    voltage = Math.floor(35 + Math.random() * 10);
    plant_status = "Moderate Stress";
  } else if (state === 'hypoxia') {
    do_mg = +(3.5 + Math.random()).toFixed(2);
    voltage = Math.floor(20 + Math.random() * 9);
    plant_status = "High Stress";
  } else if (state === 'bioelectrical') {
    voltage = Math.floor(8 + Math.random() * 10);
    plant_status = "High Stress";
  }
  
  return {
    timestamp,
    temperature_humidity: {
      temperature_c: temp,
      humidity_percent: humidity
    },
    npk: {
      nitrogen_mg_kg: n,
      phosphorus_mg_kg: p,
      potassium_mg_kg: k
    },
    dissolved_oxygen: {
      do_mg_l: do_mg
    },
    bioelectrical: {
      voltage_mv: voltage,
      plant_status
    }
  };
}

function sendTelemetry() {
  const payload = generateTelemetry(currentState);
  const dataString = JSON.stringify(payload);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(dataString)
    }
  };

  const client = API_URL.startsWith('https') ? https : http;
  const req = client.request(API_URL, options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const parsed = JSON.parse(responseBody);
        console.log(`[${new Date().toLocaleTimeString()}] Sent Telemetry | State: ${currentState.toUpperCase()} | Temp: ${payload.temperature_humidity.temperature_c}°C | DO: ${payload.dissolved_oxygen.do_mg_l}mg/L | Status: ${payload.bioelectrical.plant_status} | Severity: ${parsed.analysis.severity}`);
      } else {
        console.error(`[ERROR] Server responded with code ${res.statusCode}: ${responseBody}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[ERROR] Connection failed: ${err.message}`);
  });

  req.write(dataString);
  req.end();
}

// Start simulator loop
printMenu();
setInterval(sendTelemetry, 5000);
