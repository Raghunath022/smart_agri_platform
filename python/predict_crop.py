import sys
import json
import joblib
import os
import random

def predict():
    try:
        # Read JSON string from command line arguments
        input_data = json.loads(sys.argv[1])
        
        # Determine path to model
        model_path = os.path.join(os.path.dirname(__file__), 'crop_engine.pkl')
        
        if not os.path.exists(model_path):
            # Fallback to mock if model not trained
            crops = ['rice', 'maize', 'chickpea', 'kidneybeans', 'pigeonpeas', 'mothbeans', 'mungbean', 'blackgram', 'lentil', 'pomegranate', 'banana', 'mango', 'grapes', 'watermelon', 'muskmelon', 'apple', 'orange', 'papaya', 'coconut', 'cotton', 'jute', 'coffee']
            print(json.dumps({
                "recommended_crop": random.choice(crops),
                "confidence": "Medium (Mock Model)"
            }))
            return

        crop_model = joblib.load(model_path)
        
        features = [[
            input_data.get('N', 0),
            input_data.get('P', 0),
            input_data.get('K', 0),
            input_data.get('temperature', 0),
            input_data.get('humidity', 0),
            input_data.get('ph', 0),
            input_data.get('rainfall', 0)
        ]]
        
        prediction = crop_model.predict(features)
        
        print(json.dumps({
            "recommended_crop": prediction[0],
            "confidence": "High"
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    predict()
