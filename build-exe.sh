#!/bin/bash
echo "Building SÉANCE SEARCH.exe for Windows..."
npx electron-builder --win portable --publish never
echo "Rebuilding native modules for Linux server..."
npm rebuild better-sqlite3
echo "Done! Check dist/SEANCE-SEARCH.exe"
