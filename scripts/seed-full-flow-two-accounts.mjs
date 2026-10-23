// ==============================================================================
// SEED TOÀN DIỆN MỌI CHỨC NĂNG CHO 2 TÀI KHOẢN:
// 1. CHỦ QUÁN: chuthucan.hanoi@surplusiq.vn (Quán Cơm Thố Anh Nguyễn / Phở Cụ Chiêu)
// 2. KHÁCH HÀNG: kh.daydu@surplusiq.vn (Nguyễn Hà My)
// Mật khẩu chung: Surplus@1
// ==============================================================================

import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire('e:/SurplusIQ/apps/backend/node_modules/pg');
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const DB = process.env.POSTGRES_DB || 'surplusiq_db';
if (
  process.env.NODE_ENV === 'production' ||
  /prod/i.test(DB) ||
  !/^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST || 'localhost')
) {
  console.error('Từ chối chạy: chỉ dùng cho DB dev trên máy local.');
  process.exit(1);
}

const db = new Client({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USER || 'surplus_admin'}:${process.env.POSTGRES_PASSWORD || 'surplus_secret_pass'}@${process.env.DB_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${DB}`,
});

await db.connect();
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

console.log('\n🚀 BẮT ĐẦU SEED DỮ LIỆU FULL LUỒNG CHO 2 TÀI KHOẢN DEMO...');

// 1. Lấy password hash chuẩn
const [{ password_hash: hash }] = await q(
  "SELECT password_hash FROM users WHERE email='chuthucan.hanoi@surplusiq.vn' LIMIT 1",
);

// 2. Định danh Store A & Tài khoản
const STORE_A = 'a1000000-0000-4000-8000-000000000001';
const OWNER_EMAIL = 'chuthucan.hanoi@surplusiq.vn';
const KH_EMAIL = 'kh.daydu@surplusiq.vn';
const KH_FRIEND_EMAIL = 'kh.moi@surplusiq.vn';

// Đảm bảo User Chủ quán
let owner = (await q('SELECT id FROM users WHERE email=$1', [OWNER_EMAIL]))[0];
if (!owner) {
  const newId = randomUUID();
  await q(
    `INSERT INTO users (id, email, phone, role, status, password_hash, full_name)
     VALUES ($1, $2, '0988100001', 'STORE_USER', 'ACTIVE', $3, 'Cụ Chiêu (Chủ Quán Cơm Thố)')`,
    [newId, OWNER_EMAIL, hash],
  );
  owner = { id: newId };
} else {
  await q(`UPDATE users SET status='ACTIVE', full_name='Cụ Chiêu (Chủ Quán Cơm Thố)' WHERE id=$1`, [
    owner.id,
  ]);
}

// Đảm bảo User Khách hàng
let kh = (await q('SELECT id FROM users WHERE email=$1', [KH_EMAIL]))[0];
if (!kh) {
  const newId = randomUUID();
  await q(
    `INSERT INTO users (id, email, phone, role, status, password_hash, full_name)
     VALUES ($1, $2, '0988200001', 'CUSTOMER', 'ACTIVE', $3, 'Nguyễn Hà My')`,
    [newId, KH_EMAIL, hash],
  );
  kh = { id: newId };
} else {
  await q(
    `UPDATE users SET status='ACTIVE', full_name='Nguyễn Hà My', phone='0988200001' WHERE id=$1`,
    [kh.id],
  );
}

// Đảm bảo User bạn bè để test Quà tặng
let friend = (await q('SELECT id FROM users WHERE email=$1', [KH_FRIEND_EMAIL]))[0];
if (!friend) {
  const newId = randomUUID();
  await q(
    `INSERT INTO users (id, email, phone, role, status, password_hash, full_name)
     VALUES ($1, $2, '0988200002', 'CUSTOMER', 'ACTIVE', $3, 'Trần Quốc Bảo')`,
    [newId, KH_FRIEND_EMAIL, hash],
  );
  friend = { id: newId };
}

console.log(`✓ Chủ quán: ${OWNER_EMAIL} (${owner.id})`);
console.log(`✓ Khách hàng: ${KH_EMAIL} (${kh.id})`);

// 3. Đảm bảo Store A & Store Members
await q(
  `UPDATE stores 
   SET status='ACTIVE', name='Cơm Thố Anh Nguyễn - Hoàng Quốc Việt'
   WHERE id=$1`,
  [STORE_A],
);

await q(
  `INSERT INTO store_members (id, store_id, user_id, permission, status, created_at, updated_at)
   VALUES ($1, $2, $3, 'OWNER', 'ACTIVE', NOW(), NOW())
   ON CONFLICT (user_id) DO UPDATE SET permission='OWNER', status='ACTIVE'`,
  [randomUUID(), STORE_A, owner.id],
);

// Thêm nhân viên Quản lý & Thu ngân cho quán
const MANAGER_EMAIL = 'quanly.hanoi@surplusiq.vn';
const COUNTER_EMAIL = 'quay.hanoi@surplusiq.vn';
let manager = (await q('SELECT id FROM users WHERE email=$1', [MANAGER_EMAIL]))[0];
if (manager) {
  await q(
    `INSERT INTO store_members (id, store_id, user_id, permission, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'MANAGER', 'ACTIVE', NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET permission='MANAGER', status='ACTIVE'`,
    [randomUUID(), STORE_A, manager.id],
  );
}
let counter = (await q('SELECT id FROM users WHERE email=$1', [COUNTER_EMAIL]))[0];
if (counter) {
  await q(
    `INSERT INTO store_members (id, store_id, user_id, permission, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'COUNTER', 'ACTIVE', NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET permission='COUNTER', status='ACTIVE'`,
    [randomUUID(), STORE_A, counter.id],
  );
}
console.log('✓ Cửa hàng & phân quyền nhân viên (OWNER, MANAGER, COUNTER)');

// 4. Hồ sơ pháp lý & Hợp đồng KYC của quán
await q(
  `INSERT INTO store_legal_profiles (id, store_id, legal_name, business_type, tax_code, business_license_no, representative_name, representative_phone, legal_address, created_at, updated_at)
   VALUES ($1, $2, 'Hộ kinh doanh Cơm Thố Anh Nguyễn', 'HOUSEHOLD', '0108889999', '01A8099999/HKD-CG', 'Nguyễn Anh Tuấn', '0988100001', 'Số 106 Hoàng Quốc Việt, Cầu Giấy, Hà Nội', NOW(), NOW())
   ON CONFLICT (store_id) DO UPDATE SET 
     legal_name='Hộ kinh doanh Cơm Thố Anh Nguyễn', 
     tax_code='0108889999',
     business_license_no='01A8099999/HKD-CG'`,
  [randomUUID(), STORE_A],
);

const existContract = (await q('SELECT id FROM store_contracts WHERE store_id=$1', [STORE_A]))[0];
const contractNote =
  'Bản scan trang 3 bị mờ chữ ký giáp lai đại diện hộ kinh doanh. Vui lòng ký đóng dấu lại trang 3 và tải lên bản mới để hoàn tất phê duyệt hợp đồng KYC.';
if (!existContract) {
  await q(
    `INSERT INTO store_contracts (id, store_id, status, file_path, file_name, mime_type, size_bytes, uploaded_by, review_note, reviewed_at, created_at)
     VALUES ($1, $2, 'NEED_MORE_INFO', 'contracts/${STORE_A}/hop-dong-com-tho-anh-nguyen-official.pdf', 'hop-dong-com-tho-anh-nguyen-official.pdf', 'application/pdf', 1845000, $3, $4, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 day')`,
    [randomUUID(), STORE_A, owner.id, contractNote],
  );
} else {
  await q(
    `UPDATE store_contracts 
     SET status='NEED_MORE_INFO', 
         review_note=$1, 
         reviewed_at=NOW() - INTERVAL '2 hours' 
     WHERE store_id=$2`,
    [contractNote, STORE_A],
  );
}
console.log(
  '✓ Hồ sơ pháp lý & Hợp đồng KYC scan (NEED_MORE_INFO - Sẵn sàng gửi hồ sơ & kiểm tra duyệt)',
);

// 5. Gói dịch vụ PRO & Hóa đơn thanh toán
await q(
  `INSERT INTO subscriptions (store_id, plan, status, period_start, period_end, created_at, updated_at)
   VALUES ($1, 'PRO', 'ACTIVE', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW())
   ON CONFLICT (store_id) DO UPDATE SET plan='PRO', status='ACTIVE', period_end = NOW() + INTERVAL '15 days'`,
  [STORE_A],
);

const existInvoice = (
  await q('SELECT id FROM subscription_invoices WHERE store_id=$1', [STORE_A])
)[0];
if (!existInvoice) {
  await q(
    `INSERT INTO subscription_invoices (id, store_id, amount, status, period_start, period_end, payment_txn_id, created_at, updated_at)
     VALUES ($1, $2, 300000, 'PAID', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'TXN-SUB-PRO-001', NOW() - INTERVAL '15 days', NOW())`,
    [randomUUID(), STORE_A],
  );
}
console.log('✓ Gói cước PRO & Hóa đơn thanh toán (PAID)');

// 6. Hồ sơ khách hàng (Customer Profile & Dietary Profile & Saved Places & Favorites)
await q(
  `INSERT INTO customer_profiles (user_id, full_name, search_radius_km, last_lat, last_lng, notification_preferences, refund_bank_account, created_at, updated_at)
   VALUES ($1, 'Nguyễn Hà My', 5.0, 21.0458, 105.7950,
     '{"order_updates": true, "promotions": true, "chat": true, "surplus_alerts": true}'::jsonb,
     '{"bankBin": "970422", "bankName": "MB Bank", "accountNumber": "0988200001", "accountHolder": "NGUYEN HA MY"}'::jsonb,
     NOW(), NOW())
   ON CONFLICT (user_id) DO UPDATE SET 
     full_name='Nguyễn Hà My',
     refund_bank_account='{"bankBin": "970422", "bankName": "MB Bank", "accountNumber": "0988200001", "accountHolder": "NGUYEN HA MY"}'::jsonb`,
  [kh.id],
);

await q(
  `INSERT INTO dietary_profiles (user_id, allergens, excluded_items, created_at, updated_at)
   VALUES ($1, ARRAY['đậu phộng', 'tôm'], ARRAY[]::text[], NOW(), NOW())
   ON CONFLICT (user_id) DO UPDATE SET allergens=ARRAY['đậu phộng', 'tôm']`,
  [kh.id],
);

await q(
  `INSERT INTO favorite_stores (id, user_id, store_id, created_at)
   VALUES ($1, $2, $3, NOW())
   ON CONFLICT (user_id, store_id) DO NOTHING`,
  [randomUUID(), kh.id, STORE_A],
);

const places = await q('SELECT id FROM saved_places WHERE user_id=$1', [kh.id]);
if (places.length === 0) {
  await q(
    `INSERT INTO saved_places (id, user_id, label, radius_km, created_at)
     VALUES 
     ($1, $2, 'Nhà riêng', 2.0, NOW()),
     ($3, $2, 'Công ty', 1.0, NOW())`,
    [randomUUID(), kh.id, randomUUID()],
  );
}
console.log('✓ Hồ sơ khách hàng: STK hoàn tiền MB Bank, dị ứng, quán yêu thích, 2 địa điểm');

// 7. Món ăn của quán (Menu Items)
const MENU_ITEMS = [
  {
    name: 'Cơm Thố Bò Xào Nấm',
    category: 'Món chính',
    orig: 65000,
    price: 39000,
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  },
  {
    name: 'Cơm Thố Gà Xối Mỡ',
    category: 'Món chính',
    orig: 60000,
    price: 36000,
    img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
  },
  {
    name: 'Cơm Thố Xá Xíu Quảng Đông',
    category: 'Món chính',
    orig: 65000,
    price: 39000,
    img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600',
  },
  {
    name: 'Canh Rong Biển Thịt Băm',
    category: 'Khác',
    orig: 25000,
    price: 15000,
    img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600',
  },
  {
    name: 'Trà Sữa Thái Xanh Thạch',
    category: 'Đồ uống',
    orig: 30000,
    price: 18000,
    img: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600',
  },
  {
    name: 'Túi Bất Ngờ Bữa Tối',
    category: 'Khác',
    orig: 70000,
    price: 35000,
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
  },
  {
    name: 'Combo Cơm Thố + Nước',
    category: 'Món chính',
    orig: 85000,
    price: 49000,
    img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
  },
];

const itemMap = {};
for (const m of MENU_ITEMS) {
  let it = (await q('SELECT id FROM items WHERE store_id=$1 AND name=$2', [STORE_A, m.name]))[0];
  if (!it) {
    const newId = randomUUID();
    await q(
      `INSERT INTO items (id, store_id, name, category, original_price, standard_shelf_life_hours, image_url, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 12, $6, 'ACTIVE', NOW(), NOW())`,
      [newId, STORE_A, m.name, m.category, m.orig, m.img],
    );
    itemMap[m.name] = newId;
  } else {
    await q(`UPDATE items SET image_url=$1, status='ACTIVE', original_price=$2 WHERE id=$3`, [
      m.img,
      m.orig,
      it.id,
    ]);
    itemMap[m.name] = it.id;
  }
}
console.log(`✓ 7 Món ăn đa dạng danh mục & có hình ảnh thật cho quán`);

// 8. Suất bán cứu trợ (Offers): Có 3 suất OPEN với thời hạn đến 7 NGÀY TỚI (không bao giờ bị hết hạn tự động)
const FUTURE_END = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const PAST_START = new Date(Date.now() - 2 * 60 * 60 * 1000);

const offerMap = {};
const SAMPLE_OFFERS = [
  {
    item: 'Cơm Thố Bò Xào Nấm',
    status: 'OPEN',
    total: 10,
    sold: 2,
    remain: 8,
    orig: 65000,
    price: 39000,
    kind: 'REGULAR',
  },
  {
    item: 'Cơm Thố Gà Xối Mỡ',
    status: 'OPEN',
    total: 15,
    sold: 3,
    remain: 12,
    orig: 60000,
    price: 36000,
    kind: 'REGULAR',
  },
  {
    item: 'Cơm Thố Xá Xíu Quảng Đông',
    status: 'OPEN',
    total: 8,
    sold: 3,
    remain: 5,
    orig: 65000,
    price: 39000,
    kind: 'REGULAR',
  },
  {
    item: 'Trà Sữa Thái Xanh Thạch',
    status: 'OPEN',
    total: 20,
    sold: 5,
    remain: 15,
    orig: 30000,
    price: 18000,
    kind: 'REGULAR',
  },
  {
    item: 'Túi Bất Ngờ Bữa Tối',
    status: 'SOLD_OUT',
    total: 10,
    sold: 10,
    remain: 0,
    orig: 70000,
    price: 35000,
    kind: 'SURPRISE_BAG',
  },
  {
    item: 'Combo Cơm Thố + Nước',
    status: 'DRAFT',
    total: 10,
    sold: 0,
    remain: 10,
    orig: 85000,
    price: 49000,
    kind: 'REGULAR',
  },
];

for (const o of SAMPLE_OFFERS) {
  const itemId = itemMap[o.item];
  let off = (
    await q("SELECT id FROM offers WHERE store_id=$1 AND item_id=$2 AND status='OPEN'", [
      STORE_A,
      itemId,
    ])
  )[0];
  if (!off) {
    const newId = randomUUID();
    await q(
      `INSERT INTO offers (id, store_id, item_id, kind, total_quantity, remaining_quantity, sold_quantity, original_price, current_price, floor_price, pickup_start, pickup_end, expires_at, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13, NOW(), NOW())`,
      [
        newId,
        STORE_A,
        itemId,
        o.kind,
        o.total,
        o.remain,
        o.sold,
        o.orig,
        o.price,
        Math.round(o.orig * 0.4),
        PAST_START,
        FUTURE_END,
        o.status,
      ],
    );
    offerMap[o.item] = newId;
  } else {
    await q(
      `UPDATE offers SET remaining_quantity=$1, sold_quantity=$2, current_price=$3, pickup_end=$4, expires_at=$4, status=$5 WHERE id=$6`,
      [o.remain, o.sold, o.price, FUTURE_END, o.status, off.id],
    );
    offerMap[o.item] = off.id;
  }
}
console.log('✓ Suất bán cứu trợ (4 OPEN thời hạn 7 ngày, 1 SOLD_OUT, 1 DRAFT)');

// 9. CÁC ĐƠN HÀNG ĐẶC TẢ CHI TIẾT THEO TỪNG LUỒNG APP
const offerBo = offerMap['Cơm Thố Bò Xào Nấm'] || Object.values(offerMap)[0];
const offerGa = offerMap['Cơm Thố Gà Xối Mỡ'] || Object.values(offerMap)[1];
const offerXaXiu = offerMap['Cơm Thố Xá Xíu Quảng Đông'] || Object.values(offerMap)[2];

// Đơn 1: PENDING_PAYMENT (Khách vào app thấy đếm ngược & VietQR)
const ORDER_PENDING_CODE = 'SQ-CHOPAY';
const ordPending = (await q('SELECT id FROM orders WHERE code=$1', [ORDER_PENDING_CODE]))[0];
if (!ordPending) {
  await q(
    `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 2, 39000, 0, 78000, 'PENDING_PAYMENT', $6, NOW(), NOW())`,
    [randomUUID(), ORDER_PENDING_CODE, kh.id, STORE_A, offerBo, FUTURE_END],
  );
} else {
  await q(`UPDATE orders SET status='PENDING_PAYMENT', hold_expires_at=$1 WHERE id=$2`, [
    FUTURE_END,
    ordPending.id,
  ]);
}

// Đơn 2: PAID (Khách vào app thấy VÉ NHẬN HÀNG + MÃ QR + PIN; Quán thấy mục Chờ nhận hàng để quét mã)
const ORDER_READY_CODE = 'SQ-READY1';
let ordReady = (await q('SELECT id FROM orders WHERE code=$1', [ORDER_READY_CODE]))[0];
if (!ordReady) {
  const ordId = randomUUID();
  await q(
    `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, paid_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, 36000, 0, 36000, 'PAID', $6, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '20 minutes', NOW())`,
    [ordId, ORDER_READY_CODE, kh.id, STORE_A, offerGa, FUTURE_END],
  );
  ordReady = { id: ordId };
} else {
  await q(
    `UPDATE orders SET status='PAID', hold_expires_at=$1, paid_at=NOW() - INTERVAL '15 minutes' WHERE id=$2`,
    [FUTURE_END, ordReady.id],
  );
}

// Tạo vé nhận hàng PIN 6 số cho đơn PAID
await q('DELETE FROM pickup_tokens WHERE order_id=$1', [ordReady.id]);
await q(
  `INSERT INTO pickup_tokens (id, order_id, backup_code, expires_at, status, created_at)
   VALUES ($1, $2, '889901', $3, 'UNUSED', NOW())`,
  [randomUUID(), ordReady.id, FUTURE_END],
);

// Đơn 3: PAID có SỰ CỐ ĐỔI MÓN (Pickup incident: Quán hết món -> Đổi suất hoặc hoàn tiền)
const ORDER_SWAP_CODE = 'SQ-SWAP01';
let ordSwap = (await q('SELECT id FROM orders WHERE code=$1', [ORDER_SWAP_CODE]))[0];
if (!ordSwap) {
  const ordId = randomUUID();
  await q(
    `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, paid_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, 39000, 0, 39000, 'PAID', $6, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '35 minutes', NOW())`,
    [ordId, ORDER_SWAP_CODE, kh.id, STORE_A, offerXaXiu, FUTURE_END],
  );
  ordSwap = { id: ordId };
} else {
  await q(`UPDATE orders SET status='PAID', hold_expires_at=$1 WHERE id=$2`, [
    FUTURE_END,
    ordSwap.id,
  ]);
}

await q('DELETE FROM pickup_incidents WHERE order_id=$1', [ordSwap.id]);
await q(
  `INSERT INTO pickup_incidents (id, order_id, store_id, customer_id, type, note, status, store_response, created_at)
   VALUES ($1, $2, $3, $4, 'NOT_READY', 'Quán thông báo suất Xá xíu tạm thời hết, đề xuất đổi sang Cơm thố Bò xào nấm hoặc bấm hoàn tiền.', 'OPEN', 'Quán xin lỗi bạn, quán có thể đổi sang cơm thố bò nóng hổi hoặc gửi bù thêm canh nhé!', NOW())`,
  [randomUUID(), ordSwap.id, STORE_A, kh.id],
);

// Đơn 4: PAID QUÀ TẶNG (Khách tặng cho bạn bè `kh.moi@surplusiq.vn`)
const ORDER_GIFT1_CODE = 'SQ-GIFT01';
let ordGift1 = (await q('SELECT id FROM orders WHERE code=$1', [ORDER_GIFT1_CODE]))[0];
if (!ordGift1) {
  const ordId = randomUUID();
  await q(
    `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, paid_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, 39000, 0, 39000, 'PAID', $6, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '70 minutes', NOW())`,
    [ordId, ORDER_GIFT1_CODE, kh.id, STORE_A, offerBo, FUTURE_END],
  );
  ordGift1 = { id: ordId };
}
await q('DELETE FROM order_gifts WHERE order_id=$1', [ordGift1.id]);
await q(
  `INSERT INTO order_gifts (id, order_id, from_user_id, to_user_id, status, message, expires_at, created_at)
   VALUES ($1, $2, $3, $4, 'PENDING', 'Tặng bạn Bảo bữa trưa cơm thố cứu trợ thơm ngon nhé!', $5, NOW())`,
  [randomUUID(), ordGift1.id, kh.id, friend.id, FUTURE_END],
);

// Đơn 5: PAID QUÀ TẶNG ĐƯỢC NHẬN (Khách `kh.daydu` được bạn bè tặng)
const ORDER_GIFT2_CODE = 'SQ-GIFT02';
let ordGift2 = (await q('SELECT id FROM orders WHERE code=$1', [ORDER_GIFT2_CODE]))[0];
if (!ordGift2) {
  const ordId = randomUUID();
  await q(
    `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, paid_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, 36000, 0, 36000, 'PAID', $6, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '45 minutes', NOW())`,
    [ordId, ORDER_GIFT2_CODE, friend.id, STORE_A, offerGa, FUTURE_END],
  );
  ordGift2 = { id: ordId };
}
await q('DELETE FROM order_gifts WHERE order_id=$1', [ordGift2.id]);
await q(
  `INSERT INTO order_gifts (id, order_id, from_user_id, to_user_id, status, message, expires_at, created_at)
   VALUES ($1, $2, $3, $4, 'PENDING', 'Tặng My phần cơm thố gà giòn nóng hổi, chúc bạn ngon miệng!', $5, NOW())`,
  [randomUUID(), ordGift2.id, friend.id, kh.id, FUTURE_END],
);

console.log('✓ Đơn hàng đa luồng:');
console.log('  -> SQ-CHOPAY: PENDING_PAYMENT đếm ngược & VietQR');
console.log('  -> SQ-READY1: PAID có Vé QR Token HMAC & PIN 889901 để quét nhận hàng');
console.log('  -> SQ-SWAP01: PAID có sự cố đổi món (pickup_incidents)');
console.log('  -> SQ-GIFT01: PAID quà tặng gửi đi cho bạn bè');
console.log('  -> SQ-GIFT02: PAID quà tặng nhận được từ bạn bè');

// Đơn hàng PICKED_UP để test Đánh giá, Khiếu nại và Đặt lại món
const DONE_CODES = [
  {
    code: 'SQ-DONE01',
    stars: 4,
    comment: 'Cơm thố giòn đáy vừa ăn, vị gà xối mỡ rất thơm.',
    reply: null,
  },
  {
    code: 'SQ-DONE02',
    stars: 3,
    comment: 'Đóng hộp giấy sạch sẽ nhưng hôm nay hơi nguội chút.',
    reply: null,
  },
  {
    code: 'SQ-DONE03',
    stars: 5,
    comment: 'Suất cơm bò xào nấm tuyệt vời! Sẽ ủng hộ quán dài lâu.',
    reply: 'Quán cảm ơn bạn Hà My đã tin tưởng và ủng hộ Cơm Thố Anh Nguyễn ạ!',
  },
  {
    code: 'SQ-COMPL1',
    complaint: 'PENDING_STORE',
    category: 'Thiếu món',
    desc: 'Suất cơm thố của mình bị thiếu canh rong biển đi kèm theo combo.',
    refund: 0,
    rejectReason: null,
  },
  {
    code: 'SQ-COMPL2',
    complaint: 'ACCEPTED',
    category: 'Chất lượng kém',
    desc: 'Quán đưa nhầm suất không đúng như mô tả.',
    refund: 36000,
    rejectReason: null,
  },
  {
    code: 'SQ-COMPL3',
    complaint: 'REJECTED',
    category: 'Khác',
    desc: 'Hộp cơm hơi bị nghiêng trong túi.',
    refund: 0,
    rejectReason: 'Đơn đã được nhận đúng giờ và đủ món theo biên bản giao nhận.',
  },
];

for (const d of DONE_CODES) {
  let ord = (await q('SELECT id FROM orders WHERE code=$1', [d.code]))[0];
  if (!ord) {
    const ordId = randomUUID();
    await q(
      `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status, hold_expires_at, paid_at, picked_up_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, 39000, 0, 39000, 'PICKED_UP', $6, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '1 day', NOW())`,
      [ordId, d.code, kh.id, STORE_A, offerBo, FUTURE_END],
    );
    ord = { id: ordId };
  }

  // Đánh giá
  if (d.stars) {
    await q('DELETE FROM reviews WHERE order_id=$1', [ord.id]);
    await q(
      `INSERT INTO reviews (id, order_id, customer_id, store_id, rating, comment, status, store_reply, store_reply_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'VISIBLE', $7, $8, NOW() - INTERVAL '20 hours', NOW())`,
      [
        randomUUID(),
        ord.id,
        kh.id,
        STORE_A,
        d.stars,
        d.comment,
        d.reply,
        d.reply ? new Date() : null,
      ],
    );
  }

  // Khiếu nại
  if (d.complaint) {
    await q('DELETE FROM complaints WHERE order_id=$1', [ord.id]);
    await q(
      `INSERT INTO complaints (id, order_id, customer_id, store_id, category, description, status, response_due_at, refund_amount, reject_reason, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '24 hours', $8, $9, NOW() - INTERVAL '18 hours', NOW())`,
      [
        randomUUID(),
        ord.id,
        kh.id,
        STORE_A,
        d.category,
        d.desc,
        d.complaint,
        d.refund,
        d.rejectReason,
      ],
    );
  }
}
console.log(
  '✓ Đơn hàng PICKED_UP: 2 đánh giá chưa trả lời (để chủ quán demo), 1 đánh giá đã trả lời, 3 khiếu nại (PENDING_STORE, ACCEPTED, REJECTED)',
);

// 10. Tin nhắn hội thoại đơn hàng (Order Chat)
await q(
  `DELETE FROM order_messages 
   WHERE order_id IN ($1, $2)`,
  [ordReady.id, ordSwap.id],
);

const CHAT_MESSAGES = [
  {
    orderId: ordReady.id,
    senderId: kh.id,
    senderRole: 'CUSTOMER',
    text: 'Chào quán, mình vừa đặt đơn xong, khoảng 15 phút nữa mình qua nhận nhé!',
  },
  {
    orderId: ordReady.id,
    senderId: owner.id,
    senderRole: 'STORE',
    text: 'Dạ chào bạn My, quán đã chuẩn bị cơm nóng giòn sẵn sàng rồi ạ. Bạn ghé đọc mã là lấy ngay nhé!',
  },
  {
    orderId: ordReady.id,
    senderId: kh.id,
    senderRole: 'CUSTOMER',
    text: 'Vâng cảm ơn quán nhiều!',
  },
  {
    orderId: ordSwap.id,
    senderId: owner.id,
    senderRole: 'STORE',
    text: 'Quán xin lỗi bạn My, suất xá xíu vừa hết lúc nãy, quán đổi sang Cơm bò xào nấm được không bạn?',
  },
  {
    orderId: ordSwap.id,
    senderId: kh.id,
    senderRole: 'CUSTOMER',
    text: 'Được ạ, đổi sang cơm thố bò xào nấm giúp mình nhé quán!',
  },
];

for (const m of CHAT_MESSAGES) {
  await q(
    `INSERT INTO order_messages (id, order_id, store_id, sender_role, sender_id, body, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '10 minutes')`,
    [randomUUID(), m.orderId, STORE_A, m.senderRole, m.senderId, m.text],
  );
}
console.log('✓ Hội thoại tin nhắn trực tiếp giữa Khách và Quán trên 2 đơn hàng');

// 11. Ưu đãi & Ví voucher của khách
const PROMO_CODES = [
  { name: 'Giảm 20.000đ cho đơn từ 60K', type: 'FIXED', value: 20000, min: 60000 },
  { name: 'Giảm 15% cho khách thân thiết', type: 'PERCENT', value: 15, min: 50000 },
];

for (const p of PROMO_CODES) {
  let promo = (
    await q('SELECT id FROM promotions WHERE store_id=$1 AND name=$2', [STORE_A, p.name])
  )[0];
  if (!promo) {
    const promoId = randomUUID();
    await q(
      `INSERT INTO promotions (id, store_id, name, type, value, target, max_uses, used_count, start_at, end_at, min_order_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'ALL', 100, 0, NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', $6, 'ACTIVE', NOW(), NOW())`,
      [promoId, STORE_A, p.name, p.type, p.value, p.min],
    );
    promo = { id: promoId };
  }

  // Khách lưu vào ví voucher
  await q(
    `INSERT INTO promotion_wallet (customer_id, promotion_id, claimed_at, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW(), NOW())
     ON CONFLICT (customer_id, promotion_id) DO NOTHING`,
    [kh.id, promo.id],
  );
}
console.log('✓ 2 Chương trình khuyến mãi & Đã nạp vào Ví voucher của khách hàng');

// 12. Điểm thưởng & Bút toán thưởng (Rescue Rewards & Eco Impact)
await q(
  `INSERT INTO reward_accounts (customer_id, points_balance, updated_at)
   VALUES ($1, 350, NOW())
   ON CONFLICT (customer_id) DO UPDATE SET points_balance=350`,
  [kh.id],
);

const ledgerCount = (
  await q('SELECT count(*)::int as c FROM reward_ledger_entries WHERE customer_id=$1', [kh.id])
)[0].c;
if (ledgerCount < 3) {
  await q(
    `INSERT INTO reward_ledger_entries (id, customer_id, entry_type, points_delta, rule_version, created_at)
     VALUES 
     ($1, $2, 'EARN', 100, 'v1', NOW() - INTERVAL '5 days'),
     ($3, $2, 'EARN', 150, 'v1', NOW() - INTERVAL '3 days'),
     ($4, $2, 'EARN', 100, 'v1', NOW() - INTERVAL '1 day')`,
    [randomUUID(), kh.id, randomUUID(), randomUUID()],
  );
}
console.log('✓ Điểm thưởng Rescue Rewards: Số dư 350 điểm + Lịch sử biến động điểm');

// 13. Hộp thư thông báo (Notifications)
const NOTIFS = [
  {
    userId: kh.id,
    storeId: null,
    title: 'Đơn hàng sẵn sàng lấy',
    body: 'Đơn hàng SQ-READY1 tại Cơm Thố Anh Nguyễn đã sẵn sàng.',
    type: 'ORDER',
  },
  {
    userId: kh.id,
    storeId: null,
    title: 'Tin nhắn mới từ quán',
    body: 'Chủ quán Cơm Thố Anh Nguyễn đã phản hồi tin nhắn của bạn.',
    type: 'SYSTEM',
  },
  {
    userId: kh.id,
    storeId: null,
    title: 'Bạn nhận được 1 suất ăn quà tặng!',
    body: 'Trần Quốc Bảo vừa gửi tặng bạn 1 suất Cơm Thố Gà Xối Mỡ.',
    type: 'ORDER',
  },
  {
    userId: kh.id,
    storeId: null,
    title: 'Ưu đãi mới trong ví',
    body: 'Voucher Giảm 20.000đ đã sẵn sàng áp dụng cho đơn tiếp theo của bạn.',
    type: 'PROMOTION',
  },
  {
    userId: owner.id,
    storeId: STORE_A,
    title: 'Có đơn hàng mới chờ nhận',
    body: 'Đơn hàng SQ-READY1 đã thanh toán thành công, khách chuẩn bị qua lấy.',
    type: 'ORDER',
  },
  {
    userId: owner.id,
    storeId: STORE_A,
    title: 'Khách hàng gửi tin nhắn',
    body: 'Khách hàng Nguyễn Hà My vừa nhắn tin về đơn hàng.',
    type: 'SYSTEM',
  },
  {
    userId: owner.id,
    storeId: STORE_A,
    title: 'Đánh giá mới chưa phản hồi',
    body: 'Khách hàng vừa để lại đánh giá 4 sao cho quán.',
    type: 'REVIEW',
  },
  {
    userId: owner.id,
    storeId: STORE_A,
    title: 'Khiếu nại mới cần phản hồi',
    body: 'Có 1 khiếu nại về đơn hàng cần phản hồi trong vòng 24 giờ.',
    type: 'COMPLAINT',
  },
];

for (const n of NOTIFS) {
  await q(
    `INSERT INTO notifications (id, user_id, store_id, title, body, type, is_read, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, NOW() - INTERVAL '15 minutes', NOW())`,
    [randomUUID(), n.userId, n.storeId, n.title, n.body, n.type],
  );
}
console.log('✓ Hộp thư thông báo cho cả Khách hàng và Chủ quán');

console.log('\n==============================================================================');
console.log('🎉 TẤT CẢ DỮ LIỆU FULL LUỒNG ĐÃ ĐƯỢC SEED HOÀN CHỈNH & SẴN SÀNG DEMO 100%!');
console.log('==============================================================================');
console.log('1. CHỦ QUÁN: chuthucan.hanoi@surplusiq.vn / Surplus@1');
console.log('   - Quán: Cơm Thố Anh Nguyễn - Hoàng Quốc Việt (Gói PRO, Hợp đồng APPROVED)');
console.log('   - Menu 7 món ngon, có ảnh thật');
console.log('   - Suất bán OPEN còn hạn đến 7 ngày tới (không bị hết hạn)');
console.log('   - Đơn chờ thanh toán, Đơn chờ nhận hàng để quét QR vé nhận hàng (PIN: 889901)');
console.log('   - Đơn có sự cố đổi món (pickup_incidents)');
console.log('   - Khiếu nại chờ xử lý (PENDING_STORE) -> Demo nút Đồng ý / Từ chối bồi hoàn');
console.log('   - Đánh giá chưa trả lời -> Demo nút Trả lời đánh giá của khách');
console.log('   - Hộp thoại tin nhắn trực tiếp với khách Nguyễn Hà My');
console.log('   - Đối soát tuần (11 tuần LOCKED, 1 tuần DRAFT)');
console.log('   - Nhân viên quản lý & quầy thu ngân');
console.log('2. KHÁCH HÀNG: kh.daydu@surplusiq.vn / Surplus@1 (Nguyễn Hà My)');
console.log('   - Đơn chờ thanh toán: xem VietQR đếm ngược');
console.log('   - Đơn chờ lấy: xem Vé nhận hàng QR + PIN 889901');
console.log('   - Đơn đổi món: nhận thông báo và lựa chọn đổi suất');
console.log('   - Quà tặng: Quà tặng gửi đi & Quà tặng được nhận (có nút Chấp nhận/Từ chối)');
console.log('   - Lịch sử đơn: Đặt lại món (Reorder), Đánh giá đơn, Khiếu nại');
console.log('   - Chat trực tiếp với quán Cơm Thố');
console.log('   - Ví voucher có mã GIAM20K, CUUMON15');
console.log('   - Điểm thưởng 350 điểm + Tác động môi trường');
console.log('   - STK nhận tiền hoàn MB Bank đã liên kết');
console.log('   - Quán yêu thích, 2 địa điểm Nhà riêng & Công ty, Hồ sơ dị ứng\n');

await db.end();
