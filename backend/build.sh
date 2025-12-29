#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Initialize database tables
python database.py
