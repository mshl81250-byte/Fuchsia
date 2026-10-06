#!/usr/bin/env bash
set -euo pipefail

: "${FUCHSIA_RELEASE_STORE_FILE:?Set the absolute path to the Fuchsia release keystore}"
: "${FUCHSIA_RELEASE_STORE_PASSWORD:?Set the release keystore password}"
: "${FUCHSIA_RELEASE_KEY_ALIAS:?Set the release key alias}"
: "${FUCHSIA_RELEASE_KEY_PASSWORD:?Set the release key password}"

if [[ ! -f "$FUCHSIA_RELEASE_STORE_FILE" ]]; then
  echo "Release keystore not found: $FUCHSIA_RELEASE_STORE_FILE" >&2
  exit 2
fi

export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/android-sdk}}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

CI=1 pnpm exec expo prebuild --platform android
cd android
./gradlew :app:assembleRelease --no-daemon

echo "Release APK: $SCRIPT_DIR/../android/app/build/outputs/apk/release/app-release.apk"
