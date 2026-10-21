"""Smoke test app khách hàng trên emulator đang chạy (đã đăng nhập customer@surplusiq.vn).
Chạy: python scripts/test-android-customer-smoke.py   (cần adb, emulator, backend local, app đã cài)
Mỗi bước tìm chữ thật trên màn hình qua uiautomator; không giả lập dữ liệu.
"""
import os, re, subprocess, sys, time

ADB = os.environ.get("ADB") or os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")
PKG = "com.surplusiq.app"


def adb(*a):
    return subprocess.run([ADB, *a], capture_output=True).stdout.decode("utf-8", "replace")


def screen():
    adb("shell", "uiautomator", "dump", "/sdcard/u.xml")
    return adb("exec-out", "cat", "/sdcard/u.xml")


def texts():
    return re.findall(r'text="([^"]+)"', screen())


def tap(label, contains=False):
    for m in re.finditer(r'text="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', screen()):
        if m.group(1) == label or (contains and label in m.group(1)):
            x1, y1, x2, y2 = map(int, m.groups()[1:])
            adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
            time.sleep(2.5)
            return True
    return False


def has(*needles, wait=6):
    end = time.time() + wait
    while time.time() < end:
        t = " | ".join(texts())
        if all(n in t for n in needles):
            return True
        time.sleep(1)
    return False


passed, failed = 0, []


def step(name, fn):
    global passed
    try:
        assert fn(), "không thấy nội dung mong đợi"
        passed += 1
        print(f"  ok   {name}")
    except Exception as e:  # noqa: BLE001
        failed.append(name)
        print(f"  FAIL {name}: {e}")


adb("shell", "am", "force-stop", PKG)
adb("shell", "monkey", "-p", PKG, "1")
time.sleep(6)

step("màn Trang chủ có gợi ý Dành cho bạn", lambda: has("Dành cho bạn"))
step("mở tab Tôi hiện hồ sơ", lambda: tap("Tôi") and has("Sửa hồ sơ"))
step("Đơn hàng của tôi tải từ máy chủ", lambda: tap("Đơn hàng của tôi") and has("Đang mở", "Lịch sử"))

print(f"\n{passed} bước đạt, {len(failed)} bước lỗi")
sys.exit(1 if failed else 0)
