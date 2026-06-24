import os
import pickle
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR = os.path.dirname(BASE_DIR)
DATASET_DIR = os.path.join(WORKSPACE_DIR, "sample", "AgriGo", "AgriGo", "dataset")
ML_MODELS_DIR = os.path.join(WORKSPACE_DIR, "sample", "AgriGo", "AgriGo", "models", "ML_models")

os.makedirs(ML_MODELS_DIR, exist_ok=True)

# 1. Train Crop Recommender Model
def train_crop_model():
    print("Training Crop Recommender Model...")
    csv_path = os.path.join(DATASET_DIR, "Crop_recommendation.csv")
    df = pd.read_csv(csv_path)
    
    # Features & Target
    X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']].values
    y_str = df['label'].values
    
    # Map label to crop_list index
    crops_list = ['apple', 'banana', 'blackgram', 'chickpea', 'coconut', 'coffee', 'cotton', 'grapes', 'jute', 'kidneybeans', 'lentil', 'maize', 'mango', 'mothbeans', 'mungbean', 'muskmelon', 'orange', 'papaya', 'pigeonpeas', 'pomegranate', 'rice', 'watermelon']
    
    y = np.array([crops_list.index(crop.lower().strip()) for crop in y_str])
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Random Forest Model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_scaled, y)
    
    # Save pickles
    with open(os.path.join(ML_MODELS_DIR, "crop_scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    with open(os.path.join(ML_MODELS_DIR, "crop_model.pkl"), "wb") as f:
        pickle.dump(model, f)
        
    print("Crop Recommender Model trained and saved successfully.")

# 2. Train Fertilizer Recommender Model
def train_fertilizer_model():
    print("Training Fertilizer Recommender Model...")
    csv_path = os.path.join(DATASET_DIR, "Fertilizer Prediction.csv")
    df = pd.read_csv(csv_path)
    
    # Clean whitespace in column names
    df.columns = [c.strip() for c in df.columns]
    
    # Numeric features
    # Note: Column names in the CSV are 'Temparature', 'Humidity', 'Moisture', 'Nitrogen', 'Phosphorous', 'Potassium'
    X_num = df[['Temparature', 'Humidity', 'Moisture', 'Nitrogen', 'Phosphorous', 'Potassium']].values
    
    # Fit Numeric Scaler
    scaler = StandardScaler()
    X_num_scaled = scaler.fit_transform(X_num)
    
    # Categorical features
    soil_types_map = {'Black': 0, 'Clayey': 1, 'Loamy': 2, 'Red': 3, 'Sandy': 4}
    crop_types_map = {'Barley': 0, 'Cotton': 1, 'Ground Nuts': 2, 'Maize': 3, 'Millets': 4, 'Oil seeds': 5, 'Paddy': 6, 'Pulses': 7, 'Sugarcane': 8, 'Tobacco': 9, 'Wheat': 10}
    
    soil_encoded = np.array([soil_types_map[s.strip()] for s in df['Soil Type'].values]).reshape(-1, 1)
    crop_encoded = np.array([crop_types_map[c.strip()] for c in df['Crop Type'].values]).reshape(-1, 1)
    
    # Combine
    X_combined = np.concatenate([X_num_scaled, soil_encoded, crop_encoded], axis=1)
    
    # Target Mapping
    fertilizer_classes = ['10-26-26', '14-35-14', '17-17-17', '20-20', '28-28', 'DAP', 'Urea']
    y_str = df['Fertilizer Name'].values
    y = np.array([fertilizer_classes.index(f.strip()) for f in y_str])
    
    # Train Random Forest Model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_combined, y)
    
    # Save pickles
    with open(os.path.join(ML_MODELS_DIR, "fertilizer_scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    with open(os.path.join(ML_MODELS_DIR, "fertilizer_model.pkl"), "wb") as f:
        pickle.dump(model, f)
        
    print("Fertilizer Recommender Model trained and saved successfully.")

if __name__ == "__main__":
    # Install pandas if needed (it should be in standard environments)
    try:
        train_crop_model()
        train_fertilizer_model()
    except Exception as e:
        print(f"Error training models: {e}")
