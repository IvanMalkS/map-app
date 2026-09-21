#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Не найден Node.js. Установите Node.js 22.13 или новее." >&2
  exit 1
fi

if [[ ! -f node_modules/expo/bin/cli ]]; then
  echo "Сначала установите зависимости: npm install" >&2
  exit 1
fi

SDK_DIR="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$SDK_DIR" ]]; then
  case "$(uname -s)" in
    Darwin) SDK_DIR="$HOME/Library/Android/sdk" ;;
    Linux) SDK_DIR="$HOME/Android/Sdk" ;;
    *) echo "Укажите путь к Android SDK в ANDROID_HOME." >&2; exit 1 ;;
  esac
fi

for tool in platform-tools/adb emulator/emulator; do
  if [[ ! -x "$SDK_DIR/$tool" ]]; then
    echo "Не найден $SDK_DIR/$tool. Установите Android SDK Platform-Tools и Android Emulator через Android Studio или исправьте ANDROID_HOME." >&2
    exit 1
  fi
done

export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$SDK_DIR/platform-tools:$SDK_DIR/emulator:$PATH"

exec node node_modules/expo/bin/cli start --android --go "$@"
