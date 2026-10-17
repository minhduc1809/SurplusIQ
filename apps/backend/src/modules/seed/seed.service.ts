import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CryptoUtil } from '../auth/crypto.util';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.seedDemoData();
  }

  async seedDemoData(): Promise<{ success: boolean; message: string; storesCount: number; offersCount: number }> {
    try {
      this.logger.log('Bắt đầu kiểm tra và khởi tạo dữ liệu mẫu (Seed Data) cho SurplusIQ...');

      // 1. Tạo User chủ quán & Khách hàng mẫu với mật khẩu mặc định "123456" chuẩn CryptoUtil OWASP scrypt
      const ownerId = '11111111-1111-1111-1111-111111111111';
      const customerId = '22222222-2222-2222-2222-222222222222';
      const standardPasswordHash = CryptoUtil.hashPassword('123456');

      await this.dataSource.query(
        `INSERT INTO users (id, phone, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, '0909000001', 'owner@rincon.vn', $2, 'STORE_USER', 'ACTIVE', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE';`,
        [ownerId, standardPasswordHash],
      );

      await this.dataSource.query(
        `INSERT INTO users (id, phone, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, '0901234567', 'customer@surplusiq.vn', $2, 'CUSTOMER', 'ACTIVE', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'ACTIVE';`,
        [customerId, standardPasswordHash],
      );

      await this.dataSource.query(
        `INSERT INTO customer_profiles (user_id, full_name, search_radius_km, created_at, updated_at)
         VALUES ($1, 'Trần Minh Đức', 5.0, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;`,
        [customerId],
      );

      // 3. Khởi tạo 6 Cửa hàng tại Quận 1, TP. HCM (Kèm tọa độ PostGIS Point chuẩn 4326)
      const stores = [
        {
          id: '33333333-3333-3333-3333-333333333301',
          name: 'Rincón del Pan - Chi nhánh Pasteur',
          address: '142 Pasteur, Phường Bến Nghé, Quận 1, TP. HCM',
          lng: 106.7001,
          lat: 10.7765,
          phone: '0283822142',
          logoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&auto=format&fit=crop&q=80',
          rating: 4.8,
          count: 142,
        },
        {
          id: '33333333-3333-3333-3333-333333333302',
          name: 'Rincón del Pan - Chi nhánh Bến Nghé',
          address: '18 Valentín Sanz, Bến Nghé, Quận 1, TP. HCM',
          lng: 106.7025,
          lat: 10.7742,
          phone: '0283822143',
          logoUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=160&auto=format&fit=crop&q=80',
          rating: 4.5,
          count: 98,
        },
        {
          id: '33333333-3333-3333-3333-333333333303',
          name: 'La Albahaca - Bếp Món Nhà Làm',
          address: '12 Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP. HCM',
          lng: 106.698,
          lat: 10.789,
          phone: '0283822144',
          logoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80',
          rating: 4.7,
          count: 76,
        },
        {
          id: '33333333-3333-3333-3333-333333333304',
          name: 'Rincón del Pan - Chi nhánh Phố Cổ',
          address: '34 Nguyễn Siêu, Bến Nghé, Quận 1, TP. HCM',
          lng: 106.705,
          lat: 10.778,
          phone: '0283822145',
          logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
          rating: 4.6,
          count: 54,
        },
        {
          id: '33333333-3333-3333-3333-333333333305',
          name: 'GreenFarm • Nông Sản Hữu Cơ',
          address: '88 Nguyễn Du, Bến Nghé, Quận 1, TP. HCM',
          lng: 106.699,
          lat: 10.7795,
          phone: '0283822146',
          logoUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=160&auto=format&fit=crop&q=80',
          rating: 4.9,
          count: 142,
        },
        {
          id: '33333333-3333-3333-3333-333333333306',
          name: 'Tiệm Trà & Cafe Artisan',
          address: '45 Lê Lợi, Bến Nghé, Quận 1, TP. HCM',
          lng: 106.701,
          lat: 10.7735,
          phone: '0283822147',
          logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=160&auto=format&fit=crop&q=80',
          rating: 4.6,
          count: 89,
        },
      ];

      for (const s of stores) {
        await this.dataSource.query(
          `INSERT INTO stores (id, owner_user_id, name, address, location, phone, logo_url, status, rating_avg, rating_count, created_at, updated_at)
           VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8, 'ACTIVE', $9, $10, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             address = EXCLUDED.address,
             location = EXCLUDED.location,
             status = 'ACTIVE';`,
          [s.id, ownerId, s.name, s.address, s.lng, s.lat, s.phone, s.logoUrl, s.rating, s.count],
        );
      }

      // 4. Tạo Items (Món ăn / Túi cứu món)
      const items = [
        {
          id: '44444444-4444-4444-4444-444444444401',
          storeId: stores[0].id,
          name: 'Túi Bất Ngờ • Magic Bag',
          category: 'Baked goods',
          originalPrice: 90000,
          shelfLife: 24,
          allergens: ['Gluten', 'Sữa bò', 'Trứng gà'],
          imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
          description: 'Suất bánh nướng tươi ngon chuẩn phong cách Artisan được đóng gói ngẫu nhiên trước giờ đóng cửa.',
        },
        {
          id: '44444444-4444-4444-4444-444444444402',
          storeId: stores[1].id,
          name: 'Túi Bánh Ngọt & Croissant • Magic Bag',
          category: 'Baked goods',
          originalPrice: 90000,
          shelfLife: 24,
          allergens: ['Gluten', 'Sữa bò', 'Đậu phộng'],
          imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80',
          description: 'Tập hợp bánh nướng giòn rụm trong ngày từ lò bánh thủ công.',
        },
        {
          id: '44444444-4444-4444-4444-444444444403',
          storeId: stores[2].id,
          name: 'Suất Bữa Ăn Nấu Tại Chỗ • Magic Bag',
          category: 'Meals',
          originalPrice: 120000,
          shelfLife: 12,
          allergens: ['Đậu nành', 'Hành tỏi'],
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
          description: 'Món ăn gia đình ấm nóng từ bếp La Albahaca, đóng gói hộp giấy thân thiện môi trường.',
        },
        {
          id: '44444444-4444-4444-4444-444444444404',
          storeId: stores[3].id,
          name: 'Combo Bánh Mì Lúa Mạch • Magic Bag',
          category: 'Baked goods',
          originalPrice: 90000,
          shelfLife: 24,
          allergens: ['Lúa mì nguyên cám', 'Hạt vừng'],
          imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
          description: 'Bánh mì lên men chậm men vi sinh tự nhiên tốt cho sức khỏe.',
        },
        {
          id: '44444444-4444-4444-4444-444444444405',
          storeId: stores[4].id,
          name: 'Túi Rau Củ Quả Hữu Cơ • Magic Bag',
          category: 'Groceries',
          originalPrice: 150000,
          shelfLife: 48,
          allergens: [],
          imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
          description: 'Rau xà lách, cà chua bi, nấm đùi gà chuẩn VietGAP đóng gói trong ngày.',
        },
        {
          id: '44444444-4444-4444-4444-444444444406',
          storeId: stores[5].id,
          name: 'Combo Trà Trái Cây & Mousse • Magic Bag',
          category: 'Other',
          originalPrice: 85000,
          shelfLife: 12,
          allergens: ['Sữa tươi', 'Kem béo'],
          imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
          description: 'Thức uống trà ủ lạnh thảo mộc kết hợp bánh lạnh tráng miệng thơm mát.',
        },
      ];

      for (const item of items) {
        await this.dataSource.query(
          `INSERT INTO items (id, store_id, name, category, original_price, standard_shelf_life_hours, allergens, image_url, description, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE', NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             original_price = EXCLUDED.original_price,
             image_url = EXCLUDED.image_url;`,
          [
            item.id,
            item.storeId,
            item.name,
            item.category,
            item.originalPrice,
            item.shelfLife,
            item.allergens,
            item.imageUrl,
            item.description,
          ],
        );
      }

      // 5. Tạo Offers (Đang mở - OPEN, còn hạn nhận trong 48h tới)
      const offers = [
        {
          id: '55555555-5555-5555-5555-555555555501',
          storeId: stores[0].id,
          itemId: items[0].id,
          kind: 'SURPRISE_BAG',
          totalQuantity: 8,
          remainingQuantity: 3,
          originalPrice: 90000,
          currentPrice: 29900,
          floorPrice: 25000,
        },
        {
          id: '55555555-5555-5555-5555-555555555502',
          storeId: stores[1].id,
          itemId: items[1].id,
          kind: 'SURPRISE_BAG',
          totalQuantity: 10,
          remainingQuantity: 5,
          originalPrice: 90000,
          currentPrice: 29900,
          floorPrice: 25000,
        },
        {
          id: '55555555-5555-5555-5555-555555555503',
          storeId: stores[2].id,
          itemId: items[2].id,
          kind: 'SURPRISE_BAG',
          totalQuantity: 6,
          remainingQuantity: 2,
          originalPrice: 120000,
          currentPrice: 42000,
          floorPrice: 35000,
        },
        {
          id: '55555555-5555-5555-5555-555555555504',
          storeId: stores[3].id,
          itemId: items[3].id,
          kind: 'SURPRISE_BAG',
          totalQuantity: 5,
          remainingQuantity: 2,
          originalPrice: 90000,
          currentPrice: 29900,
          floorPrice: 25000,
        },
        {
          id: '55555555-5555-5555-5555-555555555505',
          storeId: stores[4].id,
          itemId: items[4].id,
          kind: 'SURPRISE_BAG',
          totalQuantity: 12,
          remainingQuantity: 6,
          originalPrice: 150000,
          currentPrice: 50000,
          floorPrice: 40000,
        },
        {
          id: '55555555-5555-5555-5555-555555555506',
          storeId: stores[5].id,
          itemId: items[5].id,
          kind: 'SURPRISE_BAG',
          totalQuantity: 6,
          remainingQuantity: 4,
          originalPrice: 85000,
          currentPrice: 32000,
          floorPrice: 28000,
        },
      ];

      for (const off of offers) {
        await this.dataSource.query(
          `INSERT INTO offers (id, store_id, item_id, kind, total_quantity, remaining_quantity, sold_quantity, original_price, current_price, floor_price, pickup_start, pickup_end, expires_at, status, price_change_count, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, NOW(), NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days', 'OPEN', 0, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             remaining_quantity = EXCLUDED.remaining_quantity,
             current_price = EXCLUDED.current_price,
             pickup_end = NOW() + INTERVAL '2 days',
             status = 'OPEN';`,
          [
            off.id,
            off.storeId,
            off.itemId,
            off.kind,
            off.totalQuantity,
            off.remainingQuantity,
            off.originalPrice,
            off.currentPrice,
            off.floorPrice,
          ],
        );
      }

      this.logger.log(`Seed Data thành công! Đã tạo 6 cửa hàng và 6 ưu đãi cứu món hoạt động thực tế trên PostgreSQL PostGIS.`);
      return {
        success: true,
        message: 'Khởi tạo dữ liệu mẫu thành công với 6 cửa hàng và 6 ưu đãi thực tế.',
        storesCount: stores.length,
        offersCount: offers.length,
      };
    } catch (err: any) {
      this.logger.error(`Lỗi khi seed dữ liệu mẫu: ${err.message}`, err.stack);
      return {
        success: false,
        message: `Lỗi: ${err.message}`,
        storesCount: 0,
        offersCount: 0,
      };
    }
  }
}
