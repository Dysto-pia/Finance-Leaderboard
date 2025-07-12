#!/bin/bash

# Navigate to the project directory
cd /Users/aidanwallace/VsCode/Personal/finance_leaderboard

# Initialize a new git repository specifically for this project
rm -rf .git
git init

# Create proper package.json files if they don't exist
if [ ! -d "backend" ]; then
  mkdir -p backend
fi

if [ ! -d "frontend" ]; then
  mkdir -p frontend
fi

echo "# Finance Leaderboard setup completed"
echo "Run the following commands manually:"
echo "1. git add ."
echo "2. git commit -m \"Initial commit\""
echo "3. git remote add origin https://github.com/Dysto-pia/Finance-Leaderboard.git"
echo "4. git push -u origin main"
