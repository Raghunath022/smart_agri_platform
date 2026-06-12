const express = require('express');
const router = express.Router();
const { telemetry } = require('./database');

// ─── POST /api/sensor-data ───────────────────────────────────────────────────
// Receives data from the hardware / simulator
router.post('/sensor-data', async (req, res) => {
  const data = req.body;

  // Basic validation
  if (!data || !data.timestamp || !data.temperature_humidity) {
    return res.status(400).json({ error: 'Invalid or incomplete sensor payload' });
  }

  // Add server-received timestamp
  data.received_at = new Date().toISOString();

  // Analyse and attach suggestions
  data.analysis = analysePlantHealth(data);

  try {
    const saved = await telemetry.create(data);

    console.log(
      `[SENSOR] ${data.timestamp} | ` +
      `Temp: ${data.temperature_humidity.temperature_c}°C | ` +
      `Plant: ${data.bioelectrical?.plant_status} | ` +
      `Suggestion Code: ${data.analysis.primary_suggestion.code}`
    );

    res.status(200).json({ status: 'ok', analysis: data.analysis });
  } catch (err) {
    console.error('Error saving telemetry:', err);
    res.status(500).json({ error: 'Failed to save telemetry' });
  }
});


// ─── GET /api/sensor-data ────────────────────────────────────────────────────
// Frontend fetches this to display latest readings
router.get('/sensor-data', async (req, res) => {
  try {
    const history = await telemetry.find(100);
    const latest = history[history.length - 1] || null;
    res.json({ latest, history });
  } catch (err) {
    console.error('Error loading telemetry history:', err);
    res.status(500).json({ error: 'Failed to load telemetry history' });
  }
});


// ─── GET /api/sensor-data/latest ─────────────────────────────────────────────
router.get('/sensor-data/latest', async (req, res) => {
  try {
    const history = await telemetry.find(100);
    const latest = history[history.length - 1] || null;
    if (!latest) return res.status(404).json({ error: 'No data yet' });
    res.json(latest);
  } catch (err) {
    console.error('Error fetching latest telemetry:', err);
    res.status(500).json({ error: 'Failed to fetch latest telemetry' });
  }
});


// ─── Analysis / Suggestion Engine ────────────────────────────────────────────
function analysePlantHealth(data) {
  const suggestions = [];
  let severity = 'normal'; // normal | warning | critical

  const { temperature_c, humidity_percent } = data.temperature_humidity;
  const { nitrogen_mg_kg, phosphorus_mg_kg, potassium_mg_kg } = data.npk;
  const { do_mg_l } = data.dissolved_oxygen;
  const { voltage_mv, plant_status } = data.bioelectrical;

  // Temperature
  if (temperature_c > 30) {
    suggestions.push({ code: 'TEMP_HIGH', text: 'Temperature too high — improve ventilation or shade.' });
    severity = 'warning';
  } else if (temperature_c < 18) {
    suggestions.push({ code: 'TEMP_LOW', text: 'Temperature too low — consider warming the grow area.' });
    severity = 'warning';
  }

  // Humidity
  if (humidity_percent < 50) {
    suggestions.push({ code: 'HUMIDITY_LOW', text: 'Humidity low — increase misting or use a humidifier.' });
    severity = 'warning';
  } else if (humidity_percent > 85) {
    suggestions.push({ code: 'HUMIDITY_HIGH', text: 'Humidity too high — risk of fungal disease. Improve airflow.' });
    severity = 'warning';
  }

  // NPK
  if (nitrogen_mg_kg < 100) {
    suggestions.push({ code: 'NITROGEN_LOW', text: 'Nitrogen deficiency detected — apply nitrogen-rich fertiliser.' });
    severity = 'warning';
  }
  if (phosphorus_mg_kg < 20) {
    suggestions.push({ code: 'PHOSPHORUS_LOW', text: 'Low phosphorus — consider phosphate supplement.' });
    severity = 'warning';
  }
  if (potassium_mg_kg < 80) {
    suggestions.push({ code: 'POTASSIUM_LOW', text: 'Low potassium — apply potassium supplement to prevent wilting.' });
    severity = 'warning';
  }

  // Dissolved Oxygen
  if (do_mg_l < 5.0) {
    suggestions.push({ code: 'DO_LOW', text: 'Critical: Dissolved oxygen low — roots at risk of hypoxia. Aerate immediately.' });
    severity = 'critical';
  } else if (do_mg_l < 6.0) {
    suggestions.push({ code: 'DO_SLIGHTLY_LOW', text: 'Dissolved oxygen slightly low — check aeration pump.' });
    if (severity !== 'critical') severity = 'warning';
  }

  // Bioelectrical
  if (plant_status === 'High Stress') {
    suggestions.push({ code: 'BIO_HIGH_STRESS', text: 'Plant showing high bioelectrical stress — check all parameters urgently.' });
    severity = 'critical';
  } else if (plant_status === 'Moderate Stress') {
    suggestions.push({ code: 'BIO_MODERATE_STRESS', text: 'Plant under moderate stress — monitor closely.' });
    if (severity !== 'critical') severity = 'warning';
  }

  const primary_sugg = suggestions[0] || { code: 'HEALTHY', text: 'All parameters normal. Plant is healthy.' };

  return {
    severity,
    plant_status,
    primary_suggestion: primary_sugg,
    all_suggestions: suggestions.length > 0 ? suggestions : [{ code: 'HEALTHY', text: 'All parameters within healthy range.' }],
  };
}

// ─── Internal Auto-Simulation Loop (Runs always to keep telemetry alive) ─────
async function generateAutoTelemetry() {
  const timestamp = new Date().toISOString();
  // Generate random stable normal parameters
  const temp = +(22 + Math.random() * 4).toFixed(1);
  const humidity = +(60 + Math.random() * 15).toFixed(1);
  const n = Math.floor(110 + Math.random() * 20);
  const p = Math.floor(25 + Math.random() * 10);
  const k = Math.floor(85 + Math.random() * 20);
  const do_mg = +(6.5 + Math.random()).toFixed(2);
  const voltage = Math.floor(45 + Math.random() * 10);
  const plant_status = "Healthy";

  const payload = {
    timestamp,
    received_at: timestamp,
    temperature_humidity: { temperature_c: temp, humidity_percent: humidity },
    npk: { nitrogen_mg_kg: n, phosphorus_mg_kg: p, potassium_mg_kg: k },
    dissolved_oxygen: { do_mg_l: do_mg },
    bioelectrical: { voltage_mv: voltage, plant_status }
  };

  payload.analysis = analysePlantHealth(payload);

  try {
    await telemetry.create(payload);
  } catch (err) {
    console.error('Auto-simulation DB save failed:', err);
  }
}

// Generate 15 initial history readings immediately so charts look populated on startup
async function seedInitialTelemetry() {
  try {
    const existing = await telemetry.find(5);
    if (existing.length === 0) {
      console.log('[SENSOR] Seeding 15 initial sensor readings into database...');
      for (let i = 0; i < 15; i++) {
        await generateAutoTelemetry();
      }
    }
  } catch (err) {
    console.error('Error seeding initial telemetry:', err);
  }
}

seedInitialTelemetry();

// Auto-run every 5 seconds to keep the telemetry timeline ticking
setInterval(generateAutoTelemetry, 5000);

module.exports = router;
