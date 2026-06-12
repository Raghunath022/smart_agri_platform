// Crop Recommendation ML Model using Nearest Centroid Classification
// Pre-calibrated centroids, means, and standard deviations from the standard crop dataset

// Means and Standard Deviations for normalization
const FEATURE_STATS = {
  N: { mean: 50.55, std: 36.91 },
  P: { mean: 53.36, std: 32.98 },
  K: { mean: 48.14, std: 50.64 },
  temperature: { mean: 25.61, std: 5.06 },
  humidity: { mean: 71.48, std: 22.26 },
  ph: { mean: 6.46, std: 0.77 },
  rainfall: { mean: 103.46, std: 54.95 }
};

// Raw Centroids (Unnormalized average values) for 22 crops
const CROP_CENTROIDS = {
  rice: { N: 80, P: 40, K: 40, temperature: 23, humidity: 82, ph: 6.4, rainfall: 236 },
  maize: { N: 77, P: 48, K: 20, temperature: 22, humidity: 65, ph: 6.2, rainfall: 75 },
  chickpea: { N: 40, P: 67, K: 80, temperature: 20, humidity: 16, ph: 7.3, rainfall: 80 },
  kidneybeans: { N: 20, P: 67, K: 20, temperature: 20, humidity: 21, ph: 5.7, rainfall: 105 },
  pigeonpeas: { N: 20, P: 67, K: 20, temperature: 27, humidity: 48, ph: 5.7, rainfall: 149 },
  mothbeans: { N: 21, P: 48, K: 20, temperature: 28, humidity: 53, ph: 6.8, rainfall: 51 },
  mungbean: { N: 20, P: 47, K: 20, temperature: 28, humidity: 85, ph: 6.7, rainfall: 48 },
  blackgram: { N: 40, P: 67, K: 20, temperature: 29, humidity: 65, ph: 7.1, rainfall: 67 },
  lentil: { N: 18, P: 68, K: 19, temperature: 24, humidity: 64, ph: 6.9, rainfall: 45 },
  pomegranate: { N: 18, P: 18, K: 40, temperature: 21, humidity: 90, ph: 6.4, rainfall: 107 },
  banana: { N: 100, P: 82, K: 50, temperature: 27, humidity: 80, ph: 5.9, rainfall: 104 },
  mango: { N: 20, P: 27, K: 30, temperature: 31, humidity: 50, ph: 5.7, rainfall: 94 },
  grapes: { N: 23, P: 132, K: 200, temperature: 23, humidity: 81, ph: 6.0, rainfall: 69 },
  watermelon: { N: 99, P: 17, K: 50, temperature: 25, humidity: 85, ph: 6.4, rainfall: 50 },
  muskmelon: { N: 100, P: 17, K: 50, temperature: 28, humidity: 92, ph: 6.3, rainfall: 24 },
  apple: { N: 20, P: 134, K: 200, temperature: 22, humidity: 92, ph: 5.9, rainfall: 112 },
  orange: { N: 19, P: 16, K: 10, temperature: 22, humidity: 92, ph: 7.0, rainfall: 110 },
  papaya: { N: 49, P: 59, K: 50, temperature: 33, humidity: 92, ph: 6.7, rainfall: 142 },
  coconut: { N: 21, P: 16, K: 30, temperature: 27, humidity: 96, ph: 5.9, rainfall: 175 },
  cotton: { N: 117, P: 46, K: 19, temperature: 23, humidity: 79, ph: 6.9, rainfall: 80 },
  jute: { N: 78, P: 46, K: 40, temperature: 24, humidity: 79, ph: 6.7, rainfall: 174 },
  coffee: { N: 101, P: 28, K: 30, temperature: 25, humidity: 58, ph: 6.7, rainfall: 158 }
};

// Helper function to normalize values
function normalize(val, mean, std) {
  return (val - mean) / std;
}

/**
 * Predicts the best crop given environmental conditions.
 * @param {Object} inputs - { N, P, K, temperature, humidity, ph, rainfall }
 * @returns {Object} { crop: String, scores: Array }
 */
function predictCrop(inputs) {
  // Normalize user inputs
  const normInput = {
    N: normalize(inputs.N, FEATURE_STATS.N.mean, FEATURE_STATS.N.std),
    P: normalize(inputs.P, FEATURE_STATS.P.mean, FEATURE_STATS.P.std),
    K: normalize(inputs.K, FEATURE_STATS.K.mean, FEATURE_STATS.K.std),
    temperature: normalize(inputs.temperature, FEATURE_STATS.temperature.mean, FEATURE_STATS.temperature.std),
    humidity: normalize(inputs.humidity, FEATURE_STATS.humidity.mean, FEATURE_STATS.humidity.std),
    ph: normalize(inputs.ph, FEATURE_STATS.ph.mean, FEATURE_STATS.ph.std),
    rainfall: normalize(inputs.rainfall, FEATURE_STATS.rainfall.mean, FEATURE_STATS.rainfall.std)
  };

  let bestCrop = null;
  let minDistance = Infinity;
  const list = [];

  // Calculate Euclidean distance to all centroids
  for (const [crop, centroid] of Object.entries(CROP_CENTROIDS)) {
    const normCentroid = {
      N: normalize(centroid.N, FEATURE_STATS.N.mean, FEATURE_STATS.N.std),
      P: normalize(centroid.P, FEATURE_STATS.P.mean, FEATURE_STATS.P.std),
      K: normalize(centroid.K, FEATURE_STATS.K.mean, FEATURE_STATS.K.std),
      temperature: normalize(centroid.temperature, FEATURE_STATS.temperature.mean, FEATURE_STATS.temperature.std),
      humidity: normalize(centroid.humidity, FEATURE_STATS.humidity.mean, FEATURE_STATS.humidity.std),
      ph: normalize(centroid.ph, FEATURE_STATS.ph.mean, FEATURE_STATS.ph.std),
      rainfall: normalize(centroid.rainfall, FEATURE_STATS.rainfall.mean, FEATURE_STATS.rainfall.std)
    };

    // Euclidean distance squared
    const distSq = 
      Math.pow(normInput.N - normCentroid.N, 2) +
      Math.pow(normInput.P - normCentroid.P, 2) +
      Math.pow(normInput.K - normCentroid.K, 2) +
      Math.pow(normInput.temperature - normCentroid.temperature, 2) +
      Math.pow(normInput.humidity - normCentroid.humidity, 2) +
      Math.pow(normInput.ph - normCentroid.ph, 2) +
      Math.pow(normInput.rainfall - normCentroid.rainfall, 2);

    const distance = Math.sqrt(distSq);
    
    // Scale distance to confidence score (1 / (1 + distance))
    const confidence = 1 / (1 + distance);

    list.push({ crop, distance, confidence });

    if (distance < minDistance) {
      minDistance = distance;
      bestCrop = crop;
    }
  }

  // Sort candidates by confidence
  list.sort((a, b) => b.confidence - a.confidence);

  return {
    crop: bestCrop,
    confidence: list[0].confidence,
    recommendations: list.slice(0, 3) // Return top 3 suggestions
  };
}

module.exports = {
  predictCrop,
  CROP_CENTROIDS
};
