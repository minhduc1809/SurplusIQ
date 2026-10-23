# Cài 2 app Android lên điện thoại cắm USB, không phụ thuộc địa chỉ Wi-Fi:
# `adb reverse` chuyển cổng 4000 của điện thoại về backend trên máy tính, nên app dùng 127.0.0.1:4000.
# Chạy lại script này (hoặc chỉ `adb reverse tcp:4000 tcp:4000`) mỗi lần rút/cắm lại cáp USB.
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$api = '-PAPI_BASE_URL=http://127.0.0.1:4000/'
& $adb reverse tcp:4000 tcp:4000
foreach ($app in 'android', 'android-merchant') {
  Push-Location "$PSScriptRoot\..\apps\$app"
  .\gradlew.bat :app:assemblePerf $api -q
  & $adb install -r app\build\outputs\apk\perf\app-perf.apk
  Pop-Location
}
