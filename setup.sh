#!/bin/bash

# Quick setup script for TheLex AI App

echo "🚀 Setting up TheLex AI App..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your VITE_BEDROCK_AGENT_ID"
    echo ""
    echo "To find your Agent ID:"
    echo "1. Go to https://console.aws.amazon.com/bedrock/"
    echo "2. Click 'Agents' in the sidebar"
    echo "3. Find 'thelexai-laws-consultant-agent'"
    echo "4. Copy the Agent ID"
    echo ""
    read -p "Press enter to open .env file for editing..."
    ${EDITOR:-nano} .env
else
    echo "✅ .env file already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure your .env has the correct VITE_BEDROCK_AGENT_ID"
echo "2. Run: npm run dev"
echo "3. Open your browser to the URL shown"
echo ""
