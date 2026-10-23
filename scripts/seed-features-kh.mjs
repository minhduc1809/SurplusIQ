// Nạp dữ liệu cho tài khoản kh.daydu@surplusiq.vn để chụp các tính năng 2.5.3 đến 2.7.6:
// giỏ cứu, đợt mua chung, khiếu nại, đánh giá, báo cáo vi phạm, yêu cầu hỗ trợ, ví ưu đãi, tài khoản hoàn tiền, điểm thưởng.
// Chạy: node scripts/seed-features-kh.mjs  (cần backend dev chạy và đã chạy seed-test-accounts.mjs). Chạy lại nhiều lần an toàn.
// Mọi bước đi qua API nghiệp vụ; bước nào bị chặn bởi luật nghiệp vụ thì in cảnh báo rồi chạy tiếp.
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const API = process.env.SEED_API_URL || 'http://localhost:4000';
const PASSWORD = process.env.SEED_PASSWORD || 'Surplus@1';
if (process.env.NODE_ENV === 'production' || !/localhost|127\.0\.0\.1|192\.168\./.test(API)) {
  console.error('Từ chối chạy: chỉ dùng cho backend dev trên máy local.');
  process.exit(1);
}

const call = async (method, path, { token, body } = {}) => {
  const r = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  let j;
  try {
    j = JSON.parse(t);
  } catch {
    j = t;
  }
  return { status: r.status, body: j };
};
const must = (r, what) => {
  if (r.status >= 300)
    throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`);
  return r.body;
};
const step = async (what, fn) => {
  try {
    const v = await fn();
    console.log('OK   ', what);
    return v;
  } catch (e) {
    console.log('BỎ QUA', what, '-', e.message);
  }
};
const login = async (path, id) =>
  must(
    await call('POST', path, {
      body: path.includes('customer')
        ? { identifier: id, password: PASSWORD, deviceId: 'seed-features' }
        : { email: id, password: PASSWORD, deviceId: 'seed-features' },
    }),
    'đăng nhập ' + id,
  ).accessToken;

const kh = await login('/auth/customer/login', 'kh.daydu@surplusiq.vn');
const ownerA = await login('/auth/store/login', 'chuthucan.hanoi@surplusiq.vn');
const STORE_A = 'a1000000-0000-4000-8000-000000000001';
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const H = 3600_000;
const D = 24 * H;

const deals = must(
  await call('GET', '/customer/deals?latitude=21.0458&longitude=105.795&radiusKm=5&limit=50', {
    token: kh,
  }),
  'danh sách deal',
).data;
const dealOf = (part) => deals.find((d) => d.storeName.includes(part) || d.title.includes(part));
const list = (r) => (Array.isArray(r) ? r : (r?.data ?? r?.items ?? []));

// 2.5.3 Đặt giữ cả giỏ: gợi ý giỏ rồi giữ nếu chưa có đơn đang giữ
const orders = list(
  must(await call('GET', '/customer/orders/active', { token: kh }), 'đơn đang mở'),
);
if (!orders.some((o) => o.status === 'PENDING_PAYMENT')) {
  await step('đặt giữ cả giỏ', async () => {
    const s = must(
      await call('POST', '/customer/baskets/suggest', {
        token: kh,
        body: {
          budgetMax: 100000,
          peopleCount: 2,
          latitude: 21.0458,
          longitude: 105.795,
          radiusKm: 5,
        },
      }),
      'gợi ý giỏ',
    );
    const b = s.baskets?.[0];
    if (!b) throw new Error('không có giỏ gợi ý');
    return must(
      await call('POST', '/customer/baskets/checkout', {
        token: kh,
        body: {
          storeId: b.storeId,
          items: b.items.map((i) => ({ offerId: i.offerId, quantity: 1 })),
          notes: 'Không hành',
        },
      }),
      'giữ giỏ',
    );
  });
}

// 2.5.4 đến 2.5.6 Đợt mua chung: một đợt đang nhận đăng ký, một đợt đã có đề nghị cung ứng chờ khách xác nhận
const target = dealOf('Phở Bò');
const pools = list(await call('GET', '/customer/rescue-pools', { token: kh }).then((r) => r.body));
if (pools.length < 2 && target) {
  const mk = async (title) =>
    must(
      await call('POST', '/store/rescue-pools', {
        token: ownerA,
        body: {
          poolTitle: title,
          targetCategory: 'NOODLE',
          serviceArea: 'Cầu Giấy, Hà Nội',
          registrationOpenAt: iso(-1 * H),
          registrationCloseAt: iso(2 * D),
          confirmDeadlineAt: iso(3 * D),
          minimumDemand: 1,
          maximumSupply: 20,
          targetBudgetMin: 20000,
          targetBudgetMax: 60000,
          pickupWindowStart: iso(3 * D + 2 * H),
          pickupWindowEnd: iso(3 * D + 5 * H),
        },
      }),
      'tạo đợt ' + title,
    );
  const open = async (p) =>
    must(
      await call('PATCH', `/store/rescue-pools/${p.id}/open`, { token: ownerA, body: {} }),
      'mở đăng ký',
    );
  const p1 = await step('tạo đợt mua chung phở cuối tuần', () => mk('Phở bò cuối tuần Cầu Giấy'));
  if (p1) await step('mở đăng ký đợt 1', () => open(p1));
  if (p1)
    await step('khách đăng ký nhu cầu đợt 1', async () =>
      must(
        await call('POST', `/customer/rescue-pools/${p1.id}/register`, {
          token: kh,
          body: { requestedQuantity: 2, budgetMax: 50000 },
        }),
        'đăng ký',
      ),
    );
  const p2 = await step('tạo đợt mua chung bún chả', () => mk('Bún chả trưa thứ Sáu'));
  if (p2) {
    await step('mở đăng ký đợt 2', () => open(p2));
    await step('khách đăng ký nhu cầu đợt 2', async () =>
      must(
        await call('POST', `/customer/rescue-pools/${p2.id}/register`, {
          token: kh,
          body: { requestedQuantity: 1 },
        }),
        'đăng ký',
      ),
    );
    await step('đóng đăng ký đợt 2', async () =>
      must(
        await call('POST', `/store/rescue-pools/${p2.id}/close-registration`, {
          token: ownerA,
          body: { reason: 'Đủ nhu cầu tối thiểu' },
        }),
        'đóng đăng ký',
      ),
    );
  }
}

// Đề nghị cung ứng: hạn xác nhận phải trước khi suất nguồn hết khung nhận, nên đợt này đặt mốc theo giờ kết thúc của suất nguồn.
const storePools = list(
  await call('GET', '/store/rescue-pools', { token: ownerA }).then((r) => r.body),
);
const hasOffered = storePools.some(
  (p) => p.poolTitle === 'Phở bò giờ vàng tối nay' && p.status !== 'DRAFT',
);
const endMs = target
  ? new Date(target.pickupEnd ?? target.pickupEndAt ?? Date.now() + 4 * H).getTime()
  : 0;
if (!hasOffered && target && endMs - Date.now() > 90 * 60_000) {
  const confirmAt = endMs - 30 * 60_000;
  const p3 = await step('tạo đợt mua chung có đề nghị cung ứng', async () =>
    must(
      await call('POST', '/store/rescue-pools', {
        token: ownerA,
        body: {
          poolTitle: 'Phở bò giờ vàng tối nay',
          targetCategory: 'NOODLE',
          serviceArea: 'Cầu Giấy, Hà Nội',
          registrationOpenAt: iso(-1 * H),
          registrationCloseAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          confirmDeadlineAt: new Date(confirmAt).toISOString(),
          minimumDemand: 1,
          maximumSupply: 20,
          targetBudgetMin: 20000,
          targetBudgetMax: 60000,
          pickupWindowStart: new Date(confirmAt).toISOString(),
          pickupWindowEnd: new Date(endMs).toISOString(),
        },
      }),
      'tạo đợt',
    ),
  );
  if (p3) {
    await step('mở đăng ký đợt giờ vàng', async () =>
      must(
        await call('PATCH', `/store/rescue-pools/${p3.id}/open`, { token: ownerA, body: {} }),
        'mở đăng ký',
      ),
    );
    await step('khách đăng ký đợt giờ vàng', async () =>
      must(
        await call('POST', `/customer/rescue-pools/${p3.id}/register`, {
          token: kh,
          body: { requestedQuantity: 1 },
        }),
        'đăng ký',
      ),
    );
    await step('đóng đăng ký đợt giờ vàng', async () =>
      must(
        await call('POST', `/store/rescue-pools/${p3.id}/close-registration`, {
          token: ownerA,
          body: { reason: 'Đủ nhu cầu tối thiểu' },
        }),
        'đóng đăng ký',
      ),
    );
    await step('cửa hàng gửi đề nghị cung ứng', async () =>
      must(
        await call('PATCH', `/store/rescue-pools/${p3.id}/supply-offer`, {
          token: ownerA,
          body: {
            offerId: target.id,
            offeredQuantity: Math.max(1, Math.min(2, target.remainingStock ?? 2)),
            offerExpiryAt: new Date(confirmAt).toISOString(),
          },
        }),
        'đề nghị cung ứng',
      ),
    );
  }
}

// 2.6.1, 2.6.2 Khiếu nại: bổ sung ảnh bằng chứng cho khiếu nại đã có
const complaints = list(
  must(await call('GET', '/customer/complaints', { token: kh }), 'khiếu nại'),
);
console.log(`Khiếu nại hiện có: ${complaints.length}`);

// 2.6.5 Báo cáo vi phạm
await step('báo cáo vi phạm cửa hàng', async () =>
  must(
    await call('POST', '/customer/reports', {
      token: kh,
      body: {
        targetType: 'STORE',
        targetId: STORE_A,
        reason: 'Biển hiệu và thông tin món trên ứng dụng không khớp thực tế tại quán.',
      },
    }),
    'báo cáo',
  ),
);

// 2.6.6, 2.6.7 Yêu cầu hỗ trợ
const tickets = list(
  must(await call('GET', '/customer/support-tickets', { token: kh }), 'yêu cầu hỗ trợ'),
);
if (tickets.length < 2) {
  const t1 = await step('gửi yêu cầu hỗ trợ thanh toán', async () =>
    must(
      await call('POST', '/customer/support-tickets', {
        token: kh,
        body: {
          subject: 'Đã chuyển khoản nhưng đơn chưa cập nhật',
          message:
            'Mình đã chuyển khoản VietQR cho đơn gần nhất nhưng trạng thái vẫn là chờ thanh toán, nhờ hỗ trợ kiểm tra.',
          category: 'PAYMENT',
        },
      }),
      'tạo yêu cầu',
    ),
  );
  await step('gửi yêu cầu hỗ trợ khác', async () =>
    must(
      await call('POST', '/customer/support-tickets', {
        token: kh,
        body: {
          subject: 'Góp ý về giao diện giỏ cứu',
          message: 'Mình muốn đề xuất thêm bộ lọc theo quán yêu thích trong màn gợi ý giỏ cứu.',
          category: 'OTHER',
        },
      }),
      'tạo yêu cầu',
    ),
  );
  const id = t1?.id ?? t1?.ticket?.id;
  if (id)
    await step('khách nhắn thêm vào yêu cầu', async () =>
      must(
        await call('POST', `/customer/support-tickets/${id}/messages`, {
          token: kh,
          body: {
            message: 'Mình đã đính kèm mã giao dịch trong tin nhắn, nhờ bên hỗ trợ kiểm tra giúp.',
          },
        }),
        'nhắn thêm',
      ),
    );
}

// 2.7.3 Tài khoản nhận hoàn tiền
await step('cài tài khoản nhận hoàn tiền', async () =>
  must(
    await call('PUT', '/customer/refund-bank-account', {
      token: kh,
      body: {
        bankBin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0123456789',
        accountHolder: 'NGUYEN HA MY',
      },
    }),
    'tài khoản hoàn tiền',
  ),
);

// 2.7.4 Ví ưu đãi: quán tạo hai chương trình ưu đãi, khách nhận vào ví
const wallet = list(
  must(await call('GET', '/customer/promotions/wallet', { token: kh }), 'ví ưu đãi'),
);
if (wallet.length < 2) {
  for (const p of [
    { name: 'Giảm 20% cho khách thân thiết', type: 'PERCENT', value: 20, minOrderAmount: 30000 },
    { name: 'Giảm 10.000đ cho đơn đầu tuần', type: 'FIXED', value: 10000, minOrderAmount: 40000 },
  ]) {
    const promo = await step('tạo ưu đãi ' + p.name, async () =>
      must(
        await call('POST', '/store/marketing/promotions', {
          token: ownerA,
          body: { ...p, target: 'ALL', maxUses: 100, startAt: iso(-1 * H), endAt: iso(14 * D) },
        }),
        'tạo ưu đãi',
      ),
    );
    if (promo?.id)
      await call('PATCH', `/store/marketing/promotions/${promo.id}/status`, {
        token: ownerA,
        body: { status: 'ACTIVE' },
      });
    if (promo?.id)
      await step('khách nhận ưu đãi ' + p.name, async () =>
        must(
          await call('POST', `/customer/promotions/${promo.id}/claim`, { token: kh, body: {} }),
          'nhận ưu đãi',
        ),
      );
  }
}

console.log(
  '\nXong. Điểm thưởng, tác động cá nhân, huy hiệu, lịch sử giao dịch và thông báo đã có từ các đơn đã nhận trước đó.',
);
