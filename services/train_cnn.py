import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms
from model_def import SimpleCNN

# Configuration
DATASET_PATH = r"C:\Users\RAGHUNATH\OneDrive - Amrita Vishwa Vidyapeetham- Chennai Campus\Desktop\SK.RAGHUNATH(CH.EN.U4MEE23020)\archive\PlantVillage"
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), "plant_disease_model.pth")
CLASSES_SAVE_PATH = os.path.join(os.path.dirname(__file__), "classes.json")
SUBSET_SIZE_PER_CLASS = 200
BATCH_SIZE = 32
EPOCHS = 5
LEARNING_RATE = 0.001

def main():
    print("Starting CNN Training Pipeline...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Image preprocessing
    transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Load dataset
    print(f"Loading dataset from: {DATASET_PATH}")
    full_dataset = datasets.ImageFolder(root=DATASET_PATH, transform=transform)
    classes = full_dataset.classes
    print(f"Found {len(classes)} classes: {classes}")
    
    # Save classes map
    with open(CLASSES_SAVE_PATH, "w") as f:
        json.dump(classes, f)
    print(f"Saved classes mapping to {CLASSES_SAVE_PATH}")
    
    # Subsampling to speed up training
    print(f"Subsampling dataset (max {SUBSET_SIZE_PER_CLASS} images per class for speed)...")
    class_indices = {i: [] for i in range(len(classes))}
    for idx, (_, label) in enumerate(full_dataset.imgs):
        if len(class_indices[label]) < SUBSET_SIZE_PER_CLASS:
            class_indices[label].append(idx)
            
    subset_indices = []
    for label, indices in class_indices.items():
        subset_indices.extend(indices)
        print(f"Class '{classes[label]}': loaded {len(indices)} samples")
        
    subset_dataset = Subset(full_dataset, subset_indices)
    total_samples = len(subset_dataset)
    print(f"Total training subset size: {total_samples}")
    
    # Split into train/validation (90/10)
    train_size = int(0.9 * total_samples)
    val_size = total_samples - train_size
    train_dataset, val_dataset = torch.utils.data.random_split(subset_dataset, [train_size, val_size])
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    # Model, Loss, Optimizer
    model = SimpleCNN(num_classes=len(classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    # Training loop
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        correct_train = 0
        total_train = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            _, predicted = torch.max(outputs, 1)
            correct_train += (predicted == labels).sum().item()
            total_train += labels.size(0)
            
        epoch_loss = running_loss / len(train_loader.dataset)
        epoch_acc = correct_train / total_train
        
        # Validation
        model.eval()
        correct_val = 0
        total_val = 0
        val_loss = 0.0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                _, predicted = torch.max(outputs, 1)
                correct_val += (predicted == labels).sum().item()
                total_val += labels.size(0)
                
        epoch_val_loss = val_loss / len(val_loader.dataset)
        epoch_val_acc = correct_val / total_val if total_val > 0 else 0.0
        
        print(f"Epoch {epoch+1}/{EPOCHS} - "
              f"Train Loss: {epoch_loss:.4f}, Train Acc: {epoch_acc*100:.2f}% | "
              f"Val Loss: {epoch_val_loss:.4f}, Val Acc: {epoch_val_acc*100:.2f}%")
              
    # Save Model Weights
    print(f"Saving model to {MODEL_SAVE_PATH}...")
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print("Model successfully trained and saved!")

if __name__ == "__main__":
    main()
