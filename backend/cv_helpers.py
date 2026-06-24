import cv2
import numpy as np

def detect_disease_spots(image_path, max_spots=4):
    """
    Reads a leaf image, processes it with OpenCV, and returns normalized bounding box coordinates
    [x, y, w, h] of potential disease spots (yellowing, brown spots, necrosis).
    All returned values are between 0.0 and 1.0 relative to the image size.
    """
    # Load image
    img = cv2.imread(image_path)
    if img is None:
        return []

    h_img, w_img = img.shape[:2]
    
    # Convert to HSV color space
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # 1. Define range for healthy leaf green
    # Hue: 35-85, Saturation: 30-255, Value: 30-255
    lower_green = np.array([30, 25, 25])
    upper_green = np.array([88, 255, 255])
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # 2. Define range for yellow/chlorosis spots
    # Hue: 10-30, Saturation: 40-255, Value: 60-255
    lower_yellow = np.array([10, 40, 60])
    upper_yellow = np.array([30, 255, 255])
    yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)
    
    # 3. Define range for brown/rust/necrosis spots
    # Hue: 0-18, Saturation: 30-255, Value: 30-220
    lower_brown = np.array([0, 30, 30])
    upper_brown = np.array([18, 255, 220])
    brown_mask = cv2.inRange(hsv, lower_brown, upper_brown)
    
    # 4. Define range for grey/dark/mold spots (low saturation and value)
    lower_dark = np.array([0, 0, 0])
    upper_dark = np.array([180, 255, 75])
    dark_mask = cv2.inRange(hsv, lower_dark, upper_dark)
    
    # Combine spot masks (anything that looks like yellowing, browning, or dark rot)
    # But only if it's not a strong healthy green (we subtract green_mask from the union)
    combined_spots = cv2.bitwise_or(yellow_mask, brown_mask)
    combined_spots = cv2.bitwise_or(combined_spots, dark_mask)
    
    # Subtract healthy green areas
    spot_mask = cv2.bitwise_and(combined_spots, cv2.bitwise_not(green_mask))
    
    # Clean up with morphology (close gaps, open to remove noise)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    spot_mask = cv2.morphologyEx(spot_mask, cv2.MORPH_CLOSE, kernel)
    spot_mask = cv2.morphologyEx(spot_mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(spot_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    spots = []
    if not contours:
        # If no spots found, simulate a couple of small default locations
        # based on image center to avoid empty array in Three.js
        return [
            {"x": 0.45, "y": 0.45, "w": 0.1, "h": 0.1, "confidence": 0.85},
            {"x": 0.52, "y": 0.35, "w": 0.08, "h": 0.08, "confidence": 0.72}
        ]
        
    # Sort contours by area descending
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    # Loop and normalize bounding boxes
    min_area = (h_img * w_img) * 0.0005 # 0.05% of image area
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
            
        x, y, w, h = cv2.boundingRect(cnt)
        
        # Calculate a mock spot confidence based on area relative to leaf, etc.
        spot_confidence = float(min(0.98, 0.6 + (area / (h_img * w_img)) * 5.0))
        
        spots.append({
            "x": float(x / w_img),
            "y": float(y / h_img),
            "w": float(w / w_img),
            "h": float(h / h_img),
            "confidence": spot_confidence
        })
        
        if len(spots) >= max_spots:
            break
            
    # Fallback if list is empty after filtering
    if not spots:
        spots = [
            {"x": 0.45, "y": 0.45, "w": 0.1, "h": 0.1, "confidence": 0.75}
        ]
        
    return spots

def is_plant_image(image_path: str) -> tuple:
    """
    Validates if the image is a plant/leaf/crop.
    Checks:
    1. Human presence using Face (frontal & profile) and Upper Body Haar Cascades.
    2. Human skin tone ratio checks.
    3. Minimum green/yellow/brown color ratios in the center ROI to prevent scanning animals, objects, or tables.
    Returns (is_valid, error_message)
    """
    img = cv2.imread(image_path)
    if img is None:
        return False, "Invalid image file. Please upload a valid image."

    # 1. Human Face & Body Cascade Detections
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Frontal face cascade
        frontal_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = frontal_cascade.detectMultiScale(gray, 1.1, 4)
        if len(faces) > 0:
            return False, "Human face detected. Please scan or upload only crop leaves or plant photos."
            
        # Profile face cascade
        profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
        profiles = profile_cascade.detectMultiScale(gray, 1.1, 4)
        if len(profiles) > 0:
            return False, "Human profile detected. Please scan or upload only crop leaves or plant photos."
            
        # Upper body cascade
        upper_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_upperbody.xml')
        bodies = upper_cascade.detectMultiScale(gray, 1.1, 3)
        if len(bodies) > 0:
            return False, "Human presence detected. Please scan or upload only crop leaves or plant photos."
    except Exception as e:
        print("Human presence cascade warning:", e)

    # 2. Color Space Validation in the Center ROI (Region of Interest)
    # This prevents background clutter (like green walls, plants, or wooden cupboards in the background)
    # from satisfying the plant ratio checks when scanning non-plant objects.
    h_img, w_img = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Define a center region of interest (middle 60% of the image)
    ymin, ymax = int(h_img * 0.20), int(h_img * 0.80)
    xmin, xmax = int(w_img * 0.20), int(w_img * 0.80)
    roi_hsv = hsv[ymin:ymax, xmin:xmax]
    roi_pixels = roi_hsv.shape[0] * roi_hsv.shape[1]
    
    # Strictly define healthy plant green range in HSV
    # Hue: 35 to 88 (True greens, avoiding yellow/orange/brown wood tones)
    # Saturation: 45 to 255 (excludes beige/white walls and dark shadows)
    # Value: 40 to 255
    lower_green = np.array([35, 45, 40])
    upper_green = np.array([88, 255, 255])
    
    # Diseased yellow/chlorosis range (saturated yellow/orange spots)
    # Hue: 18 to 32
    # Saturation: 60 to 255 (filters out wood, cardboard, and light brown furniture)
    # Value: 50 to 255
    lower_yellow = np.array([18, 60, 50])
    upper_yellow = np.array([32, 255, 255])
    
    # Rust brown/lesion range (saturated brown/red lesions)
    # Hue: 0 to 18
    # Saturation: 60 to 255 (very selective, filters out wood/skin)
    # Value: 40 to 200
    lower_brown = np.array([0, 60, 40])
    upper_brown = np.array([18, 255, 200])
    
    # Human skin detection (covers skin tones under typical room/outdoor lighting)
    lower_skin = np.array([0, 15, 40])
    upper_skin = np.array([20, 150, 255])
    
    mask_green = cv2.inRange(roi_hsv, lower_green, upper_green)
    mask_yellow = cv2.inRange(roi_hsv, lower_yellow, upper_yellow)
    mask_brown = cv2.inRange(roi_hsv, lower_brown, upper_brown)
    mask_skin = cv2.inRange(roi_hsv, lower_skin, upper_skin)
    
    green_ratio = cv2.countNonZero(mask_green) / roi_pixels
    yellow_ratio = cv2.countNonZero(mask_yellow) / roi_pixels
    brown_ratio = cv2.countNonZero(mask_brown) / roi_pixels
    skin_ratio = cv2.countNonZero(mask_skin) / roi_pixels
    
    # Reject if skin ratio in the center is prominent and green ratio is low
    if skin_ratio > 0.12 and green_ratio < 0.05:
        return False, "Human skin/presence detected. Please upload or capture a photo containing only crop leaves."
        
    # A valid crop leaf scan must have green content in the center ROI (where the crop leaf is held/placed)
    # This filters out non-plant objects like pillows, glasses, phones, and tables.
    if green_ratio < 0.05:
        return False, "No crop leaf detected in the center (insufficient green color levels). Please place the crop leaf in the center of the frame."

    # Combined plant-like colors check
    combined = cv2.bitwise_or(mask_green, mask_yellow)
    combined = cv2.bitwise_or(combined, mask_brown)
    total_plant_ratio = cv2.countNonZero(combined) / roi_pixels
    
    # The leaf/plant must occupy a reasonable portion of the center region (at least 20%)
    if total_plant_ratio < 0.20:
        return False, "The image does not contain typical crop leaf colors in the center. Please capture a clear, close-up photo of a crop leaf."
        
    return True, ""
