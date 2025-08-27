#!/bin/bash
echo "========================================" 
echo "   DYAD SAFE MODE LAUNCHER"
echo "========================================"
echo ""
echo "Starting Dyad..."

# Kill any stuck processes
taskkill //F //IM electron.exe 2>/dev/null
taskkill //F //IM node.exe 2>/dev/null

# Wait a moment
sleep 2

# Start the app
cd /c/Users/yosiw/dyad-enhanced
npm start