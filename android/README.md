# Android wrapper (offline WebView)

Builds a signed APK from any HTML5 game folder, without Gradle:

```
KEYSTORE=... KS_PASS=... KEY_ALIAS=catalonec \
android/build.sh ro.catalonec.stargarden "Star Garden" <gameDir> 1 1.6 pwa/icons/icon-512.png portrait out.apk
```

Needs Android SDK (`platforms;android-34`, `build-tools;35.0.0`), JDK, ImageMagick, zip.
The signing keystore is kept outside this repository.
