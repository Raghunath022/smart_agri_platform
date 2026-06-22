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

// IoT Telemetry Schema
const TelemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, index: true },
  received_at: { type: Date, default: Date.now },
  temperature_humidity: {
    temperature_c: Number,
    humidity_percent: Number
  },
  npk: {
    nitrogen_mg_kg: Number,
    phosphorus_mg_kg: Number,
    potassium_mg_kg: Number
  },
  dissolved_oxygen: {
    do_mg_l: Number
  },
  bioelectrical: {
    voltage_mv: Number,
    plant_status: String
  },
  analysis: {
    severity: String,
    plant_status: String,
    primary_suggestion: {
      code: String,
      text: String
    },
    all_suggestions: [Object]
  }
});

// Logistics & Rentals Schema
const LogisticsSchema = new mongoose.Schema({
  providerId: { type: String, required: true },
  resourceType: { type: String, enum: ['tractor', 'harvester', 'labor'], required: true },
  status: { type: String, enum: ['available', 'booked'], default: 'available' },
  pricePerDay: { type: Number, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  }
});
LogisticsSchema.index({ location: "2dsphere" });

// Schemes Schema
const SchemeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  eligibility: {
    states: [String],
    maxAcreage: Number,
    targetCrops: [String]
  },
  sourceUrl: String
});

// Register models
if (!mongoose.models.User) {
  mongoose.model('User', UserSchema);
}
if (!mongoose.models.Prediction) {
  mongoose.model('Prediction', PredictionSchema);
}
if (!mongoose.models.Telemetry) {
  mongoose.model('Telemetry', TelemetrySchema);
}
if (!mongoose.models.Logistics) {
  mongoose.model('Logistics', LogisticsSchema);
}
if (!mongoose.models.Scheme) {
  mongoose.model('Scheme', SchemeSchema);
}

module.exports = {
  UserSchema,
  PredictionSchema,
  TelemetrySchema,
  LogisticsSchema,
  SchemeSchema
};
