import time
import random
import json
import urllib.request
import urllib.error
import threading
import sys
import msvcrt
from datetime import datetime

# Server details
API_URL = "https://smart-agri-platform-1.onrender.com/api/sensor-data" if "--cloud" in sys.argv else "http://localhost:10000/api/sensor-data"

# Simulation state
# Options: 'normal', 'heat', 'humidity', 'hypoxia', 'bioelectrical'
current_state = 'normal'

# Lock for sharing state between input thread and main loop
state_lock = threading.Lock()

def print_menu():
    print("=" * 60)
    print("  Agri AI IoT Hardware Simulator  ")
    print("=" * 60)
    print("Interactive Stress Controls:")
    print("  [n] - Reset to NORMAL state")
    print("  [t] - Inject HEAT stress (High Temperature)")
    print("  [h] - Inject DRY stress (Low Humidity)")
    print("  [o] - Inject HYPOXIA stress (Low Dissolved Oxygen)")
    print("  [s] - Inject BIOELECTRICAL stress (High Stress status)")
    print("  [q] - Quit Simulator")
    print("-" * 60)
    print("Press a key at any time to inject/change stress conditions.")
    print("=" * 60)

def read_keyboard():
    global current_state
    while True:
        if msvcrt.kbhit():
            ch = msvcrt.getch().decode('utf-8', errors='ignore').lower()
            if ch == 'q':
                print("\n[SIMULATOR] Exiting...")
                sys.exit(0)
            
            with state_lock:
                if ch == 'n':
                    current_state = 'normal'
                    print(f"\n[SIMULATOR] State changed to: NORMAL")
                elif ch == 't':
                    current_state = 'heat'
                    print(f"\n[SIMULATOR] State changed to: HEAT STRESS")
                elif ch == 'h':
                    current_state = 'humidity'
                    print(f"\n[SIMULATOR] State changed to: DRY STRESS (LOW HUMIDITY)")
                elif ch == 'o':
                    current_state = 'hypoxia'
                    print(f"\n[SIMULATOR] State changed to: HYPOXIA STRESS (LOW DO)")
                elif ch == 's':
                    current_state = 'bioelectrical'
                    print(f"\n[SIMULATOR] State changed to: BIOELECTRICAL STRESS")
        time.sleep(0.1)

def generate_telemetry(state):
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Base normal levels
    temp = round(random.uniform(22.0, 26.0), 1)
    humidity = round(random.uniform(60.0, 75.0), 1)
    n = random.randint(110, 130)
    p = random.randint(25, 35)
    k = random.randint(85, 105)
    do_mg = round(random.uniform(6.5, 7.5), 2)
    voltage = random.randint(45, 55)
    plant_status = "Healthy"
    
    if state == 'heat':
        temp = round(random.uniform(32.0, 36.0), 1)
        voltage = random.randint(30, 42)
        plant_status = "Moderate Stress"
    elif state == 'humidity':
        humidity = round(random.uniform(40.0, 48.0), 1)
        voltage = random.randint(35, 45)
        plant_status = "Moderate Stress"
    elif state == 'hypoxia':
        do_mg = round(random.uniform(3.5, 4.5), 2)
        voltage = random.randint(20, 29)
        plant_status = "High Stress"
    elif state == 'bioelectrical':
        voltage = random.randint(8, 18)
        plant_status = "High Stress"
        
    payload = {
        "timestamp": timestamp,
        "temperature_humidity": {
            "temperature_c": temp,
            "humidity_percent": humidity
        },
        "npk": {
            "nitrogen_mg_kg": n,
            "phosphorus_mg_kg": p,
            "potassium_mg_kg": k
        },
        "dissolved_oxygen": {
            "do_mg_l": do_mg
        },
        "bioelectrical": {
            "voltage_mv": voltage,
            "plant_status": plant_status
        }
    }
    
    return payload

def main():
    print_menu()
    
    # Start keyboard listener in background thread
    listener = threading.Thread(target=read_keyboard, daemon=True)
    listener.start()
    
    while True:
        with state_lock:
            state = current_state
            
        payload = generate_telemetry(state)
        
        try:
            req = urllib.request.Request(
                API_URL, 
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            with urllib.request.urlopen(req) as response:
                res_body = response.read().decode('utf-8')
                res_json = json.loads(res_body)
                
            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] Sent Telemetry | State: {state.upper()} | "
                f"Temp: {payload['temperature_humidity']['temperature_c']}C | "
                f"DO: {payload['dissolved_oxygen']['do_mg_l']}mg/L | "
                f"Voltage: {payload['bioelectrical']['voltage_mv']}mV | "
                f"Status: {payload['bioelectrical']['plant_status']} | "
                f"Severity: {res_json['analysis']['severity']}"
            )
        except urllib.error.URLError as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Connection Error: {e.reason}")
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {str(e)}")
            
        time.sleep(5)

if __name__ == "__main__":
    main()
