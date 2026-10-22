"""Quét endpoint backend: mỗi @Controller mở một khối; decorator của method = các dòng '@...' liên tiếp ngay trước/sau dòng route
cho tới dòng khai báo method. Ghi đè inv/api.json."""
import glob, json, os, re

R = 'D:/SurplusIQ/apps'
OUT = 'D:/SurplusIQ/apps/backend/test/audit/endpoints.json'
ROUTE = re.compile(r"^\s*@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?")
CTRL = re.compile(r"^@Controller\(\s*(?:'([^']*)')?")
METHOD = re.compile(r"^\s{2}(?:async\s+)?\w+\s*\(")


def deco(lines, name):
    for l in lines:
        m = re.search(r"@%s\(([^)]*)\)" % name, l)
        if m:
            return m.group(1)
    return ''


files = set()
for pat in ('**/*.controller.ts', '**/*.controllers.ts'):
    files |= set(glob.glob(R + '/backend/src/' + pat, recursive=True))

api = []
for f in sorted(files):
    t = open(f, encoding='utf-8', errors='replace').read().split('\n')
    # chia theo class
    ctrl_idx = [i for i, l in enumerate(t) if CTRL.match(l)]
    for k, ci in enumerate(ctrl_idx):
        end = ctrl_idx[k + 1] if k + 1 < len(ctrl_idx) else len(t)
        base = CTRL.match(t[ci]).group(1) or ''
        # decorator cấp class: các dòng '@' liền kề quanh dòng @Controller cho tới 'export class'
        head = []
        j = ci - 1
        while j >= 0 and (t[j].startswith('@') or t[j].startswith(' ') or t[j].startswith(')') or t[j].startswith('}')) and j > ci - 15:
            head.append(t[j]); j -= 1
        j = ci
        while j < end and not t[j].startswith('export class'):
            head.append(t[j]); j += 1
        cls = {n: deco(head, n) for n in ('Roles', 'Channel', 'Permissions')}
        cls_pub = any('@Public' in l for l in head)
        body_start = j
        i = body_start
        seen_handlers = set()
        while i < end:
            m = ROUTE.match(t[i])
            if m:
                # decorator của method: đi lên tới method trước (dòng '  }' ) và đi xuống tới khai báo method
                lo = i
                while lo > body_start and not re.match(r"^  }\s*$", t[lo - 1]):
                    lo -= 1
                hi = i
                while hi < end and not METHOD.match(t[hi]):
                    hi += 1
                win = t[lo:hi + 1]
                # Nest: nhiều @Get/@Put/... chồng trên một handler chỉ đăng ký 1 route (decorator trên cùng thắng).
                if hi in seen_handlers:
                    i += 1
                    continue
                seen_handlers.add(hi)
                path = '/' + '/'.join(x for x in (base.strip('/'), (m.group(2) or '').strip('/')) if x)
                perm = (deco(win, 'Permissions') or cls['Permissions']).replace('StorePermission.', '')
                api.append(dict(
                    file=os.path.relpath(f, R).replace('\\', '/'), line=i + 1, method=m.group(1).upper(), path=path,
                    roles=(deco(win, 'Roles') or cls['Roles']).replace('UserRole.', ''),
                    chan=(deco(win, 'Channel') or cls['Channel']).replace("'", ''),
                    perm=perm, plan='PRO' if any('@RequiresPlan' in l for l in win) else '',
                    pub='PUBLIC' if (cls_pub or any('@Public' in l for l in win)) else ''))
            i += 1

json.dump(api, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
store = [x for x in api if x['path'].startswith('/store')]
print(len(api), 'endpoints;', len(store), 'store;', sum(1 for x in store if x['perm']), 'with permission')
for x in store:
    if not x['perm']:
        print('  no-perm', x['method'], x['path'], x['file'].split('/')[-1])
