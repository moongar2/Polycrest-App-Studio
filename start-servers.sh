#!/bin/bash
# ==============================================================================
# PolyCrest App Studio - Dual Server Launcher
# Starts both the AppEngine Web DevServer and the Android BuildServer
# ==============================================================================

PROJECT_DIR="/Users/mungafredrick/mit"
JAVA11_HOME="/opt/homebrew/opt/openjdk@11"
JAVA17_HOME="/opt/homebrew/opt/openjdk@17"
GCLOUD_BIN="/opt/homebrew/share/google-cloud-sdk/bin"

echo "=================================================="
echo "⚡ Starting PolyCrest App Studio Services"
echo "=================================================="

# 1. Start Android BuildServer (Port 9990)
echo "🚀 [1/2] Launching Android BuildServer on port 9990..."
mkdir -p "$PROJECT_DIR/appinventor/build/buildserver/dexCache"
export JAVA_HOME="$JAVA11_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

(cd "$PROJECT_DIR/appinventor/buildserver/build/run/lib" && \
  java -Dfile.encoding=UTF-8 \
       -Dkeystore.pkcs12.legacy=true \
       -Djava.awt.headless=true \
       -cp "*" com.google.appinventor.buildserver.BuildServer \
       --dexCacheDir "$PROJECT_DIR/appinventor/build/buildserver/dexCache" \
       --shutdownToken token) > "$PROJECT_DIR/buildserver.log" 2>&1 &

BUILD_PID=$!
echo "   BuildServer running (PID: $BUILD_PID) -> http://localhost:9990/buildserver"

# 2. Start AppEngine Dev Server (Port 8888)
echo "🌐 [2/2] Launching PolyCrest Studio DevServer on port 8888..."
export JAVA_HOME="$JAVA17_HOME"
export PATH="$JAVA_HOME/bin:$GCLOUD_BIN:$PATH"

cd "$PROJECT_DIR"
java_dev_appserver.sh --port=8888 --address=0.0.0.0 appinventor/appengine/build/war
