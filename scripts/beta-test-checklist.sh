#!/bin/bash
# Beta Testing Checklist for QC RocketStart
# Run this manually to verify all features work

echo "🚀 QC RocketStart Beta Testing Checklist"
echo "========================================="
echo ""

echo "1️⃣  TOKEN CREATION TEST"
echo "   □ Go to /trade/create"
echo "   □ Fill in token name, symbol, description"
echo "   □ Upload an image"
echo "   □ Click 'Launch Token'"
echo "   □ Verify token appears in /trade list"
echo ""

echo "2️⃣  TOKEN TRADING TEST"
echo "   □ Click on your created token"
echo "   □ Try buying with TON (use small amount: 0.1 TON)"
echo "   □ Verify balance updates"
echo "   □ Try selling some tokens back"
echo "   □ Verify TON is received"
echo ""

echo "3️⃣  GRADUATION PROGRESS UI TEST"
echo "   □ Check token detail page shows graduation progress bar"
echo "   □ Verify market cap and threshold are displayed correctly"
echo ""

echo "4️⃣  LIVE TRADES TEST"
echo "   □ Make a few trades"
echo "   □ Verify live trades appear in the activity feed"
echo "   □ Check token chat functionality"
echo ""

echo "5️⃣  WALLET FEATURES TEST"
echo "   □ Check wallet balance displays correctly"
echo "   □ Test send TON to another address"
echo "   □ Test receive (QR code generation)"
echo "   □ Test swap functionality"
echo ""

echo "6️⃣  CLOUD FUNCTIONS TEST"
echo "   □ Check graduation status API:"
echo "   curl 'https://us-central1-nekoq-875e2.cloudfunctions.net/getGraduationStatus?tokenId=YOUR_TOKEN_ID'"
echo ""

echo "7️⃣  RATE LIMITING TEST"
echo "   □ Try making more than 10 trades in 1 minute"
echo "   □ Verify rate limit error is shown"
echo ""

echo "✅ If all tests pass, the platform is ready for beta!"
