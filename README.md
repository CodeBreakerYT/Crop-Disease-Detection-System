# 🌿 AgriShield: Crop Disease Detection & Agricultural Recommendation System

AgriShield is an advanced, full-stack AI-driven agricultural suite designed to protect crop yields, optimize fertilization, and recommend the best crops for cultivation based on soil conditions. Built using high-performance frameworks, it combines Deep Learning (TensorFlow/Keras), Computer Vision (OpenCV), Classical Machine Learning (Scikit-Learn), and Interactive 3D Graphics (Three.js) to bring state-of-the-art agricultural diagnostics directly to farmers and researchers.

---

## 🚀 Key Features

### 1. 🔍 AI-Powered Leaf Disease Scanner
* **Multi-Crop Support**: Instantly diagnoses disease states across 9 different crop types:
  * 🍎 **Apple** (Apple scab, Black rot, Cedar apple rust, Healthy)
  * 🍒 **Cherry** (Powdery mildew, Healthy)
  * 🌽 **Corn / Maize** (Cercospora leaf spot/Gray leaf spot, Common rust, Northern Leaf Blight, Healthy)
  * 🍇 **Grape** (Black rot, Esca/Black Measles, Leaf blight, Healthy)
  * 🍑 **Peach** (Bacterial spot, Healthy)
  * 🫑 **Pepper Bell** (Bacterial spot, Healthy)
  * 🥔 **Potato** (Early blight, Late blight, Healthy)
  * 🍓 **Strawberry** (Leaf scorch, Healthy)
  * 🍅 **Tomato** (Bacterial spot, Early blight, Late blight, Leaf Mold, Septoria leaf spot, Spider mites, Target Spot, Yellow Leaf Curl, Mosaic virus, Healthy)
* **Immediate Treatment Recommendations**: Fetches scientific descriptions of the disease cause, symptoms, prevention advice, and both **chemical** and **organic** treatment options.

### 2. 🛡️ Computer Vision Verification & Anomaly Spotting
* **Input Image Validation**: Uses OpenCV to verify if the uploaded image is actually a leaf or plant. It filters out non-plant images (e.g., animals, vehicles, text documents) to protect the inference pipeline from junk inputs.
* **Disease Spot Localization**: Extracts coordinates of disease spots from images in real time using HSV color space masking and contour detection algorithms.

### 3. 📦 Interactive 3D Diagnostic Visualizer
* **Custom 3D Leaf Inspector**: Visualizes the uploaded leaf texture in 3D by wrapping the image onto a curved, flexible 3D plane.
* **Dynamic Hotspots**: Pins identified disease spots in 3D space. Users can rotate, zoom, and inspect leaf anatomy in real-time.
* **Procedural 3D Leaf Model**: Includes a gorgeous procedural 3D leaf simulator showing organic curvature and venation patterns.

### 4. 🌾 AI Crop Recommendation
* **Soil & Env Inputs**: Accepts values for Nitrogen (N), Phosphorus (P), Potassium (K), soil pH, temperature, humidity, and rainfall.
* **Machine Learning Classification**: Predicts the optimal crop from 22 supported categories using a Random Forest Classifier.
* **Nutrient Deficit Engine**: Compares inputs against ideal NPK parameters for the recommended crop to output precise deficiency percentages.

### 5. 🧪 Fertilizer Advisor with Scientific Reanalysis
* **ML Recommendation**: Suggests the best fertilizer formula (e.g., Urea, DAP, 10-26-26, 17-17-17) using Random Forest.
* **Agronomic Validation Overlay**: A custom rules engine double-checks the ML recommendation. If the model recommends a nitrogen-heavy fertilizer like Urea when the soil has no nitrogen deficit, or misses a critical potassium deficiency, the engine warns the user and suggests targeted supplement strategies.

### 6. 🌐 Snyc & Offline-First Core
* **Firebase Cloud Snyc**: Integrates with Firebase Firestore and Authentication to save diagnostic history across devices.
* **Seamless Local Fallback**: Operates fully in Local Mode (via LocalStorage) if Firebase configuration is omitted.

### 7. 🗣️ Multi-Lingual Interface
* Full localization support across 5 major languages:
  * 🇬🇧 English (`en`)
  * 🇮🇳 Hindi (`hi`)
  * 🇪🇸 Spanish (`es`)
  * 🇮🇳 Punjabi (`pa`)
  * 🇮🇳 Telugu (`te`)

---

## 📐 Architecture Flow

```mermaid
graph TD
    subgraph Frontend [React Frontend (Vite)]
        UI[Interactive UI & Dashboard]
        ThreeJS[Three.js 3D Leaf Inspector]
        Cam[Camera / File Upload System]
        LS[Local Storage Fallback]
    end

    subgraph Backend [FastAPI Backend]
        API[API Router / Endpoints]
        CV[CV Engine - OpenCV verification & spot detection]
        DL[DL Engine - TensorFlow/Keras CNN Models]
        ML[ML Recommender - Random Forest Models]
        Reanalysis[Scientific Reanalysis & Deficit Engine]
    end

    subgraph Cloud [Cloud Services]
        Firebase[Firebase Authentication & Firestore History]
    end

    Cam -->|Upload leaf image| API
    UI -->|NPK & Environmental input| API
    API --> CV
    CV -->|Valid leaf image| DL
    DL -->|Disease prediction & severity| UI
    CV -->|Disease spot contours| ThreeJS
    API --> ML
    ML --> Reanalysis
    Reanalysis -->|Verified fertilizer recommendation & warnings| UI
    
    UI <-->|Sync diagnosis history| Firebase
    UI <-->|Guest backup storage| LS
```

---

## 📂 Project Structure

```text
Crop-Disease-Detection-System/
├── backend/
│   ├── models/                # Saved ML classifiers & DL model weights (.h5)
│   ├── temp_uploads/          # Temporary folder for processing uploaded leaf images
│   ├── main.py                # FastAPI main entrypoint, routing, and predictions
│   ├── cv_helpers.py          # OpenCV plant validation & disease spot detection
│   ├── treatment_data.py      # Hardcoded agricultural recommendations & treatment guide
│   ├── setup_models.py        # DL weights setup, downloading, and ML model training script
│   └── requirements.txt       # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraCapture.jsx   # Webcam/camera access component
│   │   │   ├── ThreeLeafModel.jsx  # Procedural 3D leaf model simulator
│   │   │   └── ThreeInspector.jsx  # 3D Leaf texture projection and spot pin-pointing
│   │   ├── App.jsx            # Main React SPA interface
│   │   ├── firebase.js        # Firebase configuration & localStorage DB layer fallback
│   │   ├── translations.js    # Multi-language translation dictionaries
│   │   └── main.jsx
│   ├── package.json           # Frontend dependencies (React, Three.js, Lucide, Vite)
│   └── vite.config.js
├── datasets/                  # Directory containing dataset folders (git-ignored)
├── netlify.toml               # Netlify configuration for Single Page Application routing
└── render.yaml                # Render configuration for FastAPI service deployment
```

---

## 🛠️ Installation & Setup

### Prerequisites
* Python 3.10 or higher
* Node.js v18 or higher & npm

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up and train models:
   The `setup_models.py` script automatically copies existing Deep Learning models from local sample directories or retrieves/trains them, and fits the Random Forest recommendations classifiers:
   ```bash
   python setup_models.py
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   The backend API will be running at `http://localhost:8000`. You can inspect interactive Swagger documentation at `http://localhost:8000/docs`.

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   Create a `.env` file in the `frontend/` directory (refer to `.env.example`):
   ```env
   # Endpoint pointing to your backend server
   VITE_API_URL=http://localhost:8000

   # Firebase API (Optional - Snyc and Auth will fallback to LocalStorage if not specified)
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```
4. Run the frontend in development mode:
   ```bash
   npm run dev
   ```
   The app will run locally (typically at `http://localhost:5173`).

---

## 📊 Datasets Used

This system was trained and evaluated using the following public/private datasets:

* **Crop Recommendation Dataset**: 
  * Features NPK, Temperature, Humidity, Soil pH, and Rainfall metrics across 22 distinct crop labels.
  * *Link to dataset: [Insert Link Here]*

* **Fertilizer Prediction Dataset**:
  * Features soil moisture, temperature, humidity, Nitrogen, Phosphorus, Potassium, crop types, and soil types to predict optimal NPK blends.
  * *Link to dataset: [Insert Link Here]*

* **PlantVillage Dataset (Augmented)**:
  * Contains thousands of high-resolution crop leaf images grouped into categories of healthy states and various fungal/bacterial/viral infections.
  * *Link to dataset: [Insert Link Here]*

*(Feel free to paste the exact URL links of your dataset directories or Kaggle pages above to preserve project reproducibility!)*

---

## ☁️ Deployment

* **Backend**: Configured for immediate deployment on **Render.com** (via [render.yaml](file:///d:/Github/TEN/AI/Crop-Disease-Detection-System/render.yaml)).
* **Frontend**: Configured for host services like **Netlify** (via [netlify.toml](file:///d:/Github/TEN/AI/Crop-Disease-Detection-System/netlify.toml)). Ensure you set environment variable `VITE_API_URL` on Netlify to point to your deployed backend URL.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.
