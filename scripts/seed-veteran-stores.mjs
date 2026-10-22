// Script tạo bộ dữ liệu kiểm thử nâng cao cho các TÀI KHOẢN CHỦ CỬA HÀNG KỲ CỰU (hoạt động 45 - 75 ngày).
// Dành riêng cho kịch bản DEMO TOÀN DIỆN MỌI CHỨC NĂNG CỦA HỆ THỐNG:
// 1. Phở Bò Cụ Chiêu (chuthucan.hanoi@surplusiq.vn) - Hoạt động 75 ngày (~2.5 tháng), gói PRO, 1.250+ suất cứu, 10 tuần đối soát, khiếu nại, đánh giá, AI cards.
// 2. Bún Chả Sinh Từ (chuthucan2.hanoi@surplusiq.vn) - Hoạt động 60 ngày (~2 tháng), gói PRO, 650+ suất cứu, 8 tuần đối soát, khách quen LOYAL.
// 3. Bánh Mì Chảo Cột Điện (chuthucan3.hanoi@surplusiq.vn) - Hoạt động 45 ngày (~1.5 tháng), gói PRO, 400+ suất cứu, chuyên combo & túi bất ngờ.
// Mật khẩu tất cả tài khoản: 123456

import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
require('dotenv').config({ path: new URL('../.env', import.meta.url) });

const DB = process.env.POSTGRES_DB || 'surplusiq_db';
if (
  process.env.NODE_ENV === 'production' ||
  /prod/i.test(DB) ||
  !/^(localhost|127\.0\.0\.1)$/.test(process.env.DB_HOST || 'localhost')
) {
  console.error('Từ chối chạy: chỉ dùng cho môi trường dev local.');
  process.exit(1);
}

const PASSWORD = '123456';
const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: +process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: DB,
});

await db.connect();
const q = async (sql, params) => (await db.query(sql, params)).rows;

console.log('\n🚀 BẮT ĐẦU SEED DỮ LIỆU TÀI KHOẢN CHỦ QUÁN KỲ CỰU (1 - 2.5 THÁNG HOẠT ĐỘNG)');

// Lấy password_hash mẫu chuẩn
const [{ password_hash: hash }] = await q(
  "SELECT password_hash FROM users WHERE email='chuthucan.hanoi@surplusiq.vn' LIMIT 1",
);

// Danh sách các Store ID
const STORE_A = 'a1000000-0000-4000-8000-000000000001'; // Phở Bò Gia Truyền Cụ Chiêu
const STORE_B = 'a1000000-0000-4000-8000-000000000002'; // Bún Chả Sinh Từ
const STORE_C = 'a1000000-0000-4000-8000-000000000003'; // Bánh Mì Chảo Cột Điện Quán

// 1. Đảm bảo các User Chủ Quán tồn tại và active
const OWNER_ACCOUNTS = [
  {
    email: 'chuthucan.hanoi@surplusiq.vn',
    phone: '0988100001',
    fullName: 'Cụ Chiêu (Chủ Quán Phở Cụ Chiêu - 75 ngày)',
    storeId: STORE_A,
  },
  {
    email: 'chuthucan2.hanoi@surplusiq.vn',
    phone: '0988300004',
    fullName: 'Anh Sinh (Chủ Quán Bún Chả Sinh Từ - 60 ngày)',
    storeId: STORE_B,
  },
  {
    email: 'chuthucan3.hanoi@surplusiq.vn',
    phone: '0988300005',
    fullName: 'Chị Lan (Chủ Bánh Mì Chảo Cột Điện - 45 ngày)',
    storeId: STORE_C,
  },
];

for (const owner of OWNER_ACCOUNTS) {
  let [user] = await q('SELECT id FROM users WHERE email = $1', [owner.email]);
  if (!user) {
    const newId = randomUUID();
    await q(
      `INSERT INTO users (id, email, phone, role, status, password_hash, full_name)
       VALUES ($1, $2, $3, 'STORE_USER', 'ACTIVE', $4, $5)`,
      [newId, owner.email, owner.phone, hash, owner.fullName],
    );
    user = { id: newId };
  } else {
    await q("UPDATE users SET full_name = $1, status = 'ACTIVE' WHERE id = $2", [
      owner.fullName,
      user.id,
    ]);
  }

  // Cập nhật chủ sở hữu cửa hàng
  await q("UPDATE stores SET owner_user_id = $1, status = 'ACTIVE' WHERE id = $2", [
    user.id,
    owner.storeId,
  ]);

  // Cập nhật store_members
  await q(
    `INSERT INTO store_members (store_id, user_id, permission, status)
     VALUES ($1, $2, 'OWNER', 'ACTIVE')
     ON CONFLICT (user_id) DO UPDATE SET store_id = excluded.store_id, permission = 'OWNER', status = 'ACTIVE'`,
    [owner.storeId, user.id],
  );
}

// 2. Kích hoạt Gói PRO & Lịch sử Hóa đơn Subscription cho cả 3 quán
console.log('📦 Cập nhật gói dịch vụ PRO và lịch sử thanh toán hóa đơn...');
for (const owner of OWNER_ACCOUNTS) {
  await q(
    `INSERT INTO subscriptions (store_id, plan, status, period_start, period_end, cancel_at_period_end, downgrade_at_period_end, trial_used)
     VALUES ($1, 'PRO', 'ACTIVE', now() - interval '90 days', now() + interval '30 days', false, false, true)
     ON CONFLICT (store_id) DO UPDATE
     SET plan = 'PRO', status = 'ACTIVE', period_end = now() + interval '30 days'`,
    [owner.storeId],
  );

  // Tạo 2-3 kỳ hóa đơn thuê bao đã thanh toán (PAID) trong quá khứ để demo sao kê
  const invoiceMonths = [75, 45, 15];
  for (const daysAgo of invoiceMonths) {
    const endDaysAgo = daysAgo - 30;
    await q(
      `INSERT INTO subscription_invoices (id, store_id, period_start, period_end, amount, payment_txn_id, status, created_at, updated_at)
       VALUES ($1, $2, now() - ($3 || ' days')::interval, now() - ($4 || ' days')::interval, 499000, $5, 'PAID', now() - ($3 || ' days')::interval, now() - ($3 || ' days')::interval)
       ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        owner.storeId,
        String(daysAgo),
        String(endDaysAgo),
        'TXN_SUB_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      ],
    );
  }
}

// Lấy danh sách khách hàng có sẵn trong DB để đặt đơn
const customers = await q(
  "SELECT id, email, full_name FROM users WHERE role = 'CUSTOMER' AND status = 'ACTIVE' ORDER BY email",
);
if (customers.length === 0) {
  throw new Error('Chưa có khách hàng CUSTOMER nào trong DB. Hãy chạy seed:hanoi trước.');
}

// Đảm bảo Quán 2 và Quán 3 có đủ món đa dạng
console.log('🍲 Kiểm tra và bổ sung món ăn cho các quán...');
const STORE_B_ITEMS = [
  ['Nem cua bể Hải Phòng', 'Món chính', 75000, 45000],
  ['Chả giò que giòn rụm (6 cái)', 'Món ăn kèm', 35000, 20000],
  ['Trà quất mật ong hoa nhài', 'Đồ uống', 25000, 12000],
];
for (const [name, cat, origPrice] of STORE_B_ITEMS) {
  const existing = await q('SELECT id FROM items WHERE store_id = $1 AND name = $2', [
    STORE_B,
    name,
  ]);
  if (existing.length === 0) {
    await q(
      `INSERT INTO items (id, store_id, name, category, original_price, standard_shelf_life_hours, status)
       VALUES ($1, $2, $3, $4, $5, 12, 'ACTIVE')`,
      [randomUUID(), STORE_B, name, cat, origPrice],
    );
  }
}

const STORE_C_ITEMS = [
  ['Bánh mì chảo đặc biệt (Xúc xích, pate, trứng lòng đào)', 'Món chính', 55000, 32000],
  ['Bánh mì sốt vang bò gân mềm', 'Món chính', 60000, 35000],
  ['Sữa đậu nành béo ngậy', 'Đồ uống', 15000, 8000],
  ['Túi Bất Ngờ Cuối Ngày (Bánh mì & Topping)', 'Túi cứu món', 50000, 25000],
];
for (const [name, cat, origPrice] of STORE_C_ITEMS) {
  const existing = await q('SELECT id FROM items WHERE store_id = $1 AND name = $2', [
    STORE_C,
    name,
  ]);
  if (existing.length === 0) {
    await q(
      `INSERT INTO items (id, store_id, name, category, original_price, standard_shelf_life_hours, status)
       VALUES ($1, $2, $3, $4, $5, 12, 'ACTIVE')`,
      [randomUUID(), STORE_C, name, cat, origPrice],
    );
  }
}

// Hàm hỗ trợ hash checksum SHA256 cho sao kê đối soát
function computeChecksum(data) {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// 3. Tiến hành Seed Dữ Liệu Lịch Sử Cho Từng Quán Kỳ Cựu
async function seedStoreHistory({ storeId, storeName, daysCount, _baseRescuedPerDay }) {
  console.log(`\n--- 🏪 Đang seed dữ liệu cho: ${storeName} (${daysCount} ngày hoạt động) ---`);

  // Xóa sạch dữ liệu phát sinh cũ của quán này để seed mới hoàn hảo, không bị trùng khóa ngoại
  await q('DELETE FROM complaints WHERE store_id = $1', [storeId]);
  await q('DELETE FROM reviews WHERE store_id = $1', [storeId]);
  await q('DELETE FROM customer_notes WHERE store_id = $1', [storeId]);
  await q('DELETE FROM customer_segments WHERE store_id = $1', [storeId]);
  await q('DELETE FROM action_cards WHERE store_id = $1', [storeId]);
  await q('DELETE FROM anomalies WHERE store_id = $1', [storeId]);
  await q(
    'DELETE FROM statement_lines WHERE statement_id IN (SELECT id FROM weekly_statements WHERE store_id = $1)',
    [storeId],
  );
  await q('DELETE FROM weekly_statements WHERE store_id = $1', [storeId]);
  await q('DELETE FROM daily_actuals WHERE store_id = $1', [storeId]);
  await q('DELETE FROM orders WHERE store_id = $1', [storeId]);
  await q("DELETE FROM offers WHERE store_id = $1 AND pickup_start < now() - interval '1 hour'", [
    storeId,
  ]);

  const items = await q(
    "SELECT id, name, original_price FROM items WHERE store_id = $1 AND status = 'ACTIVE' ORDER BY name",
    [storeId],
  );
  if (items.length === 0) {
    console.warn(`Quán ${storeName} không có món ăn.`);
    return;
  }

  let totalOrdersCreated = 0;
  let totalRescuedQuantity = 0;
  const createdOrderIds = [];

  // A. Seed Lịch Sử Daily Actuals, Offers và Orders theo từng ngày (từ daysCount ngày trước đến hôm nay)
  console.log(`  -> Tạo ${daysCount} ngày lịch sử sản xuất, tiêu thụ và đơn cứu món...`);

  for (let d = daysCount; d >= 1; d--) {
    const isWeekend = d % 7 === 1 || d % 7 === 2; // Cuối tuần
    const dayFactor = isWeekend ? 1.3 : 1.0;

    for (let k = 0; k < items.length; k++) {
      const it = items[k];
      const produced = Math.round((30 + ((d * 3 + k * 7) % 25)) * dayFactor);
      const soldOffline = Math.round(produced * 0.72);
      const surplus = produced - soldOffline;
      const appSold = Math.min(surplus, Math.round(surplus * 0.85) || 2);

      // 1. Chèn daily_actuals
      await q(
        `INSERT INTO daily_actuals (id, store_id, item_id, date, produced, sold_offline, sold_app, stockout_at, locked_at, created_at, updated_at)
         VALUES ($1, $2, $3, date_trunc('day', now() - ($4 || ' days')::interval)::date, $5, $6, $7,
           date_trunc('day', now() - ($4 || ' days')::interval) + interval '20 hours',
           date_trunc('day', now() - ($4 || ' days')::interval) + interval '22 hours',
           date_trunc('day', now() - ($4 || ' days')::interval) + interval '6 hours',
           date_trunc('day', now() - ($4 || ' days')::interval) + interval '22 hours')
         ON CONFLICT (store_id, item_id, date) DO UPDATE
         SET produced = excluded.produced, sold_offline = excluded.sold_offline, sold_app = excluded.sold_app`,
        [randomUUID(), storeId, it.id, String(d), produced, soldOffline, appSold],
      );

      // 2. Chèn offer đã đóng
      const offerId = randomUUID();
      const currentPrice = Math.round((it.original_price * 0.55) / 1000) * 1000;
      const floorPrice = Math.round((it.original_price * 0.4) / 1000) * 1000;
      const totalOfferQty = surplus;
      const remainingQty = surplus - appSold;

      await q(
        `INSERT INTO offers (id, store_id, item_id, kind, total_quantity, remaining_quantity, sold_quantity,
           original_price, current_price, floor_price, pickup_start, pickup_end, expires_at, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'REGULAR', $4, $5, $6, $7, $8, $9,
           date_trunc('day', now() - ($10 || ' days')::interval) + interval '17 hours',
           date_trunc('day', now() - ($10 || ' days')::interval) + interval '21 hours',
           date_trunc('day', now() - ($10 || ' days')::interval) + interval '21 hours',
           'CLOSED',
           date_trunc('day', now() - ($10 || ' days')::interval) + interval '10 hours',
           date_trunc('day', now() - ($10 || ' days')::interval) + interval '22 hours')`,
        [
          offerId,
          storeId,
          it.id,
          totalOfferQty,
          remainingQty,
          appSold,
          it.original_price,
          currentPrice,
          floorPrice,
          String(d),
        ],
      );

      // 3. Chèn các đơn hàng (Orders) cho offer này
      // Tách số lượng bán theo các đơn (1-3 suất/đơn)
      let remainingToOrder = appSold;
      let orderIndex = 0;

      while (remainingToOrder > 0) {
        const orderQty = Math.min(remainingToOrder, ((d + k + orderIndex) % 3) + 1); // 1..3
        remainingToOrder -= orderQty;
        orderIndex++;

        const buyer = customers[(d * 7 + k * 3 + orderIndex) % customers.length];
        const orderId = randomUUID();
        const code = 'SQ' + randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

        // Quyết định trạng thái đơn: 90% PICKED_UP, 6% PICKUP_EXPIRED, 4% CANCELLED
        let status;
        const randStatus = (d * 13 + k * 7 + orderIndex) % 100;
        let cancelledAt = null;
        let cancelReason = null;
        let cancelledBy = null;
        let pickedUpAt = null;

        if (randStatus < 4) {
          status = 'CANCELLED';
          cancelledAt = `date_trunc('day', now() - (${d} || ' days')::interval) + interval '17 hours 30 minutes'`;
          cancelReason = 'Khách có việc đột xuất không thể tới lấy';
          cancelledBy = 'CUSTOMER';
        } else if (randStatus < 10) {
          status = 'PICKUP_EXPIRED';
        } else {
          status = 'PICKED_UP';
          pickedUpAt = `date_trunc('day', now() - (${d} || ' days')::interval) + interval '18 hours 30 minutes'`;
          totalRescuedQuantity += orderQty;
        }

        await q(
          `INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount,
             status, hold_expires_at, paid_at, picked_up_at, cancelled_at, cancel_reason, cancelled_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9,
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '17 hours 15 minutes',
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '17 hours 10 minutes',
             ${pickedUpAt ? pickedUpAt : 'NULL'},
             ${cancelledAt ? cancelledAt : 'NULL'},
             $11, $12,
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '17 hours',
             date_trunc('day', now() - ($10 || ' days')::interval) + interval '19 hours')`,
          [
            orderId,
            code,
            buyer.id,
            storeId,
            offerId,
            orderQty,
            currentPrice,
            currentPrice * orderQty,
            status,
            String(d),
            cancelReason,
            cancelledBy,
          ],
        );

        totalOrdersCreated++;
        createdOrderIds.push({
          id: orderId,
          customerId: buyer.id,
          status,
          totalAmount: currentPrice * orderQty,
          daysAgo: d,
        });
      }
    }
  }

  // B. Seed Đối Soát Tuần (Weekly Statements & Statement Lines)
  // Tính số tuần = floor(daysCount / 7)
  const weeksCount = Math.floor(daysCount / 7);
  console.log(
    `  -> Tạo ${weeksCount} tuần sao kê đối soát tài chính (8-9 tuần LOCKED đã thanh toán, 1 tuần DRAFT)...`,
  );

  for (let w = weeksCount; w >= 0; w--) {
    const isCurrentWeek = w === 0;
    const statementId = randomUUID();
    const weekStartDaysAgo = w * 7 + 7;
    const weekEndDaysAgo = w * 7 + 1;

    // Lấy doanh thu các đơn hàng của quán trong tuần này
    const weekOrders = createdOrderIds.filter(
      (o) =>
        o.daysAgo <= weekStartDaysAgo && o.daysAgo >= weekEndDaysAgo && o.status === 'PICKED_UP',
    );
    const gross = weekOrders.reduce((acc, o) => acc + o.totalAmount, 0) || 1500000;
    const commission = Math.round(gross * 0.12); // 12% hoa hồng nền tảng
    const refunds = Math.round((gross * 0.02) / 1000) * 1000;
    const subscriptionFee = w % 4 === 0 ? 499000 : 0; // Trừ phí gói định kỳ mỗi 4 tuần
    const netPayable = Math.max(0, gross - commission - refunds - subscriptionFee);
    const status = isCurrentWeek ? 'DRAFT' : 'LOCKED';

    const metadata = {
      orderCount: weekOrders.length,
      payoutBatchId: isCurrentWeek ? null : 'BATCH_PAYOUT_W' + (weeksCount - w),
      generatedAt: new Date(Date.now() - weekEndDaysAgo * 86400000).toISOString(),
    };
    const checksum = computeChecksum({ storeId, gross, commission, netPayable, status, w });

    await q(
      `INSERT INTO weekly_statements (id, store_id, week_start, week_end, gross, commission, refunds, subscription_fee, adjustments, net_payable, status, checksum, flags, created_at, updated_at)
       VALUES ($1, $2,
         date_trunc('day', now() - ($3 || ' days')::interval)::date,
         date_trunc('day', now() - ($4 || ' days')::interval)::date,
         $5, $6, $7, $8, 0, $9, $10, $11, $12,
         date_trunc('day', now() - ($4 || ' days')::interval) + interval '23 hours',
         date_trunc('day', now() - ($4 || ' days')::interval) + interval '23 hours')
       ON CONFLICT (store_id, week_start) DO UPDATE
       SET gross = excluded.gross, commission = excluded.commission, net_payable = excluded.net_payable, status = excluded.status`,
      [
        statementId,
        storeId,
        String(weekStartDaysAgo),
        String(weekEndDaysAgo),
        gross,
        commission,
        refunds,
        subscriptionFee,
        netPayable,
        status,
        checksum,
        JSON.stringify(metadata),
      ],
    );

    // Tạo các dòng bút toán chi tiết (Statement Lines) cho tuần
    const sampleWeekOrders = weekOrders.slice(0, 8);
    for (const ord of sampleWeekOrders) {
      await q(
        `INSERT INTO statement_lines (id, statement_id, order_id, type, amount, commission, created_at)
         VALUES ($1, $2, $3, 'ORDER_REVENUE', $4, $5, date_trunc('day', now() - ($6 || ' days')::interval) + interval '18 hours')`,
        [
          randomUUID(),
          statementId,
          ord.id,
          ord.totalAmount,
          Math.round(ord.totalAmount * 0.12),
          String(ord.daysAgo),
        ],
      );
    }
  }

  // C. Seed Đánh Giá (Reviews) kèm phản hồi của Chủ Quán
  console.log('  -> Tạo 15-25 đánh giá chân thực và phản hồi của chủ quán...');
  const REVIEWS_SAMPLE = [
    {
      rating: 5,
      comment: 'Món ăn vẫn giữ được độ nóng hổi, nước dùng đậm vị rất ngon. Nhận hàng rất nhanh!',
      reply: 'Cảm ơn bạn đã luôn đồng hành cùng quán cứu thực phẩm ngon mỗi ngày ạ ❤️',
    },
    {
      rating: 5,
      comment: 'Cứu món giá siêu hời, chất lượng như ăn tại quán bình thường. Tuyệt vời SurplusIQ!',
      reply: 'Dạ quán luôn cam kết chất lượng tốt nhất gửi tới quý khách!',
    },
    {
      rating: 4,
      comment:
        'Đóng gói cẩn thận, sạch sẽ. Giá mà quán cho thêm nhiều ớt cay xíu nữa thì hoàn hảo.',
      reply: 'Quán đã ghi nhận và sẽ chuẩn bị sẵn gia vị theo yêu cầu cho lần sau bạn nhé.',
    },
    {
      rating: 5,
      comment: 'Rất ưng ý! Mình là khách quen ngày nào cũng canh khung 17h để nhận đơn.',
      reply: 'Cảm ơn khách ruột của quán ạ, hẹn gặp bạn chiều nay nhé!',
    },
    {
      rating: 4,
      comment: 'Thịt thơm ngon, rau sống tươi rói, không hề có cảm giác đồ thừa cuối ngày.',
      reply: 'Đồ ăn đều được nấu và chuẩn bị trong ngày nên bạn hoàn toàn yên tâm nhé!',
    },
    {
      rating: 5,
      comment: 'Nhân viên quán nhiệt tình, quét QR nhận đồ chỉ mất 15 giây.',
      reply: 'Cảm ơn bạn đã feedback giúp các bạn nhân viên có thêm động lực ạ!',
    },
    {
      rating: 3,
      comment: 'Hôm nay hơi đông nên phải đợi 3 phút mới lấy được món.',
      reply:
        'Thành thật xin lỗi bạn vì sự bất tiện này, quán sẽ phân luồng nhận hàng nhanh hơn vào giờ cao điểm ạ.',
    },
  ];

  const pickedUpOrders = createdOrderIds.filter((o) => o.status === 'PICKED_UP').slice(0, 18);
  for (let i = 0; i < pickedUpOrders.length; i++) {
    const ord = pickedUpOrders[i];
    const sample = REVIEWS_SAMPLE[i % REVIEWS_SAMPLE.length];

    await q(
      `INSERT INTO reviews (id, order_id, customer_id, store_id, rating, comment, status, store_reply, store_reply_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'VISIBLE', $7,
         date_trunc('day', now() - ($8 || ' days')::interval) + interval '21 hours',
         date_trunc('day', now() - ($8 || ' days')::interval) + interval '19 hours',
         date_trunc('day', now() - ($8 || ' days')::interval) + interval '21 hours')
       ON CONFLICT (order_id) DO NOTHING`,
      [
        randomUUID(),
        ord.id,
        ord.customerId,
        storeId,
        sample.rating,
        sample.comment,
        sample.reply,
        String(ord.daysAgo),
      ],
    );
  }

  // D. Seed Khiếu Nại (Complaints) - Đa dạng trạng thái (Đặc biệt 1 đơn PENDING_STORE để demo xử lý)
  console.log('  -> Tạo khiếu nại (có 1 khiếu nại PENDING_STORE để demo xử lý trực tiếp)...');
  const complaintOrders = createdOrderIds.filter((o) => o.status === 'PICKED_UP').slice(20, 24);

  if (complaintOrders.length >= 3) {
    // 1. Khiếu nại ĐANG CHỜ CHỦ QUÁN XỬ LÝ (PENDING_STORE) - đơn mới nhất
    await q(
      `INSERT INTO complaints (id, order_id, customer_id, store_id, category, description, status, response_due_at, extended, refund_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Chất lượng món', 'Suất ăn bị nguội và quán quên cho nước chấm kèm theo, mong quán kiểm tra lại giúp mình.',
         'PENDING_STORE', now() + interval '24 hours', false, 0, now() - interval '2 hours', now() - interval '2 hours')
       ON CONFLICT DO NOTHING`,
      [randomUUID(), complaintOrders[0].id, complaintOrders[0].customerId, storeId],
    );

    // 2. Khiếu nại ĐÃ ĐƯỢC CHỦ QUÁN CHẤP NHẬN HOÀN TIỀN (ACCEPTED)
    await q(
      `INSERT INTO complaints (id, order_id, customer_id, store_id, category, description, status, response_due_at, extended, refund_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Thiếu món', 'Đơn đặt 2 suất nhưng quán đóng nhầm 1 suất.',
         'ACCEPTED', now() - interval '5 days', false, $5, now() - interval '6 days', now() - interval '5 days')
       ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        complaintOrders[1].id,
        complaintOrders[1].customerId,
        storeId,
        complaintOrders[1].totalAmount / 2,
      ],
    );

    // 3. Khiếu nại TỪ CHỐI (REJECTED)
    await q(
      `INSERT INTO complaints (id, order_id, customer_id, store_id, category, description, status, response_due_at, extended, refund_amount, reject_reason, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Khác', 'Khách đổi ý muốn hoàn tiền sau khi đã nhận và sử dụng hết món.',
         'REJECTED', now() - interval '12 days', false, 0, 'Món ăn đã được bàn giao nguyên vẹn và xác nhận quét mã hợp lệ tại quầy.', now() - interval '13 days', now() - interval '12 days')
       ON CONFLICT DO NOTHING`,
      [randomUUID(), complaintOrders[2].id, complaintOrders[2].customerId, storeId],
    );
  }

  // E. Seed Cảnh Báo AI Anomalies & Action Cards
  console.log(
    '  -> Tạo cảnh báo AI bất thường (Anomalies) và khuyến nghị vận hành (Action Cards)...',
  );
  const ANOMALIES_DATA = [
    { metric: 'DEMAND_SURGE', date: 3, expected: 8, actual: 22, mad: 3.4, status: 'OPEN' },
    { metric: 'WASTE_SPIKE', date: 14, expected: 5, actual: 16, mad: 2.8, status: 'RESOLVED' },
    { metric: 'OFFLINE_DROP', date: 35, expected: 45, actual: 24, mad: 2.5, status: 'RESOLVED' },
  ];
  for (const a of ANOMALIES_DATA) {
    await q(
      `INSERT INTO anomalies (id, store_id, metric, date, expected_value, actual_value, mad_score, status, created_at, updated_at)
       VALUES ($1, $2, $3, date_trunc('day', now() - ($4 || ' days')::interval)::date, $5, $6, $7, $8,
         date_trunc('day', now() - ($4 || ' days')::interval), date_trunc('day', now() - ($4 || ' days')::interval))
       ON CONFLICT DO NOTHING`,
      [randomUUID(), storeId, a.metric, String(a.date), a.expected, a.actual, a.mad, a.status],
    );
  }

  const ACTION_CARDS_DATA = [
    {
      actionType: 'OPTIMIZE_FLASH_SALE',
      payload: { suggestedDiscount: 35, targetHour: 19 },
      reasonText:
        'Khung 19h - 20h thường còn dư 6-8 suất, nên kích hoạt flash sale giảm 35% từ 18h30.',
      expectedOutcome: 'Tăng tỷ lệ cứu món lên 94% và thu hồi thêm ~350.000đ mỗi ngày.',
      status: 'PENDING',
    },
    {
      actionType: 'INCREASE_PRODUCTION',
      payload: { itemId: items[0].id, additionalQty: 5 },
      reasonText: 'Nhu cầu món chính vào thứ Sáu & thứ Bảy luôn vượt dự kiến 25%.',
      expectedOutcome: 'Tránh cháy hàng sớm, phục vụ thêm 5 lượt khách cứu món.',
      status: 'ACCEPTED',
    },
    {
      actionType: 'COMBO_PROMOTION',
      payload: { comboDiscount: 40 },
      reasonText: 'Tạo combo kèm đồ uống giúp giải phóng món phụ nhanh gấp 2 lần.',
      expectedOutcome: 'Tăng giá trị đơn bình quân (AOV) lên 18%.',
      status: 'PENDING',
    },
  ];
  for (const c of ACTION_CARDS_DATA) {
    await q(
      `INSERT INTO action_cards (id, store_id, action_type, payload, reason_text, expected_outcome, status, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now() + interval '3 days', now() - interval '1 day', now() - interval '1 day')
       ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        storeId,
        c.actionType,
        JSON.stringify(c.payload),
        c.reasonText,
        c.expectedOutcome,
        c.status,
      ],
    );
  }

  // F. Seed Phân Khúc Khách Hàng (Customer Segments) và Ghi Chú Nội Bộ (Customer Notes)
  console.log(
    '  -> Tạo phân khúc khách hàng (LOYAL, AT_RISK, NEW) và ghi chú nội bộ của chủ quán...',
  );
  const customerList = customers.slice(0, 10);
  const segments = ['LOYAL', 'LOYAL', 'LOYAL', 'AT_RISK', 'NEW', 'NEW', 'FREQUENT_NOSHOW'];
  const notes = [
    'Khách quen tuần nào cũng ghé 3-4 lần, thích nhiều hành và quẩy giòn.',
    'Khách văn phòng Duy Tân, thường nhận đúng khung 18h30.',
    'Khách VIP gia đình, hay mua 3 suất combo cuối tuần.',
    'Khách từng hủy đơn 1 lần do kẹt xe, nhân viên lưu ý hỗ trợ giữ ấm món.',
    'Khách mới dùng app lần đầu, cần hướng dẫn quét QR niềm nở.',
  ];

  for (let i = 0; i < customerList.length; i++) {
    const c = customerList[i];
    const seg = segments[i % segments.length];

    await q(
      `INSERT INTO customer_segments (store_id, customer_id, segment, computed_at, created_at, updated_at)
       VALUES ($1, $2, $3, now(), now() - interval '10 days', now())
       ON CONFLICT (store_id, customer_id) DO UPDATE SET segment = excluded.segment`,
      [storeId, c.id, seg],
    );

    if (notes[i]) {
      await q(
        `INSERT INTO customer_notes (store_id, customer_id, note, created_at, updated_at)
         VALUES ($1, $2, $3, now() - interval '5 days', now())
         ON CONFLICT (store_id, customer_id) DO UPDATE SET note = excluded.note`,
        [storeId, c.id, notes[i]],
      );
    }
  }

  console.log(`  ✅ Hoàn tất quán ${storeName}:`);
  console.log(`     + Tổng đơn hàng lịch sử: ${totalOrdersCreated}`);
  console.log(`     + Tổng số suất cứu món thành công: ${totalRescuedQuantity} suất`);
  console.log(`     + Số tuần sao kê đối soát: ${weeksCount + 1} tuần`);
}

// Chạy seed lịch sử cho cả 3 quán kỳ cựu
await seedStoreHistory({
  storeId: STORE_A,
  storeName: 'Phở Bò Gia Truyền Cụ Chiêu',
  daysCount: 75,
  baseRescuedPerDay: 16,
});

await seedStoreHistory({
  storeId: STORE_B,
  storeName: 'Bún Chả Sinh Từ',
  daysCount: 60,
  baseRescuedPerDay: 11,
});

await seedStoreHistory({
  storeId: STORE_C,
  storeName: 'Bánh Mì Chảo Cột Điện Quán',
  daysCount: 45,
  baseRescuedPerDay: 9,
});

// Làm mới các suất đang mở hôm nay để demo đặt/nhận đơn tức thì
await q(
  `UPDATE offers SET pickup_start = now() - interval '1 hour', pickup_end = now() + interval '8 hours', expires_at = now() + interval '8 hours'
   WHERE status = 'OPEN' AND pickup_end < now() + interval '4 hours'`,
);

// 4. Bảng tổng kết kết quả
console.log(
  '\n========================================================================================',
);
console.log('🎉 TỔNG KẾT BỘ TÀI KHOẢN CHỦ QUÁN KỲ CỰU ĐÃ SẴN SÀNG CHO DEMO');
console.log(
  '========================================================================================',
);

const summary = await q(
  `
  SELECT 
    s.id as store_id,
    s.name as store_name,
    u.email as owner_email,
    sub.plan as plan,
    (SELECT count(*) FROM orders o WHERE o.store_id = s.id)::int as total_orders,
    (SELECT coalesce(sum(o.quantity), 0) FROM orders o WHERE o.store_id = s.id AND o.status = 'PICKED_UP')::int as rescued_items,
    (SELECT count(*) FROM weekly_statements ws WHERE ws.store_id = s.id)::int as statements_count,
    (SELECT count(*) FROM reviews r WHERE r.store_id = s.id)::int as reviews_count,
    (SELECT count(*) FROM complaints c WHERE c.store_id = s.id)::int as complaints_count
  FROM stores s
  JOIN users u ON u.id = s.owner_user_id
  LEFT JOIN subscriptions sub ON sub.store_id = s.id
  WHERE s.id IN ($1, $2, $3)
  ORDER BY s.id
`,
  [STORE_A, STORE_B, STORE_C],
);

console.table(summary);
console.log(`\n🔑 MẬT KHẨU ĐĂNG NHẬP CHUNG: ${PASSWORD}`);
console.log(
  'Các tài khoản trên đều có đầy đủ biểu đồ 60–75 ngày, sao kê đối soát tuần, khiếu nại chờ xử lý, đánh giá và AI insights.',
);

await db.end();
