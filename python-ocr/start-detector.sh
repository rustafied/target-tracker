#!/bin/bash

# Start Target Detection Service
# This script activates the Python virtual environment and starts the Flask service

echo "Starting Target Detection Service..."
echo "======================================"
echo ""

# Navigate to the python-ocr directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found!"
    echo "Please create it first:"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if required packages are installed
echo "Checking dependencies..."
python3 -c "import cv2, flask, flask_cors, numpy, PIL" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing required packages..."
    pip install -r requirements.txt
fi

echo ""
echo "Starting Flask service on http://localhost:5001"
echo "Press Ctrl+C to stop"
echo "======================================"
echo ""

# Start the service
python3 target_detector.py
