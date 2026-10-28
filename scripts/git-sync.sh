#!/usr/bin/env bash
# ==============================================================================
# Utsav Git Sync Utility
# Safely pushes commits to GitHub using GITHUB_TOKEN from .env without
# storing credentials in Git configuration or remote URLs.
# ==============================================================================

set -e

# Load .env if present
if [ -f .env ]; then
  # Read variables safely without running arbitrary commands
  GITHUB_TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')
  GITHUB_REPO=$(grep -E '^GITHUB_REPO=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')
fi

# Fallback to system environment variable if set
GITHUB_TOKEN="${GITHUB_TOKEN:-$GH_TOKEN}"
GITHUB_REPO="${GITHUB_REPO:-hitanshuac/utsav}"

if [ -z "$GITHUB_TOKEN" ] || [ "$GITHUB_TOKEN" = "YOUR_GITHUB_PAT_HERE" ]; then
  echo "❌ Error: GITHUB_TOKEN is not configured in .env"
  echo "👉 Please edit .env and set GITHUB_TOKEN=\"your_new_github_pat\""
  echo "   (Generate a token with 'repo' scope at: https://github.com/settings/tokens)"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

echo "🚀 Syncing branch '${BRANCH}' to https://github.com/${GITHUB_REPO}..."

# Push using authenticated URL ephemerally
git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git" "${BRANCH}"

# Guarantee that the local remote URL remains clean and public
git remote set-url origin "https://github.com/${GITHUB_REPO}.git"

echo "✅ Successfully synced to https://github.com/${GITHUB_REPO}"
