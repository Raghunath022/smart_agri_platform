// eNAM (Agmarknet) Market Prices Service
const https = require('https');

// Mock mandi prices database for offline/fallback mode (prices in INR per Quintal)
const MOCK_MARKET_PRICES = {
  rice: { min: 2100, max: 2800, modal: 2450, unit: 'Quintal' },
  maize: { min: 1800, max: 2200, modal: 2050, unit: 'Quintal' },
  chickpea: { min: 4800, max: 5500, modal: 5200, unit: 'Quintal' },
  kidneybeans: { min: 7500, max: 9000, modal: 8200, unit: 'Quintal' },
  pigeonpeas: { min: 6000, max: 7800, modal: 7000, unit: 'Quintal' },
  mothbeans: { min: 5500, max: 6800, modal: 6100, unit: 'Quintal' },
  mungbean: { min: 6800, max: 8200, modal: 7500, unit: 'Quintal' },
  blackgram: { min: 6500, max: 8000, modal: 7200, unit: 'Quintal' },
  lentil: { min: 5800, max: 6600, modal: 6200, unit: 'Quintal' },
  pomegranate: { min: 8000, max: 15000, modal: 11000, unit: 'Quintal' },
  banana: { min: 1500, max: 3000, modal: 2200, unit: 'Quintal' },
  mango: { min: 4000, max: 12000, modal: 7500, unit: 'Quintal' },
  grapes: { min: 5000, max: 9000, modal: 7000, unit: 'Quintal' },
  watermelon: { min: 800, max: 1500, modal: 1100, unit: 'Quintal' },
  muskmelon: { min: 1200, max: 2200, modal: 1700, unit: 'Quintal' },
  apple: { min: 6000, max: 14000, modal: 9500, unit: 'Quintal' },
  orange: { min: 3500, max: 6000, modal: 4800, unit: 'Quintal' },
  papaya: { min: 1500, max: 2800, modal: 2100, unit: 'Quintal' },
  coconut: { min: 2500, max: 4000, modal: 3200, unit: 'Thousand Nuts' },
  cotton: { min: 6200, max: 7800, modal: 7100, unit: 'Quintal' },
  jute: { min: 4500, max: 5800, modal: 5100, unit: 'Quintal' },
  coffee: { min: 14000, max: 22000, modal: 18500, unit: 'Quintal' }
};

// State-wise price variance multipliers
const STATE_MULTIPLIERS = {
  'Punjab': 1.05,
  'Haryana': 1.03,
  'Uttar Pradesh': 0.98,
  'Tamil Nadu': 1.02,
  'Karnataka': 1.01,
  'Maharashtra': 0.99,
  'Madhya Pradesh': 0.95,
  'Gujarat': 1.00,
  'Bihar': 0.92,
  'West Bengal': 0.97
};

/**
 * Fetch market price for a commodity in a given state.
 * If API_KEY is set, it queries data.gov.in. Otherwise it returns a realistic mock value.
 */
function getMarketPrice(state, commodity) {
  return new Promise((resolve) => {
    const apiKey = process.env.DATA_GOV_IN_API_KEY;
    const cleanComm = commodity.toLowerCase().trim();

    if (!apiKey) {
      // Return simulated mock price
      return resolve(getMockPrice(state, cleanComm));
    }

    const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&filters[state]=${encodeURIComponent(state)}&filters[commodity]=${encodeURIComponent(commodity)}`;

    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.records && data.records.length > 0) {
            const record = data.records[0];
            resolve({
              commodity: commodity,
              state: state,
              min: parseFloat(record.min_price) || null,
              max: parseFloat(record.max_price) || null,
              modal: parseFloat(record.modal_price) || null,
              unit: 'Quintal',
              source: 'Agmarknet API'
            });
          } else {
            resolve(getMockPrice(state, cleanComm));
          }
        } catch (e) {
          resolve(getMockPrice(state, cleanComm));
        }
      });
    }).on('error', () => {
      resolve(getMockPrice(state, cleanComm));
    });
  });
}

function getMockPrice(state, commodity) {
  const basePrice = MOCK_MARKET_PRICES[commodity] || { min: 2000, max: 3000, modal: 2500, unit: 'Quintal' };
  const multiplier = STATE_MULTIPLIERS[state] || 1.0;

  return {
    commodity: commodity,
    state: state,
    min: Math.round(basePrice.min * multiplier),
    max: Math.round(basePrice.max * multiplier),
    modal: Math.round(basePrice.modal * multiplier),
    unit: basePrice.unit,
    source: 'Agmarknet (Simulated)'
  };
}

module.exports = {
  getMarketPrice,
  MOCK_MARKET_PRICES
};
