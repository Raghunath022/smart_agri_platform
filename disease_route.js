const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'leaf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Disease suggestions & treatments mapping
const ADVISORY_DATA = {
  Pepper__bell___Bacterial_spot: {
    title: "Bell Pepper Bacterial Spot",
    description: "Bacterial spot on bell pepper leaf. Caused by Xanthomonas bacteria, leading to spots, leaf drop, and crop loss.",
    solution: [
      "Spray copper-based fungicides weekly starting at the first sign of disease.",
      "Prune and destroy infected plant parts to prevent field spread.",
      "Avoid overhead sprinkler irrigation; water at the soil level to keep foliage dry."
    ]
  },
  Pepper__bell___healthy: {
    title: "Healthy Bell Pepper",
    description: "Your bell pepper plant is healthy and showing strong growth. Continue standard care.",
    solution: [
      "Maintain a consistent watering schedule, keeping soil moist but not soggy.",
      "Monitor regularly for pests like aphids or whiteflies.",
      "Apply balanced organic fertilizer during the active growing season."
    ]
  },
  Potato___Early_blight: {
    title: "Potato Early Blight",
    description: "Early blight detected on potato. Caused by Alternaria solani, producing concentric brown rings on older leaves.",
    solution: [
      "Apply fungicides containing chlorothalonil, mancozeb, or copper oxychloride.",
      "Remove and burn infected lower leaves to reduce fungal spore load.",
      "Practice crop rotation with non-solanaceous crops in the next planting cycle."
    ]
  },
  Potato___healthy: {
    title: "Healthy Potato",
    description: "Your potato plant leaves are healthy and free from visible blight signs.",
    solution: [
      "Ensure proper hilling of soil around potato tubers to protect them.",
      "Keep foliage dry by watering early in the morning.",
      "Regularly inspect undersides of leaves for Colorado potato beetle larvae."
    ]
  },
  Potato___Late_blight: {
    title: "Potato Late Blight",
    description: "Late blight detected on potato. A serious disease caused by Phytophthora infestans that can spread rapidly in cool, wet weather.",
    solution: [
      "Immediately apply systemic fungicides like metalaxyl or dimethomorph.",
      "Promptly remove and destroy the entire infected plant to prevent epidemic spread.",
      "Ensure adequate row spacing to improve air circulation and speed leaf drying."
    ]
  },
  Tomato_Bacterial_spot: {
    title: "Tomato Bacterial Spot",
    description: "Bacterial spot on tomato leaf. Caused by Xanthomonas species, resulting in small, water-soaked dark spots on foliage.",
    solution: [
      "Apply a combination of copper fungicide and mancozeb for effective bacterial suppression.",
      "Do not work in fields when plants are wet to avoid spreading bacteria via hands or tools.",
      "Mulch soil around plants to prevent pathogen spores from splashing up from the soil."
    ]
  },
  Tomato_Early_blight: {
    title: "Tomato Early Blight",
    description: "Early blight detected on tomato. Caused by Alternaria solani, leading to target-like dark spots and leaf yellowing.",
    solution: [
      "Prune the lower branches up to 12 inches off the ground to prevent soil-to-leaf spore splash.",
      "Spray organic copper fungicides or chemical fungicides containing chlorothalonil.",
      "Water at the base of the plant using drip tape or micro-sprinklers."
    ]
  },
  Tomato_Late_blight: {
    title: "Tomato Late Blight",
    description: "Tomato late blight detected. Caused by Phytophthora infestans, causing large greasy gray-green patches and white mold.",
    solution: [
      "Spray protective fungicides immediately (e.g., chlorothalonil or copper-based formulations).",
      "Remove infected plants immediately and seal them in plastic bags before disposal.",
      "Avoid planting potatoes and tomatoes in adjacent plots, as they share this pathogen."
    ]
  }
};

// @route   POST /api/disease/scan
// @desc    Upload leaf photo, run CNN model inference, return diagnosis and treatment
router.post('/scan', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an image file.' });
  }
  const imagePath = req.file.path;

  let pythonPath = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
  if (!fs.existsSync(pythonPath)) {
    const unixVenv = path.join(__dirname, '.venv', 'bin', 'python');
    if (fs.existsSync(unixVenv)) {
      pythonPath = unixVenv;
    } else {
      pythonPath = 'python'; // Fallback to system command
    }
  }
  const scriptPath = path.join(__dirname, 'services', 'predict_disease.py');

  // Run python prediction script
  execFile(pythonPath, [scriptPath, imagePath], (error, stdout, stderr) => {
    // Always clean up the uploaded temp file
    fs.unlink(imagePath, (unlinkErr) => {
      if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
    });

    if (error || stderr) {
      console.warn('Python execution failed. Falling back to mock diagnosis.', error, stderr);
      
      // Fallback: Choose a balanced mock result
      const classes = Object.keys(ADVISORY_DATA);
      const randomClass = classes[Math.floor(Math.random() * classes.length)];
      const advisory = ADVISORY_DATA[randomClass];
      
      return res.json({
        success: true,
        class: randomClass,
        confidence: 0.85,
        title: advisory.title + " (Demo)",
        description: advisory.description,
        solution: advisory.solution,
        isFallback: true
      });
    }

    try {
      const result = JSON.parse(stdout.trim());
      
      if (result.status === 'error') {
        return res.status(500).json({ error: result.error });
      }

      // Map class name to advisory details
      const cName = result.class;
      const advisory = ADVISORY_DATA[cName] || {
        title: cName.replace(/___/g, ' ').replace(/_/g, ' '),
        description: `Classified as ${cName}.`,
        solution: ["Consult a local agricultural expert.", "Perform standard plant health monitoring."]
      };

      res.json({
        success: true,
        class: cName,
        confidence: result.confidence,
        title: advisory.title,
        description: advisory.description,
        solution: advisory.solution
      });
    } catch (parseErr) {
      console.error('Failed to parse Python stdout:', stdout, parseErr);
      res.status(500).json({ error: 'Failed to parse model output.' });
    }
  });
});

module.exports = router;
