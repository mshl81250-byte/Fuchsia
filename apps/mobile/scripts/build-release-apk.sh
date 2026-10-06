#!/usr/bin/env bash
set -euo pipefail

SECURITY_DIR="${FUCHSIA_RELEASE_SECRET_DIR:-$HOME/.config/fuchsia-boutique-release}"
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-$HOME/android-sdk}}"
export ANDROID_HOME
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

if [[ -z "${FUCHSIA_RELEASE_STORE_FILE:-}" ]]; then
  FUCHSIA_RELEASE_STORE_FILE="$SECURITY_DIR/fuchsia-boutique-release.jks"
fi
if [[ -z "${FUCHSIA_RELEASE_STORE_PASSWORD:-}" && -f "$SECURITY_DIR/key-password" ]]; then
  FUCHSIA_RELEASE_STORE_PASSWORD="$(tr -d '\n' < "$SECURITY_DIR/key-password")"
fi
export FUCHSIA_RELEASE_STORE_FILE FUCHSIA_RELEASE_STORE_PASSWORD
export FUCHSIA_RELEASE_KEY_ALIAS="${FUCHSIA_RELEASE_KEY_ALIAS:-fuchsia-boutique-release}"
export FUCHSIA_RELEASE_KEY_PASSWORD="${FUCHSIA_RELEASE_KEY_PASSWORD:-$FUCHSIA_RELEASE_STORE_PASSWORD}"

: "${FUCHSIA_RELEASE_STORE_FILE:?Release keystore not configured}"
: "${FUCHSIA_RELEASE_STORE_PASSWORD:?Release keystore password not configured}"
: "${FUCHSIA_RELEASE_KEY_ALIAS:?Release key alias not configured}"
: "${FUCHSIA_RELEASE_KEY_PASSWORD:?Release key password not configured}"
[[ -f "$FUCHSIA_RELEASE_STORE_FILE" ]] || { echo "Release keystore not found: $FUCHSIA_RELEASE_STORE_FILE" >&2; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../android"
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./gradlew :app:assembleRelease --no-daemon

echo "Release APK: $SCRIPT_DIR/../android/app/build/outputs/apk/release/app-release.apk"
