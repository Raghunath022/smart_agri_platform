import sys
import json
import random

def predict():
    try:
        input_data = json.loads(sys.argv[1])
        crop = input_data.get('crop', 'unknown')
        historical_prices = input_data.get('historical_prices', [])
        
        if not historical_prices:
            print(json.dumps({"error": "No historical prices provided"}))
            return
            
        latest_price = historical_prices[-1] if isinstance(historical_prices[-1], (int, float)) else 1500
        
        forecast = []
        current_price = float(latest_price)
        trend_factor = random.choice([-1, 1]) * random.uniform(0.01, 0.05)
        
        for i in range(1, 8):
            current_price = current_price * (1 + trend_factor)
            forecast.append(round(current_price, 2))
            
        trend = "UP" if trend_factor > 0 else "DOWN"
            
        print(json.dumps({
            "crop": crop,
            "trend": trend,
            "forecast_timeline": forecast
        }))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    predict()
