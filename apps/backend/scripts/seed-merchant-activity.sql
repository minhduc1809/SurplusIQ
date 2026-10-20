-- Nạp dữ liệu hoạt động mẫu cho cửa hàng demo (Rincón del Pan - Pasteur) để thử đủ luồng của app chủ cửa hàng:
-- 60 ngày đơn hàng, khách đủ 4 nhóm, đánh giá, khiếu nại, ưu đãi, chiến dịch, nhân viên, thông báo, số cuối ngày.
-- Chạy lại được nhiều lần: dòng do script tạo đều có tiền tố 'dddddddd-' / mã 'DM' / email 'demo.*' và được xóa trước khi nạp.
-- Chỉ dùng cho môi trường phát triển. Chạy:
--   docker exec -i surplusiq_postgres psql -U surplus_admin -d surplusiq_db -v ON_ERROR_STOP=1 < apps/backend/scripts/seed-merchant-activity.sql

BEGIN;
SELECT setseed(0.42);

-- ---------- 0. Dọn lần nạp trước ----------
DELETE FROM campaign_deliveries WHERE campaign_id::text LIKE 'dddddddd-%';
DELETE FROM campaigns WHERE id::text LIKE 'dddddddd-%';
DELETE FROM promotions WHERE id::text LIKE 'dddddddd-%';
DELETE FROM reviews WHERE id::text LIKE 'dddddddd-%';
DELETE FROM complaints WHERE id::text LIKE 'dddddddd-%';
DELETE FROM notifications WHERE data->>'demo' = 'true';
DELETE FROM orders WHERE code LIKE 'DM%';
DELETE FROM offers WHERE id::text LIKE 'dddddddd-%';
DELETE FROM daily_actuals WHERE id::text LIKE 'dddddddd-%';
DELETE FROM store_members WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'demo.%@surplusiq.vn');
DELETE FROM favorite_stores WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'demo.%@surplusiq.vn');
DELETE FROM consents WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'demo.%@surplusiq.vn');
DELETE FROM customer_profiles WHERE user_id IN (SELECT id FROM users WHERE email::text LIKE 'demo.%@surplusiq.vn');
DELETE FROM users WHERE email::text LIKE 'demo.%@surplusiq.vn';

-- ---------- 1. Người dùng: 24 khách + quản lý + nhân viên quầy ----------
DO $$
DECLARE
  pw text := (SELECT password_hash FROM users WHERE email = 'customer@surplusiq.vn');
  names text[] := ARRAY[
    'Nguyễn Minh Anh','Trần Quốc Bảo','Lê Thu Hà','Phạm Gia Huy','Võ Ngọc Lan','Đặng Hoàng Nam',
    'Bùi Thanh Tâm','Hoàng Phương Linh','Phan Đức Trọng','Vũ Khánh Vy','Đỗ Anh Tuấn','Ngô Mai Chi',
    'Dương Hải Đăng','Lý Bảo Châu','Trương Quang Vinh','Huỳnh Yến Nhi','Mai Thế Sơn','Đinh Cẩm Tú',
    'Tô Gia Bảo','Lâm Thùy Dung','Cao Nhật Minh','Hồ Bích Ngọc','Châu Tuấn Kiệt','Kiều Hà My'];
  i int;
BEGIN
  FOR i IN 1..24 LOOP
    INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at)
    VALUES (format('dddddddd-0000-4000-a000-%s', lpad(i::text, 12, '0'))::uuid,
            format('demo.kh%s@surplusiq.vn', lpad(i::text, 2, '0')), pw, 'CUSTOMER', 'ACTIVE',
            now() - interval '70 days', now());
    INSERT INTO customer_profiles (user_id, full_name, created_at, updated_at)
    VALUES (format('dddddddd-0000-4000-a000-%s', lpad(i::text, 12, '0'))::uuid, names[i], now() - interval '70 days', now());
  END LOOP;

  INSERT INTO users (id, email, full_name, password_hash, role, status, created_at, updated_at) VALUES
   ('dddddddd-0000-4000-b000-000000000001', 'demo.quanly@surplusiq.vn', 'Trần Thị Quản Lý', pw, 'STORE_USER', 'ACTIVE', now() - interval '40 days', now()),
   ('dddddddd-0000-4000-b000-000000000002', 'demo.quay@surplusiq.vn', 'Lê Văn Quầy', pw, 'STORE_USER', 'ACTIVE', now() - interval '30 days', now());
  INSERT INTO store_members (store_id, user_id, permission, status, last_active_at, created_at, updated_at) VALUES
   ('33333333-3333-4333-a333-333333333301', 'dddddddd-0000-4000-b000-000000000001', 'MANAGER', 'ACTIVE', now() - interval '1 hour', now() - interval '40 days', now()),
   ('33333333-3333-4333-a333-333333333301', 'dddddddd-0000-4000-b000-000000000002', 'COUNTER', 'ACTIVE', now() - interval '1 day', now() - interval '30 days', now());
  UPDATE users SET full_name = 'Nguyễn Hoàng Long' WHERE id = '11111111-1111-4111-a111-111111111111' AND full_name IS NULL;
END $$;

-- ---------- 2. Suất đã đóng: 60 ngày x 2 món ----------
DO $$
DECLARE
  s uuid := '33333333-3333-4333-a333-333333333301';
  items uuid[] := ARRAY['44444444-4444-4444-a444-444444444401'::uuid, 'd505d3f1-77f1-4ce5-9d19-d8674cbb920e'::uuid];
  prices int[] := ARRAY[90000, 45000];
  d int; k int; today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  orig int; cur int; flo int; ps timestamptz;
BEGIN
  FOR d IN 1..62 LOOP
    FOR k IN 1..2 LOOP
      orig := prices[k]; flo := round(orig * 0.25 / 500) * 500; cur := round(orig * 0.33 / 500) * 500;
      ps := ((today - d) + time '19:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
      INSERT INTO offers (id, store_id, item_id, kind, total_quantity, remaining_quantity, sold_quantity, original_price,
                          current_price, floor_price, pickup_start, pickup_end, expires_at, status, price_change_count, created_at, updated_at)
      VALUES (format('dddddddd-1000-4000-a000-%s', lpad((d * 10 + k)::text, 12, '0'))::uuid, s, items[k],
              CASE WHEN k = 1 THEN 'SURPRISE_BAG' ELSE 'REGULAR' END::offer_kind_enum, 10, 10, 0, orig, cur, flo,
              ps, ps + interval '2 hours', ps + interval '3 hours', 'CLOSED', 0, ps - interval '5 hours', ps + interval '2 hours');
    END LOOP;
  END LOOP;
END $$;

-- ---------- 3. Đơn hàng theo kịch bản từng nhóm khách ----------
CREATE TEMP TABLE plan (cust int, days_ago int, status text, hour_vn int) ON COMMIT DROP;
-- Thân thiết (1-5): mua đều 3 ngày một lần
INSERT INTO plan SELECT c, d, CASE WHEN random() < 0.07 THEN 'CANCELLED' ELSE 'PICKED_UP' END, 17 + floor(random() * 4)::int
  FROM generate_series(1, 5) c, LATERAL generate_series(1 + (c % 3), 29, 3) d;
-- Có nguy cơ rời (6-10): chỉ mua cách đây 36-55 ngày
INSERT INTO plan SELECT c, d, 'PICKED_UP', 18 + floor(random() * 3)::int
  FROM generate_series(6, 10) c, LATERAL unnest(ARRAY[36 + c, 42 + c, 50 + c]) d;
-- Hay không đến nhận (11-13)
INSERT INTO plan SELECT c, d, CASE WHEN (d + c) % 5 IN (0, 1, 2) THEN 'PICKUP_EXPIRED' ELSE 'PICKED_UP' END, 18 + floor(random() * 3)::int
  FROM generate_series(11, 13) c, LATERAL unnest(ARRAY[2, 5, 9, 13, 18]) d;
-- Khách mới (14-24): một đơn trong 10 ngày gần đây
INSERT INTO plan SELECT c, 1 + (c - 14), 'PICKED_UP', 18 + floor(random() * 3)::int FROM generate_series(14, 24) c;
-- Hôm nay: đơn chờ nhận và đã nhận
INSERT INTO plan VALUES (1, 0, 'PAID', 17), (2, 0, 'PAID', 18), (3, 0, 'PAID', 18), (4, 0, 'PICKED_UP', 17), (15, 0, 'CANCELLED', 17);

DO $$
DECLARE
  s uuid := '33333333-3333-4333-a333-333333333301';
  r record; seq int := 0; k int; qty int; oid uuid; offer uuid; cur int; created timestamptz; ps timestamptz;
  today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
  FOR r IN SELECT * FROM plan ORDER BY days_ago DESC, cust LOOP
    seq := seq + 1;
    k := 1 + ((r.cust + r.days_ago) % 2);
    qty := 1 + (random() < 0.25)::int;
    created := ((today - r.days_ago) + make_time(r.hour_vn, floor(random() * 50)::int, 0)) AT TIME ZONE 'Asia/Ho_Chi_Minh';
    ps := ((today - r.days_ago) + time '19:00') AT TIME ZONE 'Asia/Ho_Chi_Minh';
    IF r.days_ago = 0 THEN
      offer := '55555555-5555-4555-a555-555555555501'; k := 1; cur := 29900;
    ELSE
      offer := format('dddddddd-1000-4000-a000-%s', lpad((r.days_ago * 10 + k)::text, 12, '0'))::uuid;
      SELECT current_price INTO cur FROM offers WHERE id = offer;
    END IF;
    oid := format('dddddddd-2000-4000-a000-%s', lpad(seq::text, 12, '0'))::uuid;
    INSERT INTO orders (id, code, customer_id, store_id, offer_id, quantity, unit_price, discount_amount, total_amount, status,
                        hold_expires_at, pickup_slot, paid_at, picked_up_at, picked_up_by, cancelled_at, cancel_reason, cancelled_by, created_at, updated_at)
    VALUES (oid, 'DM' || lpad(seq::text, 6, '0'), format('dddddddd-0000-4000-a000-%s', lpad(r.cust::text, 12, '0'))::uuid, s, offer, qty, cur, 0, cur * qty,
            r.status::order_status_enum, created + interval '10 minutes', ps,
            CASE WHEN r.status <> 'CANCELLED' THEN created + interval '2 minutes' END,
            CASE WHEN r.status = 'PICKED_UP' THEN ps + interval '25 minutes' END,
            CASE WHEN r.status = 'PICKED_UP' THEN 'demo.quay@surplusiq.vn' END,
            CASE WHEN r.status = 'CANCELLED' THEN created + interval '30 minutes' END,
            CASE WHEN r.status = 'CANCELLED' THEN 'Khách đổi kế hoạch' END,
            CASE WHEN r.status = 'CANCELLED' THEN 'CUSTOMER'::cancelled_by_enum END,
            created, created);
  END LOOP;
END $$;

-- tồn và số đã bán của từng suất khớp với đơn
UPDATE offers o SET
  sold_quantity = COALESCE((SELECT sum(quantity) FROM orders x WHERE x.offer_id = o.id AND x.status IN ('PICKED_UP', 'PAID', 'PICKUP_EXPIRED')), 0)
WHERE o.id::text LIKE 'dddddddd-1000%';
UPDATE offers SET total_quantity = sold_quantity + 1 + floor(random() * 4)::int WHERE id::text LIKE 'dddddddd-1000%';
UPDATE offers SET remaining_quantity = total_quantity - sold_quantity,
                  status = CASE WHEN total_quantity - sold_quantity <= 0 THEN 'SOLD_OUT' ELSE 'CLOSED' END::offer_status_enum
WHERE id::text LIKE 'dddddddd-1000%';
UPDATE offers SET remaining_quantity = 5, sold_quantity = 3, total_quantity = 8
WHERE id = '55555555-5555-4555-a555-555555555501';

-- ---------- 4. Số cuối ngày (daily_actuals) cho 30 ngày ----------
INSERT INTO daily_actuals (id, store_id, item_id, date, produced, sold_offline, sold_app, stockout_at, locked_at, created_at, updated_at)
SELECT format('dddddddd-3000-4000-a000-%s', lpad((row_number() OVER ())::text, 12, '0'))::uuid,
       o.store_id, o.item_id, ((o.pickup_start AT TIME ZONE 'Asia/Ho_Chi_Minh')::date), o.total_quantity + floor(random() * 3)::int,
       floor(random() * 3)::int, o.sold_quantity,
       CASE WHEN o.status = 'SOLD_OUT' THEN o.pickup_start + interval '90 minutes' END,
       o.pickup_end + interval '2 hours', o.pickup_end, o.pickup_end
FROM offers o
WHERE o.id::text LIKE 'dddddddd-1000%' AND o.pickup_start > now() - interval '30 days'
  AND NOT EXISTS (SELECT 1 FROM daily_actuals a WHERE a.store_id = o.store_id AND a.item_id = o.item_id AND a.date = ((o.pickup_start AT TIME ZONE 'Asia/Ho_Chi_Minh')::date));

-- ---------- 5. Yêu thích và đồng ý nhận ưu đãi ----------
INSERT INTO favorite_stores (user_id, store_id, created_at)
SELECT format('dddddddd-0000-4000-a000-%s', lpad(i::text, 12, '0'))::uuid, '33333333-3333-4333-a333-333333333301', now() - (i || ' days')::interval * 4
FROM generate_series(1, 14) i;
INSERT INTO consents (user_id, type, version, granted, granted_at, created_at)
SELECT format('dddddddd-0000-4000-a000-%s', lpad(i::text, 12, '0'))::uuid, 'PROMOTION', '1.0', true, now() - interval '20 days', now() - interval '20 days'
FROM generate_series(1, 10) i;

-- ---------- 6. Ưu đãi ----------
INSERT INTO promotions (id, store_id, name, type, value, target, max_uses, used_count, start_at, end_at, min_order_amount, status, created_at, updated_at) VALUES
 ('dddddddd-5000-4000-a000-000000000001', '33333333-3333-4333-a333-333333333301', 'Giảm 20% cho khách thân thiết', 'PERCENT', 20, 'LOYAL', 50, 0, now() - interval '10 days', now() + interval '20 days', 0, 'ACTIVE', now() - interval '10 days', now()),
 ('dddddddd-5000-4000-a000-000000000002', '33333333-3333-4333-a333-333333333301', 'Giảm 5.000đ cuối tuần', 'FIXED', 5000, 'ALL', 100, 0, now() + interval '2 days', now() + interval '30 days', 20000, 'ACTIVE', now(), now()),
 ('dddddddd-5000-4000-a000-000000000003', '33333333-3333-4333-a333-333333333301', 'Tặng khách quay lại (đã tạm dừng)', 'PERCENT', 15, 'AT_RISK', 30, 0, now() - interval '30 days', now() + interval '5 days', 0, 'PAUSED', now() - interval '30 days', now());
-- vài đơn thân thiết gần đây dùng ưu đãi 20%
WITH pick AS (
  SELECT id FROM orders WHERE code LIKE 'DM%' AND status = 'PICKED_UP'
    AND customer_id IN (SELECT format('dddddddd-0000-4000-a000-%s', lpad(i::text, 12, '0'))::uuid FROM generate_series(1, 5) i)
    AND created_at > now() - interval '8 days' ORDER BY created_at DESC LIMIT 4)
UPDATE orders o SET promotion_id = 'dddddddd-5000-4000-a000-000000000001', discount_amount = round(o.total_amount * 0.2),
                    total_amount = o.total_amount - round(o.total_amount * 0.2)
FROM pick WHERE o.id = pick.id;
UPDATE promotions p SET used_count = (SELECT count(*) FROM orders o WHERE o.promotion_id = p.id) WHERE p.id::text LIKE 'dddddddd-5000%';

-- ---------- 7. Đánh giá ----------
INSERT INTO reviews (id, order_id, customer_id, store_id, rating, comment, status, store_reply, store_reply_at, created_at, updated_at)
SELECT format('dddddddd-6000-4000-a000-%s', lpad((rn)::text, 12, '0'))::uuid, id, customer_id, store_id,
  (ARRAY[5, 5, 4, 5, 3, 4, 5, 2, 5, 4, 1, 5, 4, 3])[1 + (rn - 1) % 14],
  (ARRAY['Bánh còn nóng, giá rất hời!', 'Túi bất ngờ đầy đặn, sẽ ủng hộ tiếp.', 'Ngon nhưng chờ lấy hơi lâu.', 'Nhân viên thân thiện, đóng gói gọn.',
         'Bánh hơi khô so với kỳ vọng.', 'Đúng giờ hẹn, chất lượng tốt.', 'Rất đáng tiền cho bữa sáng.', 'Thiếu một món so với mô tả.',
         'Cuối ngày mà vẫn tươi, tuyệt!', 'Sẽ quay lại.', 'Bánh bị nguội và dẹt.', 'Quán dễ thương.', 'Ổn, giá hợp lý.', 'Bình thường.'])[1 + (rn - 1) % 14],
  'VISIBLE'::review_status_enum,
  CASE WHEN rn % 3 = 0 THEN 'Cảm ơn bạn đã ủng hộ Rincón del Pan, hẹn gặp lại bạn nhé!' END,
  CASE WHEN rn % 3 = 0 THEN picked_up_at + interval '1 day' END,
  picked_up_at + interval '3 hours', picked_up_at + interval '3 hours'
FROM (SELECT o.*, row_number() OVER (ORDER BY o.picked_up_at DESC) rn FROM orders o
      WHERE o.code LIKE 'DM%' AND o.status = 'PICKED_UP' AND o.picked_up_at > now() - interval '25 days') t
WHERE rn <= 14;

-- ---------- 8. Khiếu nại ----------
INSERT INTO complaints (id, order_id, customer_id, store_id, category, description, status, response_due_at, extended, refund_amount, reject_reason, auto_accepted, created_at, updated_at)
SELECT format('dddddddd-7000-4000-a000-%s', lpad(rn::text, 12, '0'))::uuid, id, customer_id, store_id,
  (ARRAY['Món không đúng mô tả', 'Chất lượng kém', 'Thiếu món', 'Khác'])[rn],
  (ARRAY['Túi nhận được ít hơn so với mô tả, thiếu một cái bánh.', 'Bánh có mùi lạ khi mở hộp.', 'Hộp thiếu một món so với danh sách.', 'Nhân viên hẹn giờ nhưng khách chờ lâu.'])[rn],
  (ARRAY['PENDING_STORE', 'PENDING_STORE', 'ACCEPTED', 'REJECTED'])[rn]::complaint_status_enum,
  (ARRAY[now() + interval '20 hours', now() + interval '3 hours', now() - interval '2 days', now() - interval '4 days'])[rn],
  false,
  CASE WHEN rn = 3 THEN total_amount ELSE 0 END,
  CASE WHEN rn = 4 THEN 'Đơn đã được nhận đúng giờ và đủ món theo biên bản giao nhận.' END,
  false,
  (ARRAY[now() - interval '4 hours', now() - interval '21 hours', now() - interval '3 days', now() - interval '5 days'])[rn],
  now()
FROM (SELECT o.*, row_number() OVER (ORDER BY o.picked_up_at DESC) rn FROM orders o
      WHERE o.code LIKE 'DM%' AND o.status = 'PICKED_UP' AND o.picked_up_at > now() - interval '20 days'
        AND o.id NOT IN (SELECT order_id FROM reviews WHERE id::text LIKE 'dddddddd-6000%')) t
WHERE rn <= 4;

-- ---------- 9. Chiến dịch thông báo ----------
INSERT INTO campaigns (id, store_id, title, content, target, scheduled_at, status, created_at, updated_at) VALUES
 ('dddddddd-8000-4000-a000-000000000001', '33333333-3333-4333-a333-333333333301', 'Croissant bơ Pháp giảm sâu tối nay', 'Ghé Rincón del Pan sau 19h để nhận croissant còn nóng với giá chỉ bằng một phần ba.', 'ALL', now() - interval '2 days', 'SENT', now() - interval '3 days', now() - interval '2 days'),
 ('dddddddd-8000-4000-a000-000000000002', '33333333-3333-4333-a333-333333333301', 'Tri ân khách thân thiết', 'Cảm ơn bạn đã đồng hành cùng quán, tối nay có ưu đãi riêng cho bạn.', 'LOYAL', now() + interval '1 day', 'SCHEDULED', now(), now());
INSERT INTO campaign_deliveries (id, campaign_id, customer_id, sent_at, opened_at, clicked_at, created_at)
SELECT gen_random_uuid(), 'dddddddd-8000-4000-a000-000000000001', format('dddddddd-0000-4000-a000-%s', lpad(i::text, 12, '0'))::uuid,
       now() - interval '2 days', CASE WHEN i <= 6 THEN now() - interval '2 days' + interval '20 minutes' END,
       CASE WHEN i <= 3 THEN now() - interval '2 days' + interval '25 minutes' END, now() - interval '2 days'
FROM generate_series(1, 10) i;

-- ---------- 10. Thông báo của cửa hàng ----------
INSERT INTO notifications (id, store_id, type, title, body, data, is_read, created_at, updated_at) VALUES
 (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'ORDER', 'Đơn mới DM000290', 'Khách vừa đặt 1 suất Túi Bất Ngờ.', '{"demo": true}', false, now() - interval '20 minutes', now()),
 (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'ORDER', 'Đơn đã nhận', 'Một đơn vừa được xác nhận nhận hàng.', '{"demo": true}', true, now() - interval '2 hours', now()),
 (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'COMPLAINT', 'Khiếu nại mới cần phản hồi', 'Bạn có 2 khiếu nại đang chờ, hạn phản hồi trong 24 giờ.', '{"demo": true}', false, now() - interval '4 hours', now()),
 (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'REVIEW', 'Đánh giá mới 5 sao', 'Khách khen túi bất ngờ đầy đặn.', '{"demo": true}', false, now() - interval '6 hours', now()),
 (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'PRICE_PROPOSAL', 'Đề xuất giảm giá theo giờ', 'Hệ thống đề xuất giảm giá Croissant bơ Pháp lúc 20h.', '{"demo": true}', true, now() - interval '1 day', now()),
 (gen_random_uuid(), '33333333-3333-4333-a333-333333333301', 'SYSTEM', 'Nhắc nhập số cuối ngày', 'Đừng quên nhập số đã làm và đã bán hôm nay.', '{"demo": true}', true, now() - interval '1 day', now());

COMMIT;

-- Kết quả
SELECT 'orders' AS bang, count(*) FROM orders WHERE code LIKE 'DM%'
UNION ALL SELECT 'offers', count(*) FROM offers WHERE id::text LIKE 'dddddddd-%'
UNION ALL SELECT 'khach', count(*) FROM users WHERE email::text LIKE 'demo.kh%'
UNION ALL SELECT 'reviews', count(*) FROM reviews WHERE id::text LIKE 'dddddddd-%'
UNION ALL SELECT 'complaints', count(*) FROM complaints WHERE id::text LIKE 'dddddddd-%'
UNION ALL SELECT 'daily_actuals', count(*) FROM daily_actuals WHERE id::text LIKE 'dddddddd-%';
