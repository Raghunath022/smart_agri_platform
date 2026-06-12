// Mongoose Models for MongoDB Integration
const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, default: 'farmer', enum: ['farmer', 'admin', 'expert'] },
  createdAt: { type: Date, default: Date.now }
});

// Prediction Log Schema
const PredictionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  inputs: {
    N: { type: Number, required: true },
    P: { type: Number, required: true },
    K: { type: Number, required: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    ph: { type: Number, required: true },
    rainfall: { type: Number, required: true }
  },
  weather: {
    temperature: Number,
    humidity: Number,
    rainfall: Number,
    source: String
  },
  market: {
    min: Number,
    max: Number,
    modal: Number,
    unit: String,
    source: String
  },
  recommendation: {
    crop: { type: String, required: true },
    confidence: { type: Number, required: true },
    alternatives: [Object]
  },
  state: String,
  district: String,
  createdAt: { type: Date, default: Date.now }
});

// Register models
if (!mongoose.models.User) {
  mongoose.model('User', UserSchema);
}
if (!mongoose.models.Prediction) {
  mongoose.model('Prediction', PredictionSchema);
}

module.exports = {
  UserSchema,
  PredictionSchema
};
