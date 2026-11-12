#!/usr/bin/env bash
# Build a signed offline APK from an HTML5 game folder (no Gradle).
# Usage: build.sh <appId> "<Name>" <gameDir> <versionCode> <versionName> <icon512.png> <orientation> <out.apk>
# Signing: env KEYSTORE, KS_PASS, KEY_ALIAS (keystore is NEVER stored in this repo).
set -euo pipefail
APP_ID=$1; NAME=$2; SRC=$3; VCODE=$4; VNAME=$5; ICON=$6; ORIENT=$7; OUT=$8
SDK=${ANDROID_HOME:-/opt/android}; BT=$SDK/build-tools/35.0.0; JAR=$SDK/platforms/android-34/android.jar
HERE=$(cd "$(dirname "$0")" && pwd); W=$(mktemp -d)
mkdir -p "$W/res/values" "$W/assets/www" "$W/classes" "$W/dex"
for d in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
  mkdir -p "$W/res/mipmap-${d%%:*}"; convert "$ICON" -resize "${d##*:}x${d##*:}" "$W/res/mipmap-${d%%:*}/ic_launcher.png"
done
NAME_X=$(printf '%s' "$NAME" | sed "s/&/\&amp;/g; s/'/\\\\'/g")
printf '<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">%s</string></resources>\n' "$NAME_X" > "$W/res/values/strings.xml"
sed "s/@APP_ID@/$APP_ID/; s/@VCODE@/$VCODE/; s/@VNAME@/$VNAME/; s/@ORIENT@/$ORIENT/" "$HERE/AndroidManifest.template.xml" > "$W/AndroidManifest.xml"
cp -r "$SRC"/. "$W/assets/www/"
"$BT/aapt2" compile --dir "$W/res" -o "$W/res.zip"
"$BT/aapt2" link -o "$W/base.apk" -I "$JAR" --manifest "$W/AndroidManifest.xml" -A "$W/assets" "$W/res.zip"
javac -g:none -source 8 -target 8 -nowarn -Xlint:-options -bootclasspath "$JAR" -cp "$JAR" -d "$W/classes" "$HERE"/src/ro/catalonec/wrap/*.java 2>&1 | grep -v 'warning' || true
"$BT/d8" --release --min-api 22 --lib "$JAR" --output "$W/dex" $(find "$W/classes" -name '*.class')
(cd "$W/dex" && zip -q "$W/base.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$W/base.apk" "$W/aligned.apk"
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --ks-key-alias "$KEY_ALIAS" --out "$OUT" "$W/aligned.apk"
"$BT/apksigner" verify "$OUT" && echo "OK $OUT ($(du -h "$OUT" | cut -f1))"
rm -rf "$W"
