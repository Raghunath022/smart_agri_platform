// Weather Service (OpenWeather + Regional Simulators)
const https = require('https');

/**
 * Gets weather conditions for given coordinates.
 * Falls back to regional simulated weather if API key is not present.
 */
function getWeather(lat, lon) {
  return new Promise((resolve) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return resolve(getSimulatedWeather(lat, lon));
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.main) {
            resolve({
              temperature: parseFloat(data.main.temp),
              humidity: parseFloat(data.main.humidity),
              rainfall: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) * 100 : Math.round(Math.random() * 50), // Approx daily rainfall scaled
              source: 'OpenWeather API'
            });
          } else {
            resolve(getSimulatedWeather(lat, lon));
          }
        } catch (e) {
          resolve(getSimulatedWeather(lat, lon));
        }
      });
    }).on('error', () => {
      resolve(getSimulatedWeather(lat, lon));
    });
  });
}

/**
 * Simulates weather data based on geographic location in India.
 * Higher latitude (North India) -> cooler/drier on average.
 * Southern latitude (South India) -> warmer/humid.
 * Western longitude (Rajasthan/Gujarat) -> hot/dry/low rainfall.
 * Eastern longitude (West Bengal/Assam) -> high humidity/high rainfall.
 */
function getSimulatedWeather(lat, lon) {
  // Center of India coordinates: ~21.7679, 78.8718
  const baseLat = parseFloat(lat) || 21.0;
  const baseLon = parseFloat(lon) || 79.0;

  // Temperature simulation: base 26C, decreases with higher latitude, increases with southern latitude
  let temp = 27.5 - (baseLat - 15) * 0.4;
  temp += (Math.random() - 0.5) * 4; // variance

  // Humidity: high near coast (low lat or near east/west borders), low in interior/west
  let humidity = 65;
  if (baseLon < 74) {
    // Thar desert zone
    humidity = 35 + (baseLat - 8) * 1.5;
  } else if (baseLon > 85 || baseLat < 13) {
    // Coastal or eastern zone
    humidity = 80 + (Math.random() - 0.5) * 10;
  } else {
    // Central Deccan plateau
    humidity = 55 + (Math.random() - 0.5) * 15;
  }

  // Rainfall: high in East (lon > 85), high in West Coast (lat < 16, lon < 74), low in West (lon < 73)
  let rainfall = 100;
  if (baseLon < 73) {
    rainfall = 20 + Math.random() * 30; // desert/arid
  } else if (baseLon > 85) {
    rainfall = 150 + Math.random() * 120; // high monsoon rainfall
  } else if (baseLat < 15 && baseLon < 75) {
    rainfall = 180 + Math.random() * 100; // western ghats
  } else {
    rainfall = 80 + Math.random() * 80; // moderate plains
  }

  // Bound variables
  temp = Math.max(10, Math.min(48, Math.round(temp * 10) / 10));
  humidity = Math.max(10, Math.min(100, Math.round(humidity)));
  rainfall = Math.max(0, Math.round(rainfall));

  return {
    temperature: temp,
    humidity: humidity,
    rainfall: rainfall,
    source: 'AgriAI Meteorologist (Simulated)'
  };
}

module.exports = {
  getWeather,
  getSimulatedWeather
};
