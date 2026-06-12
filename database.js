// Database Connection and Fallback Store
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('./models');

const FALLBACK_DB_PATH = path.join(__dirname, 'db_fallback.json');

// Initialize empty fallback JSON store if not exists
if (!fs.existsSync(FALLBACK_DB_PATH)) {
  fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify({
    users: [
      // Seed an admin and a farmer
      {
        id: "admin-1",
        name: "Admin Admin",
        email: "admin@agriai.com",
        password: "adminpassword", // In a real app we hash this (e.g. bcrypt). Adding plain text for mock seed convenience.
        role: "admin"
      },
      {
        id: "farmer-1",
        name: "Ram Kumar",
        email: "ram@agriai.com",
        password: "farmerpassword",
        role: "farmer"
      }
    ],
    predictions: [],
    telemetry: [],
    settings: {}
  }, null, 2));
}

let isUsingMongoose = false;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('⚠️  No MONGODB_URI found in environment variables. Running in JSON File Fallback database mode.');
    return false;
  }

  try {
    // Attempt Mongoose connection with 3 second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ Connected to MongoDB Atlas database successfully.');
    isUsingMongoose = true;
    return true;
  } catch (error) {
    console.error('❌ MongoDB Connection failed:', error.message);
    console.log('⚠️ Falling back to local JSON file storage (db_fallback.json).');
    isUsingMongoose = false;
    return false;
  }
}

// Low-level helper functions to interact with the fallback JSON file
function readFallbackDB() {
  try {
    const data = fs.readFileSync(FALLBACK_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], predictions: [] };
  }
}

function writeFallbackDB(data) {
  try {
    fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to fallback database:', err);
    return false;
  }
}

module.exports = {
  connectDB,
  isUsingMongoose: () => isUsingMongoose,
  
  // Generic database API that abstracts MongoDB vs Local JSON
  users: {
    async findOne({ email }) {
      if (isUsingMongoose) {
        // Assume Mongoose model is loaded
        const User = mongoose.model('User');
        return await User.findOne({ email });
      } else {
        const db = readFallbackDB();
        return db.users.find(u => u.email && email && u.email.toLowerCase() === email.toLowerCase());
      }
    },
    async create(userData) {
      if (isUsingMongoose) {
        const User = mongoose.model('User');
        const newUser = new User(userData);
        return await newUser.save();
      } else {
        const db = readFallbackDB();
        const newUser = {
          id: 'usr_' + Math.random().toString(36).substring(2, 11),
          ...userData
        };
        db.users.push(newUser);
        writeFallbackDB(db);
        return newUser;
      }
    }
  },

  predictions: {
    async create(predictionData) {
      if (isUsingMongoose) {
        const Prediction = mongoose.model('Prediction');
        const newPred = new Prediction(predictionData);
        return await newPred.save();
      } else {
        const db = readFallbackDB();
        const newPred = {
          id: 'pred_' + Math.random().toString(36).substring(2, 11),
          createdAt: new Date().toISOString(),
          ...predictionData
        };
        db.predictions.push(newPred);
        writeFallbackDB(db);
        return newPred;
      }
    },
    async find(query = {}) {
      if (isUsingMongoose) {
        const Prediction = mongoose.model('Prediction');
        return await Prediction.find(query).sort({ createdAt: -1 });
      } else {
        const db = readFallbackDB();
        let results = db.predictions;
        if (query.userId) {
          results = results.filter(p => p.userId === query.userId);
        }
        // Return reverse chronological order
        return results.slice().reverse();
      }
    }
  },

  telemetry: {
    async create(telemetryData) {
      if (isUsingMongoose) {
        const Telemetry = mongoose.model('Telemetry');
        const newRecord = new Telemetry(telemetryData);
        return await newRecord.save();
      } else {
        const db = readFallbackDB();
        if (!db.telemetry) db.telemetry = [];
        const newRecord = {
          id: 'tel_' + Math.random().toString(36).substring(2, 11),
          createdAt: new Date().toISOString(),
          ...telemetryData
        };
        db.telemetry.push(newRecord);
        // Limit in-memory/JSON fallback file to 100 items to prevent ballooning size
        if (db.telemetry.length > 100) {
          db.telemetry.shift();
        }
        writeFallbackDB(db);
        return newRecord;
      }
    },
    async find(limit = 100) {
      if (isUsingMongoose) {
        const Telemetry = mongoose.model('Telemetry');
        return await Telemetry.find({}).sort({ timestamp: 1 }).limit(limit);
      } else {
        const db = readFallbackDB();
        if (!db.telemetry) db.telemetry = [];
        return db.telemetry;
      }
    }
  }
};
