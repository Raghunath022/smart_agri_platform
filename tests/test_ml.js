// Unit Test for Crop Recommendation ML Service
const { predictCrop } = require('../services/ml');

const testCases = [
  {
    name: 'Rice (High moisture, high rainfall)',
    inputs: { N: 85, P: 42, K: 41, temperature: 24, humidity: 83, ph: 6.5, rainfall: 240 },
    expectedCrop: 'rice'
  },
  {
    name: 'Maize (Moderate parameters)',
    inputs: { N: 75, P: 50, K: 22, temperature: 21, humidity: 62, ph: 6.0, rainfall: 72 },
    expectedCrop: 'maize'
  },
  {
    name: 'Chickpea (Low humidity, high K/P)',
    inputs: { N: 38, P: 68, K: 82, temperature: 19, humidity: 15, ph: 7.2, rainfall: 78 },
    expectedCrop: 'chickpea'
  },
  {
    name: 'Grapes (Extremely high K and P)',
    inputs: { N: 22, P: 130, K: 202, temperature: 22, humidity: 82, ph: 5.9, rainfall: 68 },
    expectedCrop: 'grapes'
  }
];

console.log('🧪 Running ML Prediction Model Tests...\n');

let passed = 0;
testCases.forEach((tc, idx) => {
  console.log(`Test Case ${idx + 1}: ${tc.name}`);
  const result = predictCrop(tc.inputs);
  
  console.log(` - Inputs: N=${tc.inputs.N}, P=${tc.inputs.P}, K=${tc.inputs.K}, rain=${tc.inputs.rainfall}mm`);
  console.log(` - Predicted Crop: ${result.crop} (Confidence: ${(result.confidence * 100).toFixed(1)}%)`);
  
  if (result.crop === tc.expectedCrop) {
    console.log(' ✅ PASSED');
    passed++;
  } else {
    console.log(` ❌ FAILED (Expected: ${tc.expectedCrop}, Got: ${result.crop})`);
  }
  console.log(' - Alternatives recommended:', result.recommendations.slice(1).map(r => `${r.crop} (${(r.confidence * 100).toFixed(1)}%)`).join(', '));
  console.log('--------------------------------------------------');
});

console.log(`📊 Result: ${passed}/${testCases.length} tests passed.`);
if (passed === testCases.length) {
  console.log('\n🎉 ALL ML TESTS PASSED SUCCESSFULY!');
  process.exit(0);
} else {
  console.log('\n⚠️ SOME TESTS FAILED. Verify centroid coordinates.');
  process.exit(1);
}
