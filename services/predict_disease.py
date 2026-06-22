import os
import sys
import json
import torch
from torchvision import transforms
from PIL import Image
from model_def import SimpleCNN

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "No image path provided"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(json.dumps({"status": "error", "error": f"Image path '{image_path}' does not exist"}))
        sys.exit(1)
        
    # Paths
    current_dir = os.path.dirname(__file__)
    model_path = os.path.join(current_dir, "plant_disease_model.pth")
    classes_path = os.path.join(current_dir, "classes.json")
    
    if not os.path.exists(model_path) or not os.path.exists(classes_path):
        print(json.dumps({
            "status": "error", 
            "error": "Model weights or classes mapping not found. Please train the CNN model first."
        }))
        sys.exit(1)
        
    # Load class names
    with open(classes_path, "r") as f:
        classes = json.load(f)
        
    # Preprocessing
    transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    try:
        # Load image
        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0) # Add batch dimension
        
        # Load model
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = SimpleCNN(num_classes=len(classes))
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        
        # Run inference
        with torch.no_grad():
            img_tensor = img_tensor.to(device)
            outputs = model(img_tensor)
            probabilities = torch.softmax(outputs, dim=1)[0]
            confidence, predicted_idx = torch.max(probabilities, 0)
            
        predicted_class = classes[predicted_idx.item()]
        
        print(json.dumps({
            "status": "success",
            "class": predicted_class,
            "confidence": float(confidence.item())
        }))
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
