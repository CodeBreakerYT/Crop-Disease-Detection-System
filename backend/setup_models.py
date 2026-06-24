"""
=============================================================================
  AgriShield — Model Setup Script
=============================================================================
  This script does two things:
  1. COPIES pre-trained DL models (CNN .h5 files from AgriGo sample project)
     into backend/models/DL_models/
  2. RETRAINS ML models (crop & fertilizer recommenders) from the CSV datasets
     in sample/AgriGo/AgriGo/dataset/ and saves them to backend/models/ML_models/

  Optionally it can also RETRAIN the DL models from scratch using the augmented
  PlantVillage dataset (takes 30-90 min per crop on CPU / 5-15 min on GPU).

  Run:
      python setup_models.py             # copy DL + retrain ML
      python setup_models.py --retrain   # also retrain all DL models from scratch
      python setup_models.py --crop tomato --retrain  # retrain one specific crop
=============================================================================
"""

import os
import sys
import shutil
import pickle
import argparse
import numpy as np

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_DIR  = os.path.dirname(BASE_DIR)

AGRIGO_DIR     = os.path.join(WORKSPACE_DIR, "sample", "AgriGo", "AgriGo")
SRC_DL_DIR     = os.path.join(AGRIGO_DIR, "models", "DL_models")
SRC_ML_DIR     = os.path.join(AGRIGO_DIR, "models", "ML_models")
SRC_DATASET    = os.path.join(AGRIGO_DIR, "dataset")

# Primary augmented image dataset
AUGMENTED_DATASET_TRAIN = os.path.join(
    WORKSPACE_DIR, "datasets",
    "New Plant Diseases Dataset(Augmented)",
    "New Plant Diseases Dataset(Augmented)", "train"
)
AUGMENTED_DATASET_VALID = os.path.join(
    WORKSPACE_DIR, "datasets",
    "New Plant Diseases Dataset(Augmented)",
    "New Plant Diseases Dataset(Augmented)", "valid"
)

# Destination — backend/models/
DST_MODELS_DIR = os.path.join(BASE_DIR, "models")
DST_DL_DIR     = os.path.join(DST_MODELS_DIR, "DL_models")
DST_ML_DIR     = os.path.join(DST_MODELS_DIR, "ML_models")

os.makedirs(DST_DL_DIR, exist_ok=True)
os.makedirs(DST_ML_DIR, exist_ok=True)

# ── Crop → class mapping (matches main.py exactly) ─────────────────────────
CROP_CLASS_MAP = {
    "apple":      ["Apple___Apple_scab", "Apple___Black_rot",
                   "Apple___Cedar_apple_rust", "Apple___healthy"],
    "cherry":     ["Cherry_(including_sour)___Powdery_mildew",
                   "Cherry_(including_sour)___healthy"],
    "corn":       ["Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
                   "Corn_(maize)___Common_rust_",
                   "Corn_(maize)___Northern_Leaf_Blight",
                   "Corn_(maize)___healthy"],
    "grape":      ["Grape___Black_rot", "Grape___Esca_(Black_Measles)",
                   "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)", "Grape___healthy"],
    "patato":     ["Potato___Early_blight", "Potato___Late_blight", "Potato___healthy"],
    "peach":      ["Peach___Bacterial_spot", "Peach___healthy"],
    "pepper":     ["Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy"],
    "strawberry": ["Strawberry___Leaf_scorch", "Strawberry___healthy"],
    "tomato":     ["Tomato___Bacterial_spot", "Tomato___Early_blight",
                   "Tomato___Late_blight", "Tomato___Leaf_Mold",
                   "Tomato___Septoria_leaf_spot",
                   "Tomato___Spider_mites Two-spotted_spider_mite",
                   "Tomato___Target_Spot",
                   "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
                   "Tomato___Tomato_mosaic_virus", "Tomato___healthy"],
}

ALL_CROPS = list(CROP_CLASS_MAP.keys())


# =============================================================================
#  STEP 1 — Copy pre-trained DL models from AgriGo sample
# =============================================================================
def copy_pretrained_dl_models(target_crops=None):
    """
    Copies the pre-trained .h5 CNN models that ship with the AgriGo sample
    project into backend/models/DL_models/.
    These models were trained on PlantVillage with 224×224 input and achieve
    ~95% validation accuracy.
    """
    print("\n" + "="*60)
    print("  STEP 1: Copying pre-trained DL models from AgriGo sample")
    print("="*60)

    if not os.path.isdir(SRC_DL_DIR):
        print(f"[ERROR] Source DL model directory not found:\n  {SRC_DL_DIR}")
        return False

    crops_to_copy = target_crops if target_crops else ALL_CROPS
    copied = 0
    for crop in crops_to_copy:
        src = os.path.join(SRC_DL_DIR, f"{crop}_model.h5")
        dst = os.path.join(DST_DL_DIR, f"{crop}_model.h5")
        if os.path.isfile(src):
            shutil.copy2(src, dst)
            size_mb = os.path.getsize(dst) / (1024 * 1024)
            print(f"  ✓  {crop}_model.h5  ({size_mb:.1f} MB)")
            copied += 1
        else:
            print(f"  ✗  {crop}_model.h5  — NOT FOUND at {src}")

    print(f"\n  Copied {copied}/{len(crops_to_copy)} DL models → {DST_DL_DIR}")
    return copied > 0


# =============================================================================
#  STEP 2 — Retrain ML models (crop & fertilizer recommenders)
# =============================================================================
def train_ml_models():
    """
    Retrains the crop recommendation and fertilizer recommendation
    Random Forest classifiers from the CSV datasets and saves them as
    .pkl files in backend/models/ML_models/.
    """
    print("\n" + "="*60)
    print("  STEP 2: Training ML Recommendation Models")
    print("="*60)

    try:
        import pandas as pd
        from sklearn.preprocessing import StandardScaler
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import cross_val_score
    except ImportError as e:
        print(f"[ERROR] Missing Python package: {e}")
        print("  Run:  pip install pandas scikit-learn")
        return False

    # ── 2a. Crop Recommender ─────────────────────────────────────────────
    print("\n  [2a] Crop Recommender — loading dataset...")
    crop_csv = os.path.join(SRC_DATASET, "Crop_recommendation.csv")

    if not os.path.isfile(crop_csv):
        print(f"  [ERROR] Not found: {crop_csv}")
    else:
        df = pd.read_csv(crop_csv)
        print(f"       Loaded {len(df)} rows, columns: {list(df.columns)}")

        CROPS_LIST = [
            'apple', 'banana', 'blackgram', 'chickpea', 'coconut', 'coffee',
            'cotton', 'grapes', 'jute', 'kidneybeans', 'lentil', 'maize',
            'mango', 'mothbeans', 'mungbean', 'muskmelon', 'orange', 'papaya',
            'pigeonpeas', 'pomegranate', 'rice', 'watermelon'
        ]

        X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']].values
        y = np.array([CROPS_LIST.index(c.lower().strip()) for c in df['label']])

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = RandomForestClassifier(
            n_estimators=200, max_depth=None,
            min_samples_split=2, random_state=42, n_jobs=-1
        )
        model.fit(X_scaled, y)

        # Quick cross-val accuracy
        scores = cross_val_score(model, X_scaled, y, cv=5, scoring='accuracy')
        print(f"       CV Accuracy: {scores.mean()*100:.2f}% ± {scores.std()*100:.2f}%")

        with open(os.path.join(DST_ML_DIR, "crop_scaler.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        with open(os.path.join(DST_ML_DIR, "crop_model.pkl"), "wb") as f:
            pickle.dump(model, f)

        print(f"  ✓  crop_model.pkl  +  crop_scaler.pkl  → {DST_ML_DIR}")

    # ── 2b. Fertilizer Recommender ───────────────────────────────────────
    print("\n  [2b] Fertilizer Recommender — loading dataset...")
    fert_csv = os.path.join(SRC_DATASET, "Fertilizer Prediction.csv")

    if not os.path.isfile(fert_csv):
        print(f"  [ERROR] Not found: {fert_csv}")
    else:
        df = pd.read_csv(fert_csv)
        df.columns = [c.strip() for c in df.columns]
        print(f"       Loaded {len(df)} rows, columns: {list(df.columns)}")

        FERTILIZER_CLASSES = ['10-26-26', '14-35-14', '17-17-17', '20-20', '28-28', 'DAP', 'Urea']
        SOIL_MAP  = {'Black': 0, 'Clayey': 1, 'Loamy': 2, 'Red': 3, 'Sandy': 4}
        CROP_MAP  = {
            'Barley': 0, 'Cotton': 1, 'Ground Nuts': 2, 'Maize': 3,
            'Millets': 4, 'Oil seeds': 5, 'Paddy': 6, 'Pulses': 7,
            'Sugarcane': 8, 'Tobacco': 9, 'Wheat': 10
        }

        X_num = df[['Temparature', 'Humidity', 'Moisture',
                    'Nitrogen', 'Phosphorous', 'Potassium']].values
        scaler = StandardScaler()
        X_num_scaled = scaler.fit_transform(X_num)

        soil_enc = np.array([SOIL_MAP[s.strip()] for s in df['Soil Type']]).reshape(-1, 1)
        crop_enc = np.array([CROP_MAP[c.strip()] for c in df['Crop Type']]).reshape(-1, 1)

        X_combined = np.concatenate([X_num_scaled, soil_enc, crop_enc], axis=1)
        y = np.array([FERTILIZER_CLASSES.index(f.strip()) for f in df['Fertilizer Name']])

        model = RandomForestClassifier(
            n_estimators=200, max_depth=None,
            min_samples_split=2, random_state=42, n_jobs=-1
        )
        model.fit(X_combined, y)

        scores = cross_val_score(model, X_combined, y, cv=5, scoring='accuracy')
        print(f"       CV Accuracy: {scores.mean()*100:.2f}% ± {scores.std()*100:.2f}%")

        with open(os.path.join(DST_ML_DIR, "fertilizer_scaler.pkl"), "wb") as f:
            pickle.dump(scaler, f)
        with open(os.path.join(DST_ML_DIR, "fertilizer_model.pkl"), "wb") as f:
            pickle.dump(model, f)

        print(f"  ✓  fertilizer_model.pkl  +  fertilizer_scaler.pkl  → {DST_ML_DIR}")

    return True


# =============================================================================
#  STEP 3 (OPTIONAL) — Retrain DL models from PlantVillage dataset
# =============================================================================
def retrain_dl_model(crop_key: str):
    """
    Trains a CNN (MobileNetV2 transfer learning) for a single crop from the
    augmented PlantVillage dataset.  Input: 224×224, Output: per-crop softmax.
    Saves to backend/models/DL_models/{crop_key}_model.h5
    """
    print(f"\n  [DL Retrain] Crop: {crop_key}")

    try:
        import tensorflow as tf
    except ImportError:
        print("  [ERROR] TensorFlow not installed.  Run:  pip install tensorflow")
        return False

    classes = CROP_CLASS_MAP[crop_key]
    num_classes = len(classes)
    IMG_SIZE = 224
    BATCH    = 32
    EPOCHS   = 15

    # ── Build per-crop image generators from the augmented dataset ───────
    if not os.path.isdir(AUGMENTED_DATASET_TRAIN):
        print(f"  [ERROR] Dataset not found: {AUGMENTED_DATASET_TRAIN}")
        return False

    # Filter only the subdirs relevant to this crop
    train_dirs = [d for d in os.listdir(AUGMENTED_DATASET_TRAIN) if d in classes]
    if not train_dirs:
        print(f"  [WARN] No matching class folders found in train dir for {crop_key}")
        print(f"         Expected: {classes}")
        return False

    print(f"  Classes found in dataset: {train_dirs}")

    # Create a temporary symlinked directory with only this crop's classes
    import tempfile, os
    tmp_train = tempfile.mkdtemp(prefix=f"dl_train_{crop_key}_")
    tmp_valid = tempfile.mkdtemp(prefix=f"dl_valid_{crop_key}_")

    try:
        for cls in classes:
            src_t = os.path.join(AUGMENTED_DATASET_TRAIN, cls)
            src_v = os.path.join(AUGMENTED_DATASET_VALID, cls)
            if os.path.isdir(src_t):
                # Use junctions on Windows to avoid copying gigabytes of data
                dst_t = os.path.join(tmp_train, cls)
                dst_v = os.path.join(tmp_valid, cls)
                try:
                    os.symlink(src_t, dst_t)
                except (OSError, NotImplementedError):
                    shutil.copytree(src_t, dst_t)
            if os.path.isdir(src_v):
                try:
                    os.symlink(src_v, dst_v)
                except (OSError, NotImplementedError):
                    shutil.copytree(src_v, dst_v)

        from tensorflow.keras.preprocessing.image import ImageDataGenerator
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras import layers, models, callbacks

        datagen_train = ImageDataGenerator(
            rescale=1.0/255,
            rotation_range=15,
            width_shift_range=0.1,
            height_shift_range=0.1,
            horizontal_flip=True,
            zoom_range=0.1
        )
        datagen_valid = ImageDataGenerator(rescale=1.0/255)

        train_gen = datagen_train.flow_from_directory(
            tmp_train, target_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH, classes=classes,
            class_mode='categorical', shuffle=True
        )
        valid_gen = datagen_valid.flow_from_directory(
            tmp_valid, target_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH, classes=classes,
            class_mode='categorical', shuffle=False
        )

        if train_gen.samples == 0:
            print(f"  [ERROR] No training images found for {crop_key}")
            return False

        print(f"  Train samples: {train_gen.samples} | Valid samples: {valid_gen.samples}")

        # ── MobileNetV2 Transfer Learning ─────────────────────────────────
        base = MobileNetV2(
            input_shape=(IMG_SIZE, IMG_SIZE, 3),
            include_top=False, weights='imagenet'
        )
        # Freeze base, train only top layers
        base.trainable = False

        model = models.Sequential([
            base,
            layers.GlobalAveragePooling2D(),
            layers.BatchNormalization(),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation='softmax')
        ])

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

        model.summary()

        save_path = os.path.join(DST_DL_DIR, f"{crop_key}_model.h5")
        cbs = [
            callbacks.ModelCheckpoint(
                save_path, monitor='val_accuracy',
                save_best_only=True, verbose=1
            ),
            callbacks.EarlyStopping(
                monitor='val_loss', patience=4,
                restore_best_weights=True, verbose=1
            ),
            callbacks.ReduceLROnPlateau(
                monitor='val_loss', factor=0.5,
                patience=2, min_lr=1e-6, verbose=1
            )
        ]

        print(f"\n  Training {crop_key} model  ({EPOCHS} epochs max)...")
        history = model.fit(
            train_gen,
            epochs=EPOCHS,
            validation_data=valid_gen,
            callbacks=cbs,
            verbose=1
        )

        # Fine-tune: unfreeze last 30 layers
        print("\n  Fine-tuning last 30 layers of MobileNetV2...")
        base.trainable = True
        for layer in base.layers[:-30]:
            layer.trainable = False

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )

        model.fit(
            train_gen,
            epochs=5,
            validation_data=valid_gen,
            callbacks=cbs,
            verbose=1
        )

        best_val_acc = max(history.history.get('val_accuracy', [0]))
        print(f"\n  ✓  {crop_key}_model.h5 saved  (best val_acc ≈ {best_val_acc*100:.1f}%)")
        return True

    finally:
        # Clean up temp symlink dirs
        for d in [tmp_train, tmp_valid]:
            try:
                shutil.rmtree(d, ignore_errors=True)
            except Exception:
                pass


# =============================================================================
#  Update main.py model paths to point to backend/models/
# =============================================================================
def update_main_py_paths():
    """
    Patches main.py so DL_MODELS_DIR and ML_MODELS_DIR point to
    backend/models/ instead of sample/AgriGo/...
    """
    main_py = os.path.join(BASE_DIR, "main.py")
    if not os.path.isfile(main_py):
        return

    with open(main_py, "r", encoding="utf-8") as f:
        content = f.read()

    new_dl = 'DL_MODELS_DIR = os.path.join(BASE_DIR, "models", "DL_models")'
    new_ml = 'ML_MODELS_DIR = os.path.join(BASE_DIR, "models", "ML_models")'

    # Replace the old AgriGo-relative paths
    import re
    content = re.sub(
        r'DL_MODELS_DIR\s*=\s*os\.path\.join\(.*?DL_models.*?\)',
        new_dl, content
    )
    content = re.sub(
        r'ML_MODELS_DIR\s*=\s*os\.path\.join\(.*?ML_models.*?\)',
        new_ml, content
    )
    # Remove AGRIGO_DIR, SAMPLE_DIR lines if present and replace with comment
    content = re.sub(r'SAMPLE_DIR\s*=.*\n', '', content)
    content = re.sub(r'AGRIGO_DIR\s*=.*\n', '', content)

    with open(main_py, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n  ✓  Updated model paths in main.py → backend/models/")


# =============================================================================
#  Main Entry Point
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="AgriShield Model Setup — copy pre-trained DL + retrain ML models"
    )
    parser.add_argument(
        "--retrain", action="store_true",
        help="Also retrain DL models from PlantVillage dataset (slow on CPU)"
    )
    parser.add_argument(
        "--crop", type=str, default=None,
        help=f"Retrain a single crop only. Choices: {ALL_CROPS}"
    )
    parser.add_argument(
        "--ml-only", action="store_true",
        help="Only retrain ML models, skip DL copy/train"
    )
    args = parser.parse_args()

    print("\n" + "="*60)
    print("  AgriShield — Model Setup")
    print("="*60)
    print(f"  Backend dir : {BASE_DIR}")
    print(f"  Output dir  : {DST_MODELS_DIR}")

    if not args.ml_only:
        if args.retrain:
            # Retrain DL from scratch
            crops_to_train = [args.crop] if args.crop else ALL_CROPS
            for crop in crops_to_train:
                if crop not in CROP_CLASS_MAP:
                    print(f"  [ERROR] Unknown crop '{crop}'. Choices: {ALL_CROPS}")
                    continue
                retrain_dl_model(crop)
        else:
            # Copy pre-trained models (fast)
            copy_pretrained_dl_models()

    # Always retrain ML models (takes only seconds)
    train_ml_models()

    # Patch main.py paths
    update_main_py_paths()

    print("\n" + "="*60)
    print("  Setup complete!  Models are in:")
    print(f"    DL models : {DST_DL_DIR}")
    print(f"    ML models : {DST_ML_DIR}")
    print("\n  Start the backend with:")
    print("    uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
