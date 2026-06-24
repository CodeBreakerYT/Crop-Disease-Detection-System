import os
import pickle
import numpy as np
import tensorflow as tf
import tf_keras
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import shutil
import cv2

# Import local data and helpers
from treatment_data import treatments, translations
from cv_helpers import detect_disease_spots, is_plant_image

app = FastAPI(title="Crop Disease Detection System API", version="1.0.0")

# Enable CORS for frontend deployment (e.g. Netlify)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DL_MODELS_DIR = os.path.join(BASE_DIR, "models", "DL_models")
ML_MODELS_DIR = os.path.join(BASE_DIR, "models", "ML_models")
TEMP_UPLOADS = os.path.join(BASE_DIR, "temp_uploads")

os.makedirs(TEMP_UPLOADS, exist_ok=True)

# Cache for loaded models
model_cache = {}

# ML Recommender Cache
ml_models = {}

# Crop diseases class maps (aligned with AgriGo functions.py)
crop_diseases_classes = {
    'strawberry': [(0, 'Strawberry___Leaf_scorch'), (1, 'Strawberry___healthy')],
    'potato': [(0, 'Potato___Early_blight'), (1, 'Potato___Late_blight'), (2, 'Potato___healthy')],
    'patato': [(0, 'Potato___Early_blight'), (1, 'Potato___Late_blight'), (2, 'Potato___healthy')],
    'corn': [(0, 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot'),
             (1, 'Corn_(maize)___Common_rust_'),
             (2, 'Corn_(maize)___Northern_Leaf_Blight'),
             (3, 'Corn_(maize)___healthy')],
    'apple': [(0, 'Apple___Apple_scab'),
              (1, 'Apple___Black_rot'),
              (2, 'Apple___Cedar_apple_rust'),
              (3, 'Apple___healthy')],
    'cherry': [(0, 'Cherry_(including_sour)___Powdery_mildew'), (1, 'Cherry_(including_sour)___healthy')],
    'grape': [(0, 'Grape___Black_rot'),
              (1, 'Grape___Esca_(Black_Measles)'),
              (2, 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)'),
              (3, 'Grape___healthy')],
    'peach': [(0, 'Peach___Bacterial_spot'), (1, 'Peach___healthy')],
    'pepper': [(0, 'Pepper,_bell___Bacterial_spot'), (1, 'Pepper,_bell___healthy')],
    'tomato': [(0, 'Tomato___Bacterial_spot'),
               (1, 'Tomato___Early_blight'),
               (2, 'Tomato___Late_blight'),
               (3, 'Tomato___Leaf_Mold'),
               (4, 'Tomato___Septoria_leaf_spot'),
               (5, 'Tomato___Spider_mites_Two-spotted_spider_mite'),
               (6, 'Tomato___Target_Spot'),
               (7, 'Tomato___Tomato_Yellow_Leaf_Curl_Virus'),
               (8, 'Tomato___Tomato_mosaic_virus'),
               (9, 'Tomato___healthy')]
}

# Soil / Crop classification classes
crops_list = ['apple', 'banana', 'blackgram', 'chickpea', 'coconut', 'coffee', 'cotton', 'grapes', 'jute', 'kidneybeans', 'lentil', 'maize', 'mango', 'mothbeans', 'mungbean', 'muskmelon', 'orange', 'papaya', 'pigeonpeas', 'pomegranate', 'rice', 'watermelon']
fertilizer_classes = ['10-26-26', '14-35-14', '17-17-17', '20-20', '28-28', 'DAP', 'Urea']

soil_types_map = {'Black': 0, 'Clayey': 1, 'Loamy': 2, 'Red': 3, 'Sandy': 4}
crop_types_map = {'Barley': 0, 'Cotton': 1, 'Ground Nuts': 2, 'Maize': 3, 'Millets': 4, 'Oil seeds': 5, 'Paddy': 6, 'Pulses': 7, 'Sugarcane': 8, 'Tobacco': 9, 'Wheat': 10}

def get_dl_model(crop: str):
    """Loads and caches the H5 model for a given crop."""
    crop_key = crop.lower().strip()
    if crop_key == 'potato':
        crop_key = 'patato' # Model is named patato_model.h5
        
    if crop_key not in model_cache:
        # Clear cache if it has more than 1 model to save memory on free tier hosting (Render has 512MB RAM limit)
        if len(model_cache) >= 1:
            model_cache.clear()
            import gc
            gc.collect()
            try:
                tf_keras.backend.clear_session()
            except Exception:
                pass
            
        model_path = os.path.join(DL_MODELS_DIR, f"{crop_key}_model.h5")
        if not os.path.exists(model_path):
            raise HTTPException(status_code=404, detail=f"Model for crop '{crop}' not found at {model_path}")
        # Load model using tf_keras
        model_cache[crop_key] = tf_keras.models.load_model(model_path, compile=False)
    
    return model_cache[crop_key]


def get_ml_models():
    """Loads crop and fertilizer recommendation ML models."""
    if not ml_models:
        crop_model_path = os.path.join(ML_MODELS_DIR, "crop_model.pkl")
        crop_scaler_path = os.path.join(ML_MODELS_DIR, "crop_scaler.pkl")
        fert_model_path = os.path.join(ML_MODELS_DIR, "fertilizer_model.pkl")
        fert_scaler_path = os.path.join(ML_MODELS_DIR, "fertilizer_scaler.pkl")
        
        if not all(os.path.exists(p) for p in [crop_model_path, crop_scaler_path, fert_model_path, fert_scaler_path]):
            raise HTTPException(status_code=404, detail="One or more ML recommendation models are missing.")
            
        with open(crop_model_path, 'rb') as f:
            ml_models['crop_model'] = pickle.load(f)
        with open(crop_scaler_path, 'rb') as f:
            ml_models['crop_scaler'] = pickle.load(f)
        with open(fert_model_path, 'rb') as f:
            ml_models['fertilizer_model'] = pickle.load(f)
        with open(fert_scaler_path, 'rb') as f:
            ml_models['fertilizer_scaler'] = pickle.load(f)
            
    return ml_models

# Pydantic schemas
class CropRecommendInput(BaseModel):
    n: float
    p: float
    k: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class FertilizerRecommendInput(BaseModel):
    n: float
    p: float
    k: float
    temperature: float
    humidity: float
    moisture: float
    soil_type: str
    crop_type: str


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Crop Disease Detection API is running"}


def get_fatality_level(class_name: str) -> str:
    cn = class_name.lower()
    if "healthy" in cn:
        return "Low"
    elif any(d in cn for d in ["late_blight", "black_rot", "greening", "rust", "yellow_leaf_curl", "mosaic_virus", "scorch"]):
        return "High"
    else:
        return "Medium"

@app.post("/api/predict/disease")
async def predict_disease(
    file: UploadFile = File(...),
    crop: str = Form(...)
):
    crop_key = crop.lower().strip()
    if crop_key == 'potato':
        crop_key = 'patato'
        
    if crop_key not in crop_diseases_classes:
        raise HTTPException(status_code=400, detail=f"Crop '{crop}' is not supported. Supported crops: {list(crop_diseases_classes.keys())}")
        
    # Save upload to temp file
    temp_file_path = os.path.join(TEMP_UPLOADS, file.filename)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Check if the uploaded file is a valid leaf or plant image
    is_valid, error_msg = is_plant_image(temp_file_path)
    if not is_valid:
        os.remove(temp_file_path)
        raise HTTPException(
            status_code=400, 
            detail=error_msg
        )
        
    try:
        # Load and preprocess image for DL model
        # Target size is 224x224 (AgriGo functions.py line 14)
        img_raw = tf_keras.preprocessing.image.load_img(temp_file_path, target_size=(224, 224, 3))
        img_arr = tf_keras.preprocessing.image.img_to_array(img_raw)
        img_arr = np.expand_dims(img_arr, axis=0)
        img_arr = img_arr * 1.0 / 255.0  # Rescale to [0, 1]
        
        # Run prediction
        model = get_dl_model(crop_key)
        predictions = model.predict(img_arr)[0]
        
        # Extract class index
        class_list = crop_diseases_classes[crop_key]
        if len(class_list) > 2:
            predicted_idx = int(np.argmax(predictions))
            confidence = float(predictions[predicted_idx])
        else:
            # Binary classification
            confidence = float(predictions[0])
            predicted_idx = int(np.round(confidence))
            confidence = confidence if predicted_idx == 1 else 1.0 - confidence
            
        full_class_name = class_list[predicted_idx][1]
        
        # Fetch treatment information
        treatment_info = treatments.get(full_class_name, {
            "disease": full_class_name.split("___")[-1].replace("_", " "),
            "crop": crop.capitalize(),
            "cause": "Unknown",
            "symptoms": "Diagnostic symptoms not available.",
            "organic": "Apply general bio-fungicide or compost tea.",
            "chemical": "Consult local agricultural extension for suitable chemical spray.",
            "prevention": "Maintain clean field conditions and select disease-free seeds."
        })
        
        # Detect spots using OpenCV
        spots = detect_disease_spots(temp_file_path)
        
        # Clean up temp file
        os.remove(temp_file_path)
        
        fatality = get_fatality_level(full_class_name)
        
        return {
            "success": True,
            "crop": crop.capitalize(),
            "class_name": full_class_name,
            "disease_name": treatment_info["disease"],
            "is_healthy": "healthy" in full_class_name.lower(),
            "confidence": confidence,
            "treatment": treatment_info,
            "spots": spots,
            "fatality_level": fatality
        }
        
    except Exception as e:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


crop_requirements = {
    'apple': "Apples thrive in cool temperate regions with distinct winters. They require well-drained, sandy loam soils with moderate nitrogen and organic matter. Optimal soil pH is 6.0 to 6.8.",
    'banana': "Bananas require a tropical, hot, and humid climate with abundant rainfall. They are heavy feeders, especially demanding high potassium levels in the soil to support large leaf areas and heavy fruit bunches.",
    'blackgram': "Blackgram is a warm-season pulse crop that requires moderate temperatures and low-to-medium rainfall. It is capable of fixing atmospheric nitrogen, so it requires minimal nitrogen fertilizer but benefits from starter phosphorus.",
    'chickpea': "Chickpeas are cool-season grain legumes grown in dry climates. They require well-drained soils and fix their own nitrogen. Excessive soil nitrogen will lead to vegetative overgrowth rather than pod yield.",
    'coconut': "Coconuts thrive in tropical coastal regions with sandy, well-draining soils, warm temperatures, and high humidity. They require abundant potassium and are highly tolerant to salinity.",
    'coffee': "Coffee requires warm-to-cool tropical highland climates, high humidity, and well-drained, deep organic soils. It is sensitive to frost and thrives under shaded crop canopy conditions.",
    'cotton': "Cotton is a warm-season crop requiring a long frost-free period, high temperatures, and moderate rainfall. It grows best in deep, rich black clayey soils and requires balanced nitrogen and potassium.",
    'grapes': "Grapes require warm, dry summers and mild winters, with well-drained deep soils. They are highly sensitive to waterlogging and chlorine-based fertilizers. Potassium is key for berry quality and sugar accumulation.",
    'jute': "Jute is a tropical fiber crop that requires hot, humid conditions and heavy rainfall. It thrives in fertile alluvial soils and can tolerate standing water/flooding during its growth cycle.",
    'kidneybeans': "Kidney beans require warm temperatures and moderate, consistent moisture. They are sensitive to waterlogging and soil compaction, preferring light, well-aerated sandy loam soils.",
    'lentil': "Lentils are cool-season legumes grown in semi-arid regions. They thrive on low-to-moderate moisture and well-drained soils, fixing their own nitrogen and requiring mainly phosphorus for root establishment.",
    'maize': "Maize (Corn) is a fast-growing, heavy-feeding cereal crop. It requires warm temperatures, moderate rainfall, and deep, well-aerated fertile soils. It has a high demand for nitrogen, especially during early growth.",
    'mango': "Mangoes thrive in tropical and subtropical climates with hot, dry periods during flowering and moderate rain during fruit development. They grow well in deep, well-drained loamy soils.",
    'mothbeans': "Moth beans are exceptionally drought-tolerant legumes grown in hot, arid regions. They thrive on sandy, low-nutrient soils and require minimal water and nutrients.",
    'mungbean': "Mungbeans (Green Gram) are short-duration warm-season legumes. They require warm temperatures, low-to-medium moisture, and are sensitive to frost. They fix nitrogen and improve soil health.",
    'muskmelon': "Muskmelons require hot, dry weather and full sun with light, sandy, well-drained soils. They have high potassium demands to build sugar content and improve fruit quality.",
    'orange': "Oranges (Citrus) require subtropical-to-tropical climates with no frost and moderate rainfall. They prefer well-drained loamy soils and are heavy feeders of nitrogen and potassium, plus micronutrients like zinc.",
    'papaya': "Papayas are fast-growing tropical trees that require warm temperatures, full sun, and consistent moisture. They are highly sensitive to waterlogging and root rot, requiring extremely well-drained soil.",
    'pigeonpeas': "Pigeonpeas are drought-resistant, long-duration legumes grown in tropical regions. They fix substantial nitrogen, improve soil structure with deep taproots, and thrive in warm, semi-arid conditions.",
    'pomegranate': "Pomegranates are highly drought-tolerant and thrive in hot, dry climates. They prefer well-drained sandy loam soils and require hot dry weather during fruit ripening to prevent skin splitting.",
    'rice': "Rice (Paddy) is a semi-aquatic crop requiring high temperatures, high humidity, and continuous standing water or high rainfall. It thrives in heavy clayey soils that retain moisture.",
    'watermelon': "Watermelons require a long, hot growing season with full sun and sandy, well-drained soil. They demand potassium for fruit sweetness and are sensitive to damp foliage, requiring dry atmospheric conditions."
}

crop_recommend_ideal_npk = {
    'apple': {'N': 20.8, 'P': 134.22, 'K': 199.89},
    'banana': {'N': 100.23, 'P': 82.01, 'K': 50.05},
    'blackgram': {'N': 40.02, 'P': 67.47, 'K': 19.24},
    'chickpea': {'N': 40.09, 'P': 67.79, 'K': 79.92},
    'coconut': {'N': 21.98, 'P': 16.93, 'K': 30.59},
    'coffee': {'N': 101.2, 'P': 28.74, 'K': 29.94},
    'cotton': {'N': 117.77, 'P': 46.24, 'K': 19.56},
    'grapes': {'N': 23.18, 'P': 132.53, 'K': 200.11},
    'jute': {'N': 78.4, 'P': 46.86, 'K': 39.99},
    'kidneybeans': {'N': 20.75, 'P': 67.54, 'K': 20.05},
    'lentil': {'N': 18.77, 'P': 68.36, 'K': 19.41},
    'maize': {'N': 77.76, 'P': 48.44, 'K': 19.79},
    'mango': {'N': 20.07, 'P': 27.18, 'K': 29.92},
    'mothbeans': {'N': 21.44, 'P': 48.01, 'K': 20.23},
    'mungbean': {'N': 20.99, 'P': 47.28, 'K': 19.87},
    'muskmelon': {'N': 100.32, 'P': 17.72, 'K': 50.08},
    'orange': {'N': 19.58, 'P': 16.55, 'K': 10.01},
    'papaya': {'N': 49.88, 'P': 59.05, 'K': 50.04},
    'pigeonpeas': {'N': 20.73, 'P': 67.73, 'K': 20.29},
    'pomegranate': {'N': 18.87, 'P': 18.75, 'K': 40.21},
    'rice': {'N': 79.89, 'P': 47.58, 'K': 39.87},
    'watermelon': {'N': 99.42, 'P': 17.0, 'K': 50.22}
}

crop_fertilizer_ideal_npk = {
    'Barley': {'N': 60.0, 'P': 30.0, 'K': 30.0},
    'Cotton': {'N': 118.0, 'P': 46.0, 'K': 20.0},
    'Ground Nuts': {'N': 20.0, 'P': 50.0, 'K': 30.0},
    'Maize': {'N': 78.0, 'P': 48.0, 'K': 20.0},
    'Millets': {'N': 50.0, 'P': 30.0, 'K': 30.0},
    'Oil seeds': {'N': 40.0, 'P': 40.0, 'K': 30.0},
    'Paddy': {'N': 80.0, 'P': 48.0, 'K': 40.0},
    'Pulses': {'N': 20.0, 'P': 60.0, 'K': 20.0},
    'Sugarcane': {'N': 120.0, 'P': 60.0, 'K': 80.0},
    'Tobacco': {'N': 80.0, 'P': 40.0, 'K': 80.0},
    'Wheat': {'N': 80.0, 'P': 40.0, 'K': 40.0}
}

@app.post("/api/predict/crop")
def predict_crop(data: CropRecommendInput):
    try:
        models = get_ml_models()
        scaler = models['crop_scaler']
        model = models['crop_model']
        
        features = np.array([data.n, data.p, data.k, data.temperature, data.humidity, data.ph, data.rainfall]).reshape(1, -1)
        scaled_features = scaler.transform(features)
        
        pred_idx = model.predict(scaled_features)[0]
        # Map back to crop string
        crop_result = crops_list[pred_idx]
        
        crop_key = crop_result.lower().strip()
        reqs = crop_requirements.get(crop_key, "Requires balanced soil nutrients, structured watering, and proper sunlight.")
        
        # Deficit calculation
        ideals = crop_recommend_ideal_npk.get(crop_key, {'N': 50.0, 'P': 50.0, 'K': 50.0})
        deficiencies = {
            'n': round(max(0.0, ideals['N'] - data.n), 2),
            'p': round(max(0.0, ideals['P'] - data.p), 2),
            'k': round(max(0.0, ideals['K'] - data.k), 2)
        }
        
        desc = (
            f"Based on your soil parameters (N={data.n} kg/ha, P={data.p} kg/ha, K={data.k} kg/ha, pH={data.ph}) "
            f"and local environmental conditions (Temp={data.temperature}°C, Humidity={data.humidity}%, Rainfall={data.rainfall}mm), "
            f"the optimal crop to cultivate is {crop_result.capitalize()}.\n\n"
            f"🌾 Agricultural Guidance: {reqs}"
        )
        
        return {
            "success": True,
            "recommended_crop": crop_result.capitalize(),
            "description": desc,
            "ideals": ideals,
            "deficiencies": deficiencies
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML crop recommendation error: {str(e)}")


@app.post("/api/predict/fertilizer")
def predict_fertilizer(data: FertilizerRecommendInput):
    try:
        models = get_ml_models()
        scaler = models['fertilizer_scaler']
        model = models['fertilizer_model']
        
        # Encode categorical variables
        soil_code = soil_types_map.get(data.soil_type)
        crop_code = crop_types_map.get(data.crop_type)
        
        if soil_code is None or crop_code is None:
            raise HTTPException(status_code=400, detail="Invalid soil type or crop type provided.")
            
        num_features = np.array([data.temperature, data.humidity, data.moisture, data.n, data.p, data.k]).reshape(1, -1)
        scaled_num = scaler.transform(num_features)
        
        cat_features = np.array([soil_code, crop_code]).reshape(1, -1)
        
        # Combine
        combined_features = np.concatenate([scaled_num, cat_features], axis=1)
        
        pred_idx = model.predict(combined_features)[0]
        recommended_fert = fertilizer_classes[pred_idx]
        
        # Deficit calculation
        crop_name = data.crop_type
        ideals = crop_fertilizer_ideal_npk.get(crop_name, {'N': 60.0, 'P': 40.0, 'K': 40.0})
        def_n = round(max(0.0, ideals['N'] - data.n), 2)
        def_p = round(max(0.0, ideals['P'] - data.p), 2)
        def_k = round(max(0.0, ideals['K'] - data.k), 2)
        
        deficiencies = {
            'n': def_n,
            'p': def_p,
            'k': def_k
        }
        
        # Scientific Check / Reanalysis
        warnings = []
        is_consistent = True
        
        if recommended_fert == "Urea" and def_n == 0:
            is_consistent = False
            warnings.append(
                f"Your soil has sufficient Nitrogen (current {data.n} kg/ha vs crop target {ideals['N']} kg/ha). "
                f"Applying Urea (46-0-0) is unnecessary and may lead to nitrogen toxicity."
            )
        
        if recommended_fert == "DAP" and def_p == 0:
            is_consistent = False
            warnings.append(
                f"Your soil has sufficient Phosphorus (current {data.p} kg/ha vs crop target {ideals['P']} kg/ha). "
                f"Applying DAP (18-46-0) is unnecessary."
            )
            
        if recommended_fert == "Urea" and (def_p > 10 or def_k > 10):
            warnings.append(
                f"Urea ONLY contains Nitrogen. Your soil has deficits in "
                f"{'Phosphorus (P)' if def_p > 10 else ''}{' and ' if (def_p > 10 and def_k > 10) else ''}{'Potassium (K)' if def_k > 10 else ''}. "
                f"Urea will not correct these. Consider applying a complex NPK fertilizer (like 10-26-26 or 17-17-17) or adding single-nutrient P/K sources."
            )
            
        if recommended_fert == "DAP" and def_k > 10:
            warnings.append(
                f"DAP lacks Potassium. Your soil requires an additional "
                f"{def_k} kg/ha of Potassium (K). Supplement with Muriate of Potash (MOP)."
            )
            
        if recommended_fert in ["20-20", "28-28"] and def_k > 10:
            warnings.append(
                f"{recommended_fert} lacks Potassium. Your soil requires an additional "
                f"{def_k} kg/ha of Potassium (K). Supplement with a potassium source."
            )
            
        if recommended_fert == "10-26-26" and def_n > 20:
            warnings.append(
                f"10-26-26 is low in Nitrogen. Your soil requires an additional "
                f"{def_n} kg/ha of Nitrogen (N). Supplement with top-dressing of Urea later."
            )

        if not warnings:
            scientific_analysis = (
                f"The ML-recommended fertilizer {recommended_fert} aligns well with your soil nutrient profile. "
                f"It addresses your crop's nutritional needs: Target NPK for {crop_name} is N={ideals['N']}, P={ideals['P']}, K={ideals['K']}."
            )
        else:
            warnings_text = " ".join(warnings)
            scientific_analysis = (
                f"⚠️ Scientific Reanalysis:\n{warnings_text}\n\n"
                f"Actionable Advice: To grow {crop_name} successfully, aim to correct the exact nutrient deficits (N deficit: {def_n} kg/ha, P deficit: {def_p} kg/ha, K deficit: {def_k} kg/ha) using targeted fertilizers."
            )
        
        # Generate highly detailed and agriculturally verified chemical/organic recommendations
        descriptions = {
            "Urea": (
                "Urea (NPK 46-0-0) is recommended. It is a highly concentrated dry Nitrogen fertilizer. "
                "Nitrogen is essential for early vegetative vigor, active tillering, and forming healthy green foliage. "
                "Guidance: Apply in split doses (e.g., basal and top-dressing) to prevent nitrogen loss through volatilization "
                "and leaching. For best results, till it slightly into the soil or irrigate immediately after spreading."
            ),
            "DAP": (
                "Diammonium Phosphate (DAP, NPK 18-46-0) is recommended. It provides a dense starter dose of Nitrogen (18%) "
                "and a heavy concentration of water-soluble Phosphorus (46%). "
                "Guidance: Best applied as a basal dose during planting or sowing to support root establishment and seedling vigor. "
                "Ensure it is placed near the root zone but avoid direct seed contact to prevent ammonia-related seed injury."
            ),
            "10-26-26": (
                "NPK 10-26-26 complex fertilizer is recommended. This formulation contains 10% Nitrogen, 26% Phosphorus, "
                "and 26% Potassium, making it highly effective for tuber, root, and fruiting crops (like Potatoes, Groundnuts, and Citrus). "
                "Guidance: Apply as a basal dose during soil preparation. The high Potassium content regulates water use, "
                "strengthens plant cells, and provides strong protection against environmental stress, pests, and drought."
            ),
            "14-35-14": (
                "NPK 14-35-14 complex fertilizer is recommended. This provides a scientific 1:2.5:1 ratio (14% N, 35% P, 14% K) "
                "which is ideal for cereal crops (like Rice and Maize) and cash crops (like Cotton and Soybeans) during early growth. "
                "Guidance: Best used as a basal dose. It utilizes ammoniacal nitrogen to reduce leaching losses, ensuring "
                "a constant release of phosphorus and potassium directly to developing roots. It is neutral and suitable for all soil types."
            ),
            "17-17-17": (
                "NPK 17-17-17 balanced complex fertilizer is recommended. It provides equal ratios (17% each) of Nitrogen, "
                "Phosphorus, and Potassium, ensuring uniform and complete nutrition. "
                "Guidance: Highly versatile, suitable for general crop maintenance, garden vegetables, and fruit orchard development. "
                "It supports simultaneous vegetative leaf growth, root development, and fruit set. Apply during active growth phases."
            ),
            "20-20": (
                "NPK 20-20-0 ammonium phosphate sulfate complex fertilizer is recommended. It contains 20% Nitrogen and 20% Phosphorus. "
                "Guidance: Excellent for fast-growing crops that require a boost in both vegetative greening and root structure. "
                "It is highly soluble and ideal for early-to-mid vegetative stages, particularly in soils that do not suffer from potassium deficiency."
            ),
            "28-28": (
                "NPK 28-28-0 highly concentrated complex fertilizer is recommended. It provides a heavy dose of 28% Nitrogen "
                "and 28% Phosphorus. "
                "Guidance: Perfect for fast-growing, heavy-feeding crops (like Sugarcane, Maize, and cruciferous leafy greens) "
                "that require fast cell division and vegetative vigor in the early growth phases. Apply during tilling or early tillering."
            )
        }
        
        return {
            "success": True,
            "recommended_fertilizer": recommended_fert,
            "description": descriptions.get(recommended_fert, f"Apply NPK {recommended_fert} to balance soil nutrients."),
            "ideals": ideals,
            "deficiencies": deficiencies,
            "scientific_analysis": scientific_analysis,
            "is_consistent": is_consistent
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML fertilizer recommendation error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
