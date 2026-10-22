"""Smoke test app khách hàng trên emulator đang chạy (đã đăng nhập customer@surplusiq.vn).
Chạy: python scripts/test-android-customer-smoke.py   (cần adb, emulator, backend local, app đã cài)
Mỗi bước tìm chữ thật trên màn hình qua uiautomator; không giả lập dữ liệu.
"""
import json, os, re, subprocess, sys, time, urllib.request, uuid

ADB = os.environ.get("ADB") or os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")
PKG = "com.surplusiq.app"


API = os.environ.get("FLOWS_API_URL", "http://localhost:4000")


def call(method, path, body=None, token=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    req.add_header("Idempotency-Key", str(uuid.uuid4()))
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise AssertionError(f"{method} {path} -> {e.code} {e.read().decode()[:150]}")


def seed_paid_order():
    """Tạo suất + đơn đã thanh toán thật qua API để app có đơn cần thao tác."""
    store = call("POST", "/auth/store/login", {"email": "owner@rincon.vn", "password": "123456", "deviceId": "smoke-s"})["accessToken"]
    cust = call("POST", "/auth/customer/login", {"identifier": "customer@surplusiq.vn", "password": "123456", "deviceId": "smoke-c"})["accessToken"]
    item = call("GET", "/store/items?limit=1", token=store)["data"][0]
    now = int(time.time())
    iso = lambda t: time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(t))
    offer = call("POST", "/store/offers", {"itemId": item["id"], "totalQuantity": 2, "originalPrice": item["originalPrice"],
                 "currentPrice": 27000, "pickupStart": iso(now - 300), "pickupEnd": iso(now + 10800)}, store)
    order = call("POST", "/customer/orders", {"offerId": offer["id"], "quantity": 1}, cust)
    pay = call("POST", f"/customer/orders/{order['id']}/payments", {}, cust)
    call("POST", f"/dev/payments/{pay.get('transactionId') or pay.get('id') or pay.get('transactionCode')}/confirm", {})
    return store, cust, offer, order


def cleanup(store, offer):
    try:
        call("POST", f"/store/offers/{offer['id']}/cancel", {"reason": "Sự cố quán", "note": "smoke test"}, store)
    except AssertionError:
        pass


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

store_tok, cust_tok, offer, order = seed_paid_order()
code = order["code"]
adb("shell", "am", "force-stop", PKG)
adb("shell", "monkey", "-p", PKG, "1")
time.sleep(6)
try:
    step("đơn vừa tạo hiện trong Đơn hàng của tôi", lambda: tap("Tôi") and tap("Đơn hàng của tôi") and has(code))
    step("mở chi tiết đơn và thấy tùy chọn hỗ trợ", lambda: tap(code, contains=True) and tap("Thêm tùy chọn") and has("Đổi sang suất khác", "Tặng suất"))
    step("Theo dõi đơn hiện các mốc thật", lambda: tap("Theo dõi đơn, nhắn cửa hàng, báo sự cố") and has("Đã đặt suất", "Đã thanh toán"))
    step("màn Báo sự cố liệt kê các loại sự cố", lambda: tap("Báo sự cố khi nhận hàng") and has("Cửa hàng đóng cửa", "Món chưa sẵn sàng", "Gửi báo sự cố"))

    def send_incident():
        tap("Món chưa sẵn sàng")
        tap("Gửi báo sự cố")
        time.sleep(3)
        inc = call("GET", "/store/incidents", token=store_tok)
        rows = inc.get("data", inc) if isinstance(inc, dict) else inc
        return any(i.get("orderId") == order["id"] for i in rows)

    step("gửi báo sự cố từ app, cửa hàng thấy ở phía mình", send_incident)
finally:
    cleanup(store_tok, offer)

print(f"\n{passed} bước đạt, {len(failed)} bước lỗi")
sys.exit(1 if failed else 0)
