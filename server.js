// Express API Server for Agri AI SaaS Platform
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB, users, predictions } = require('./database');
const { createToken, authenticateToken, requireRole } = require('./auth');
const { predictCrop } = require('./services/ml');
const { getMarketPrice } = require('./services/market');
const { getWeather } = require('./services/weather');

const app = express();
const PORT = process.env.PORT || 10000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Sensor telemetry route integration
app.use('/api', require('./sensor_route'));

// Leaf disease scanner route integration
app.use('/api/disease', require('./disease_route'));

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    const newUser = await users.create({
      name,
      email: email.toLowerCase(),
      password, // In production, hash this password!
      role: role || 'farmer'
    });

    const token = createToken(newUser);
    res.status(201).json({
      token,
      user: {
        id: newUser.id || newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await users.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user);
    res.json({
      token,
      user: {
        id: user.id || user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crop Prediction Endpoint
app.post('/api/predict', authenticateToken, async (req, res) => {
  try {
    const { N, P, K, ph, lat, lon, state, district } = req.body;

    if (N === undefined || P === undefined || K === undefined || ph === undefined) {
      return res.status(400).json({ error: 'Soil parameters (N, P, K, pH) are required' });
    }

    if (isNaN(parseFloat(N)) || isNaN(parseFloat(P)) || isNaN(parseFloat(K)) || isNaN(parseFloat(ph))) {
      return res.status(400).json({ error: 'Soil parameters must be valid numeric values' });
    }

    // Determine latitude and longitude (fallback to central India if not provided)
    const latitude = lat || 21.0;
    const longitude = lon || 79.0;
    const selectedState = state || 'Uttar Pradesh';

    // 1. Fetch Weather Parameters
    const weather = await getWeather(latitude, longitude);

    // 2. Run Crop Recommendation Machine Learning Model
    const mlInputs = {
      N: parseFloat(N),
      P: parseFloat(P),
      K: parseFloat(K),
      temperature: weather.temperature,
      humidity: weather.humidity,
      ph: parseFloat(ph),
      rainfall: weather.rainfall
    };

    let mlOutput;
    try {
      const { exec } = require('child_process');
      const path = require('path');
      const scriptPath = path.join(__dirname, 'python', 'predict_crop.py');
      
      mlOutput = await new Promise((resolve, reject) => {
        exec(`python "${scriptPath}" '${JSON.stringify(mlInputs)}'`, (error, stdout, stderr) => {
          if (error) {
            console.error('Python Error:', error, stderr);
            reject(error);
            return;
          }
          try {
            const result = JSON.parse(stdout);
            if (result.error) return reject(new Error(result.error));
            resolve({
              crop: result.recommended_crop,
              confidence: result.confidence === "High" ? 0.92 : 0.65,
              recommendations: [result.recommended_crop]
            });
          } catch (e) {
            reject(e);
          }
        });
      });
    } catch (mlError) {
      console.warn("Python execution failed, falling back to local heuristic model.", mlError);
      const { predictCrop } = require('./services/ml');
      mlOutput = predictCrop(mlInputs);
    }

    // 3. Fetch eNAM Market Price for the recommended crop in that state
    const market = await getMarketPrice(selectedState, mlOutput.crop);

    // 4. Record prediction log in the database
    const predictionLog = await predictions.create({
      userId: req.user.id,
      inputs: { N, P, K, ph, temperature: weather.temperature, humidity: weather.humidity, rainfall: weather.rainfall },
      weather,
      market,
      recommendation: {
        crop: mlOutput.crop,
        confidence: mlOutput.confidence,
        alternatives: mlOutput.recommendations ? mlOutput.recommendations.slice(1) : []
      },
      state: selectedState,
      district: district || 'General'
    });

    res.json(predictionLog);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// History Endpoint
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const history = await predictions.find({ userId: req.user.id });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Weather proxy endpoint
app.get('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const weather = await getWeather(lat, lon);
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Market price proxy endpoint
app.get('/api/market', async (req, res) => {
  try {
    const { state, commodity } = req.query;
    if (!state || !commodity) {
      return res.status(400).json({ error: 'State and commodity parameters are required' });
    }
    const price = await getMarketPrice(state, commodity);
    res.json(price);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Market forecast proxy endpoint (ML ARIMA)
app.get('/api/market/forecast', async (req, res) => {
  try {
    const { state, commodity } = req.query;
    if (!state || !commodity) {
      return res.status(400).json({ error: 'State and commodity parameters are required' });
    }
    const { getMarketForecast } = require('./services/market');
    const forecast = await getMarketForecast(state, commodity);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Dashboard Analytics endpoint
app.get('/api/analytics', authenticateToken, requireRole(['admin', 'expert']), async (req, res) => {
  try {
    // Return summary statistics
    const allPredictions = await predictions.find();
    
    // Aggregations
    const cropCounts = {};
    const stateCounts = {};
    let totalConfidence = 0;

    allPredictions.forEach(pred => {
      const crop = pred.recommendation.crop;
      const state = pred.state || 'Unknown';
      cropCounts[crop] = (cropCounts[crop] || 0) + 1;
      stateCounts[state] = (stateCounts[state] || 0) + 1;
      totalConfidence += pred.recommendation.confidence;
    });

    const averageConfidence = allPredictions.length > 0 
      ? (totalConfidence / allPredictions.length) 
      : 0;

    // Yield forecasts (simulated calculation)
    const yieldForecasts = Object.entries(cropCounts).map(([crop, count]) => {
      // average tons per hectare simulated
      const avgYield = crop === 'rice' ? 3.6 : crop === 'maize' ? 2.8 : crop === 'cotton' ? 2.2 : 1.8;
      return {
        crop,
        predictionsCount: count,
        projectedYieldTons: Math.round(count * avgYield * 10) / 10
      };
    });

    res.json({
      totalPredictions: allPredictions.length,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
      cropDistribution: cropCounts,
      stateDistribution: stateCounts,
      yieldForecasts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server and connect DB
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Agri AI Server running on port ${PORT}`);
  });
}

start();
