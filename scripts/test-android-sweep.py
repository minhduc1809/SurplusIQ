"""Quét giao diện app Android (khách + cửa hàng) trên emulator: duyệt tab và các nút bấm được, ghi lại màn đã thấy,
phát hiện crash/ANR (logcat), văn bản lỗi/rỗng/giá trị thô (null, NaN, undefined), và chụp ảnh. Có chế độ responsive
(đổi kích thước màn hình và cỡ chữ). Kết quả: docs/audit/android-sweep.json + ảnh docs/audit/screenshots/android/.

Chạy: python scripts/test-android-sweep.py [customer|merchant|all] [--responsive]
Cần: adb, emulator đang chạy, backend (cổng 4000, DB test), app đã cài. KHÔNG bấm nút phá hủy (xóa/hủy/đăng xuất/thanh toán).
"""
import json, os, re, subprocess, sys, time, hashlib

ADB = os.environ.get("ADB") or os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe")
OUT = os.path.join(os.path.dirname(__file__), "..", "docs", "audit")
SHOTS = os.path.join(OUT, "screenshots", "android")
os.makedirs(SHOTS, exist_ok=True)
APPS = {
    "customer": {"pkg": "com.surplusiq.app", "label": "APP-CUSTOMER"},
    "merchant": {"pkg": "com.surplusiq.merchant", "label": "APP-OWNER"},
}
DANGER = re.compile(r"(?i)đăng xuất|xóa|hủy|thanh toán|xác nhận|gửi|đổi suất|tặng|từ chối|tạm nghỉ|đóng suất|đặt|mua|quét|đăng ký|reset|clear")
BAD = re.compile(r"\b(null|NaN|undefined|Exception|Error)\b|Có lỗi|Không kết nối|Lỗi |Something went wrong|\{\{|\bTODO\b")
EMPTY = re.compile(r"Chưa có|Không có|Trống|rỗng", re.I)


def adb(*a, binary=False):
    r = subprocess.run([ADB, *a], capture_output=True)
    return r.stdout if binary else r.stdout.decode("utf-8", "replace")


def dump():
    adb("shell", "uiautomator", "dump", "/sdcard/u.xml")
    return adb("exec-out", "cat", "/sdcard/u.xml")


def nodes(xml):
    out = []
    for m in re.finditer(r"<node [^>]*>", xml):
        n = m.group(0)
        g = lambda k: (re.search(k + r'="([^"]*)"', n) or [None, ""])[1]
        b = re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"', n)
        if not b:
            continue
        x1, y1, x2, y2 = map(int, b.groups())
        out.append({"text": g("text"), "desc": g("content-desc"), "click": g("clickable") == "true", "b": (x1, y1, x2, y2), "res": g("resource-id")})
    return out


def actionable(ns):
    """Compose: chữ không có clickable; coi là bấm được nếu nằm trong một khung clickable."""
    cl = [n for n in ns if n["click"]]
    out = []
    for n in ns:
        if not (n["text"] or n["desc"]):
            continue
        b = n["b"]
        if n["click"] or any(c["b"][0] <= b[0] and c["b"][1] <= b[1] and c["b"][2] >= b[2] and c["b"][3] >= b[3] for c in cl):
            out.append(n)
    return out


def screen_size(xml):
    ms = [n["b"] for n in nodes(xml)]
    return max(b[2] for b in ms), max(b[3] for b in ms)


def tap(b):
    adb("shell", "input", "tap", str((b[0] + b[2]) // 2), str((b[1] + b[3]) // 2))
    time.sleep(2.2)


def crashed(pkg):
    log = adb("logcat", "-d", "-b", "crash")
    return pkg in log and "FATAL EXCEPTION" in log


def alive(pkg):
    return pkg in adb("shell", "pidof", pkg) or bool(adb("shell", "pidof", pkg).strip())


def shot(name):
    p = os.path.join(SHOTS, name + ".png")
    open(p, "wb").write(adb("exec-out", "screencap", "-p", binary=True))


def sig(xml):
    t = "|".join(sorted({n["text"] or n["desc"] for n in nodes(xml) if n["text"] or n["desc"]}))
    return hashlib.md5(t.encode()).hexdigest()[:10], t


def login_merchant():
    xml = dump()
    ns = nodes(xml)
    if not any(n["text"] == "Đăng nhập" for n in ns):
        return True
    def focus(label, value):
        for n in nodes(dump()):
            if n["text"] == label or n["desc"] == label:
                tap(n["b"])
                adb("shell", "input", "text", value)
                return True
        return False
    # ô nhập có nhãn "Email"/"Mật khẩu": chạm vào ô cạnh nhãn
    ok = focus("Email", "owner@rincon.vn")
    ok = focus("Mật khẩu", "Surplus@1") and ok
    for n in nodes(dump()):
        if n["text"] == "Đăng nhập" and n["click"]:
            tap(n["b"])
            break
    time.sleep(4)
    return ok and not any(n["text"] == "Đăng nhập" for n in nodes(dump()))


def login_customer():
    ns = nodes(dump())
    if any(n["text"] == "Chào mừng trở lại!" for n in ns) is False and any(n["text"] == "Đăng nhập" for n in ns):
        for n in ns:
            if n["text"] == "Đăng nhập":
                tap(n["b"])
                break
    ns = nodes(dump())
    if not any(n["text"] == "Chào mừng trở lại!" for n in ns):
        return True
    for label, value in (("0901234567 hoặc email", "customer@surplusiq.vn"), ("Nhập mật khẩu", "Surplus@1")):
        for n in nodes(dump()):
            if n["text"] == label:
                tap(n["b"])
                adb("shell", "input", "text", value)
                break
    adb("shell", "input", "keyevent", "4")  # đóng bàn phím
    time.sleep(1)
    btn = [n for n in nodes(dump()) if n["text"] == "Đăng nhập"]
    if btn:
        tap(sorted(btn, key=lambda n: n["b"][1])[-1]["b"] if len(btn) > 1 else btn[0]["b"])
    time.sleep(5)
    for _ in range(3):  # onboarding lần đầu
        for n in nodes(dump()):
            if n["text"] in ("Tiếp tục", "Bỏ qua", "Để sau"):
                tap(n["b"])
                break
    return not any(n["text"] == "Chào mừng trở lại!" for n in nodes(dump()))


def sweep(key, tag="base", max_actions=10):
    app = APPS[key]
    pkg = app["pkg"]
    adb("logcat", "-c")
    adb("shell", "am", "force-stop", pkg)
    adb("shell", "monkey", "-p", pkg, "1")
    time.sleep(6)
    if key == "merchant" and not login_merchant():
        return {"app": app["label"], "tag": tag, "error": "không đăng nhập được app cửa hàng (BLOCKED)", "screens": [], "issues": []}
    if key == "customer" and not login_customer():
        return {"app": app["label"], "tag": tag, "error": "không đăng nhập được app khách (BLOCKED)", "screens": [], "issues": []}
    xml = dump()
    w, h = screen_size(xml)
    seen, issues, screens = {}, [], []

    def record(where):
        xml = dump()
        s, t = sig(xml)
        if s not in seen:
            name = f"{key}_{tag}_{len(seen):02d}"
            shot(name)
            seen[s] = name
            screens.append({"id": name, "via": where, "texts": t[:240]})
            for m in BAD.finditer(t):
                issues.append({"screen": name, "kind": "bad-text", "text": m.group(0)})
            if EMPTY.search(t) and len(t) < 200:
                issues.append({"screen": name, "kind": "empty-state", "text": EMPTY.search(t).group(0)})
        return xml

    xml = record("start")
    # tab dưới cùng: nút bấm được nằm ở 12% dưới màn hình
    tabs = [n for n in actionable(nodes(xml)) if n["b"][1] > h * 0.88]
    labels = []
    for n in tabs:
        lab = n["text"] or n["desc"]
        if lab not in labels:
            labels.append(lab)
    for lab in labels[:6]:
        for n in nodes(dump()):
            if (n["text"] or n["desc"]) == lab and n["b"][1] > h * 0.88:
                tap(n["b"])
                break
        xml = record("tab:" + lab)
        if not alive(pkg) or crashed(pkg):
            issues.append({"screen": "tab:" + lab, "kind": "CRASH", "text": "app thoát/crash sau khi mở tab"})
            adb("shell", "monkey", "-p", pkg, "1")
            time.sleep(5)
            continue
        acts = [n for n in actionable(nodes(xml)) if 120 < n["b"][1] < h * 0.88 and not DANGER.search(n["text"] or n["desc"])]
        done = 0
        for n in acts:
            if done >= max_actions:
                break
            tap(n["b"])
            xml2 = record("tap:" + (n["text"] or n["desc"])[:30])
            done += 1
            if not alive(pkg) or crashed(pkg):
                issues.append({"screen": "tap:" + (n["text"] or n["desc"])[:30], "kind": "CRASH", "text": "app thoát/crash"})
                adb("shell", "monkey", "-p", pkg, "1")
                time.sleep(5)
                break
            adb("shell", "input", "keyevent", "4")
            time.sleep(1.5)
            if not alive(pkg):
                adb("shell", "monkey", "-p", pkg, "1")
                time.sleep(5)
    if crashed(pkg):
        issues.append({"screen": "-", "kind": "CRASH-LOG", "text": "logcat có FATAL EXCEPTION của " + pkg})
    return {"app": app["label"], "tag": tag, "size": f"{w}x{h}", "screens": screens, "issues": issues}


def responsive(key):
    res = []
    configs = [("320x640", "160", "1.0"), ("360x740", "160", "1.0"), ("360x740", "160", "1.5"), ("360x740", "160", "2.0"), ("800x1280", "240", "1.0")]
    try:
        for size, dens, font in configs:
            adb("shell", "wm", "size", size.replace("x", "x"))
            adb("shell", "wm", "density", dens)
            adb("shell", "settings", "put", "system", "font_scale", font)
            time.sleep(2)
            res.append(sweep(key, tag=f"{size}_f{font}", max_actions=2))
    finally:
        adb("shell", "wm", "size", "reset")
        adb("shell", "wm", "density", "reset")
        adb("shell", "settings", "put", "system", "font_scale", "1.0")
    return res


if __name__ == "__main__":
    which = [a for a in sys.argv[1:] if not a.startswith("--")] or ["all"]
    keys = list(APPS) if "all" in which else which
    results = []
    for k in keys:
        results.append(sweep(k))
        if "--responsive" in sys.argv:
            results.extend(responsive(k))
    json.dump(results, open(os.path.join(OUT, "android-sweep.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    bad = 0
    for r in results:
        print(f"{r['app']} [{r['tag']}] màn={len(r['screens'])} vấn đề={len(r['issues'])} {r.get('error', '')}")
        for i in r["issues"]:
            print("   ", i["kind"], i["screen"], i["text"])
            bad += i["kind"].startswith("CRASH")
    sys.exit(1 if bad else 0)
