#!/usr/bin/env python3
"""
Target Detection Service
Uses OpenCV to detect bullet holes in target images and map them to coordinates
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import math

app = Flask(__name__)
CORS(app)

def decode_base64_image(base64_string):
    """Decode base64 image string to OpenCV format"""
    # Remove data URI prefix if present
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    img_data = base64.b64decode(base64_string)
    img = Image.open(BytesIO(img_data))
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def detect_red_bullseye(img):
    """
    Detect the red bullseye center using color segmentation
    Returns (x, y, radius) of the red bullseye
    """
    # Convert to HSV for better color detection
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Define range for red color (red wraps around in HSV, so we need two ranges)
    # Lower red (0-10)
    lower_red1 = np.array([0, 100, 100])
    upper_red1 = np.array([10, 255, 255])
    # Upper red (170-180)
    lower_red2 = np.array([170, 100, 100])
    upper_red2 = np.array([180, 255, 255])
    
    # Create masks for both red ranges
    mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
    mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
    red_mask = cv2.bitwise_or(mask1, mask2)
    
    # Clean up the mask with morphological operations
    kernel = np.ones((5, 5), np.uint8)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours in the red mask
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Find the largest red contour (should be the bullseye)
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Get the center and radius using minimum enclosing circle
        (x, y), radius = cv2.minEnclosingCircle(largest_contour)
        
        if radius > 10:  # Make sure it's not too small
            # Estimate target radius based on bullseye size
            # Typically, bullseye is about 1/8 to 1/10 of target diameter
            estimated_target_radius = int(radius * 8)
            
            print(f"✓ Found red bullseye at ({int(x)}, {int(y)}), radius: {int(radius)}")
            print(f"  Estimated target radius: {estimated_target_radius}")
            return int(x), int(y), estimated_target_radius
    
    print("✗ Red bullseye not found, falling back to image center")
    return None

def detect_target_center(img, gray_image):
    """
    Detect the target center - try red bullseye first, then fall back to other methods
    Returns (x, y, radius) of the target center
    """
    # Method 1: Try to find red bullseye (most reliable)
    result = detect_red_bullseye(img)
    if result:
        return result
    
    # Method 2: Fall back to image center
    height, width = gray_image.shape
    print(f"Using image center: ({width // 2}, {height // 2}), radius: {min(width, height) // 3}")
    return width // 2, height // 2, min(width, height) // 3

def calculate_score(distance_from_center, target_radius):
    """
    Calculate score (0-5) based on distance from center
    Uses same scoring zones as the InteractiveTargetInput component
    """
    # Normalize distance to 0-100 range (100 being the outer edge)
    normalized_distance = (distance_from_center / target_radius) * 100
    
    # Score zones (approximate, based on standard bullseye targets)
    # These match the visual rings in the SVG target
    if normalized_distance <= 5:   # Center dot
        return 5
    elif normalized_distance <= 15:  # Inner ring
        return 5
    elif normalized_distance <= 30:  # Second ring
        return 4
    elif normalized_distance <= 45:  # Third ring
        return 3
    elif normalized_distance <= 60:  # Fourth ring
        return 2
    elif normalized_distance <= 80:  # Fifth ring
        return 1
    else:  # Outside or barely on target
        return 0

def detect_bullet_holes(image_data, target_type="bullseye"):
    """
    Detect bullet holes in a target image
    Returns list of detected shots with coordinates and scores
    """
    # Decode image
    img = decode_base64_image(image_data)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Enhanced preprocessing for better detection
    # 1. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray = clahe.apply(gray)
    
    # 2. Apply bilateral filter to reduce noise while keeping edges sharp
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # 3. Apply morphological operations to enhance bullet holes
    kernel = np.ones((3, 3), np.uint8)
    gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
    
    print(f"Image size: {img.shape[1]}x{img.shape[0]}")
    
    # Detect target center and scale using red bullseye
    center_x, center_y, target_radius = detect_target_center(img, gray)
    
    # Create a mask to exclude the red bullseye from detection
    # (we don't want to detect the bullseye as a bullet hole)
    red_mask_inverted = np.ones(gray.shape, dtype=np.uint8) * 255
    bullseye_exclusion_radius = int(target_radius * 0.12)
    cv2.circle(red_mask_inverted, (center_x, center_y), bullseye_exclusion_radius, 0, -1)
    
    # Apply mask to exclude bullseye area
    gray_masked = cv2.bitwise_and(gray, gray, mask=red_mask_inverted)
    
    # Use SimpleBlobDetector instead of HoughCircles (better for irregular holes)
    # Set up detector parameters
    params = cv2.SimpleBlobDetector_Params()
    
    # Filter by area
    params.filterByArea = True
    params.minArea = 10  # Minimum 10 pixels
    params.maxArea = 1000  # Maximum 1000 pixels
    
    # Filter by circularity (allow irregularity for torn holes)
    params.filterByCircularity = True
    params.minCircularity = 0.3  # Very permissive to handle ragged edges
    
    # Filter by convexity
    params.filterByConvexity = True
    params.minConvexity = 0.4  # Allow torn edges
    
    # Filter by inertia (allows elongated holes)
    params.filterByInertia = True
    params.minInertiaRatio = 0.2  # Very permissive for elongated holes
    
    # Filter by color (detect dark blobs)
    params.filterByColor = True
    params.blobColor = 0  # 0 = dark blobs
    
    # Create detector and detect
    detector = cv2.SimpleBlobDetector_create(params)
    keypoints = detector.detect(gray_masked)
    
    print(f"SimpleBlobDetector found {len(keypoints)} blobs")
    
    # Also try inverted image for holes in dark areas (like the black ring)
    gray_inverted = cv2.bitwise_not(gray_masked)
    keypoints_inverted = detector.detect(gray_inverted)
    
    print(f"Inverted detection found {len(keypoints_inverted)} additional blobs")
    
    # Combine detections and remove duplicates
    all_detections = []
    for kp in keypoints:
        all_detections.append((kp.pt[0], kp.pt[1], kp.size / 2))
    for kp in keypoints_inverted:
        all_detections.append((kp.pt[0], kp.pt[1], kp.size / 2))
    
    # Remove duplicates (blobs detected in both passes)
    unique_detections = []
    for detection in all_detections:
        x, y, r = detection
        is_duplicate = False
        for existing in unique_detections:
            ex, ey, er = existing
            distance = math.sqrt((x - ex)**2 + (y - ey)**2)
            if distance < 15:  # Less than 15 pixels apart = duplicate
                is_duplicate = True
                break
        if not is_duplicate:
            unique_detections.append(detection)
    
    print(f"After deduplication: {len(unique_detections)} unique detections")
    
    # Filter detections based on position and size
    valid_detections = []
    for detection in unique_detections:
        hole_x, hole_y, hole_radius = detection
        
        # Calculate distance from center
        distance_from_center = math.sqrt((hole_x - center_x)**2 + (hole_y - center_y)**2)
        
        # Skip if outside target area
        if distance_from_center > target_radius * 1.1:
            print(f"  Skipping detection at ({hole_x:.0f}, {hole_y:.0f}) - outside target boundary")
            continue
        
        # Skip if inside the red bullseye
        if distance_from_center < bullseye_exclusion_radius:
            print(f"  Skipping detection at ({hole_x:.0f}, {hole_y:.0f}) - inside bullseye")
            continue
        
        # Skip if too large (not a bullet hole)
        if hole_radius > target_radius / 10:
            print(f"  Skipping detection at ({hole_x:.0f}, {hole_y:.0f}) - radius too large: {hole_radius:.1f}")
            continue
        
        valid_detections.append(detection)
    
    print(f"Valid bullet holes after filtering: {len(valid_detections)}")
    
    shots = []
    
    if valid_detections:
        for detection in valid_detections:
            hole_x, hole_y, hole_radius = detection
            
            # Calculate distance from target center
            distance = math.sqrt((hole_x - center_x)**2 + (hole_y - center_y)**2)
            
            # Calculate score
            score = calculate_score(distance, target_radius)
            
            # Map to 200x200 coordinate system (matching SVG viewBox)
            # Center is at (100, 100) in SVG coordinates
            normalized_x = ((hole_x - center_x) / target_radius) * 100 + 100
            normalized_y = ((hole_y - center_y) / target_radius) * 100 + 100
            
            # Clamp to valid range
            normalized_x = max(0, min(200, normalized_x))
            normalized_y = max(0, min(200, normalized_y))
            
            shots.append({
                'x': round(normalized_x, 2),
                'y': round(normalized_y, 2),
                'score': int(score),
                'confidence': 0.85  # Could be calculated from Hough accumulator
            })
    
    return {
        'shots': shots,
        'targetCenter': {'x': int(center_x), 'y': int(center_y)},
        'targetRadius': int(target_radius),
        'detectedCount': len(shots)
    }

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'target-detector'})

@app.route('/detect', methods=['POST'])
def detect():
    """
    Main detection endpoint
    Expects JSON with:
    - imageData: base64 encoded image
    - targetType: type of target (default: "bullseye")
    """
    try:
        data = request.get_json()
        
        if not data or 'imageData' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['imageData']
        target_type = data.get('targetType', 'bullseye')
        
        # Detect bullet holes
        result = detect_bullet_holes(image_data, target_type)
        
        return jsonify({
            'success': True,
            'result': result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/detect-batch', methods=['POST'])
def detect_batch():
    """
    Batch detection endpoint for multiple images
    Expects JSON with:
    - images: array of {imageData: base64, bullIndex: number}
    """
    try:
        data = request.get_json()
        
        if not data or 'images' not in data:
            return jsonify({'error': 'No images provided'}), 400
        
        results = []
        
        for img_data in data['images']:
            image_data = img_data.get('imageData')
            bull_index = img_data.get('bullIndex')
            
            if not image_data:
                results.append({
                    'bullIndex': bull_index,
                    'success': False,
                    'error': 'No image data'
                })
                continue
            
            try:
                detection_result = detect_bullet_holes(image_data, 'bullseye')
                results.append({
                    'bullIndex': bull_index,
                    'success': True,
                    'result': detection_result
                })
            except Exception as e:
                results.append({
                    'bullIndex': bull_index,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Target Detection Service on http://localhost:5001")
    print("Endpoints:")
    print("  GET  /health - Health check")
    print("  POST /detect - Single image detection")
    print("  POST /detect-batch - Batch image detection")
    app.run(host='0.0.0.0', port=5001, debug=True)
