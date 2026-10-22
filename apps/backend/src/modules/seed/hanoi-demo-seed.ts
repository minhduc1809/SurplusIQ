import { DataSource } from 'typeorm';
import { normalizeFoodCategory } from '../catalog/food-category';
import { Logger } from '@nestjs/common';
import {
  UserEntity,
  UserRole,
  UserStatus,
  StoreEntity,
  StoreStatus,
  StoreSettingsEntity,
  PricingMode,
  ItemEntity,
  ItemStatus,
  OfferEntity,
  OfferKind,
  OfferStatus,
  TrustpassInformationSource,
  TrustpassVerificationStatus,
  TrustpassReviewStatus,
  StoreMemberEntity,
  StorePermission,
  StoreMemberStatus,
  SubscriptionEntity,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../../entities';
import { CryptoUtil } from '../auth/crypto.util';

export const HANOI_DEMO_CENTER = {
  address: '122 Hoàng Quốc Việt, Phường Nghĩa Đô, Quận Cầu Giấy, Hà Nội',
  lat: 21.0458,
  lng: 105.795,
};

export interface HanoiStoreSeedDef {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  logoUrl: string;
  ratingAvg: number;
  ratingCount: number;
  item: {
    name: string;
    category: string;
    originalPrice: number;
    currentPrice: number;
    floorPrice: number;
    totalQty: number;
    remainingQty: number;
    shelfLifeHours: number;
    allergens: string[];
    imageUrl: string;
    description: string;
    ingredients: string;
    calories: number;
  };
}

export const HANOI_50_STORES: HanoiStoreSeedDef[] = [
  // -------------------------------------------------------------
  // CỤM 1: BÁN KÍNH SIÊU GẦN (< 1.2 KM) - HOÀNG QUỐC VIỆT, NGHĨA TÂN, TÔ HIỆU
  // -------------------------------------------------------------
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Phở Bò Gia Truyền Cụ Chiêu - Hoàng Quốc Việt',
    address: '106 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
    lat: 21.0462,
    lng: 105.7962,
    phone: '0988123001',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 320,
    item: {
      name: 'Suất Cứu Món • Phở Bò Tái Lăn Hà Nội',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 28000,
      floorPrice: 25000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 6,
      allergens: ['Hành lá', 'Thịt bò'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Phở bò tái lăn chuẩn vị Hà Nội, nước dùng hầm xương tủy thơm lừng, thịt bò xào tỏi mềm ngọt.',
      ingredients: 'Bánh phở tươi, thịt bò bắp, hành tây, gừng tỏi, nước dùng xương bò thảo mộc',
      calories: 520,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Bún Chả Sinh Từ - 136 Hoàng Quốc Việt',
    address: '136 Hoàng Quốc Việt, Phường Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0453,
    lng: 105.7938,
    phone: '0988123002',
    logoUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 285,
    item: {
      name: 'Combo Cứu Món • Bún Chả Nướng Than Hoa',
      category: 'Meals',
      originalPrice: 60000,
      currentPrice: 26000,
      floorPrice: 22000,
      totalQty: 12,
      remainingQty: 6,
      shelfLifeHours: 8,
      allergens: ['Nước mắm', 'Hành tỏi'],
      imageUrl:
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      description:
        'Chả băm và chả miếng nướng than hoa vàng rượm, nước chấm đu đủ cà rốt dầm chua ngọt.',
      ingredients: 'Bún tươi sợi nhỏ, thịt ba chỉ, nạc vai nướng, nước mắm cốt, rau sống thơm',
      calories: 560,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Bánh Mì Chảo Cột Điện Quán - Tô Hiệu',
    address: '105 B9 Tô Hiệu, Phường Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0435,
    lng: 105.7928,
    phone: '0988123003',
    logoUrl:
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 190,
    item: {
      name: 'Suất Cứu Món • Bánh Mì Chảo Đầy Đủ Pate Trứng',
      category: 'Meals',
      originalPrice: 50000,
      currentPrice: 22000,
      floorPrice: 18000,
      totalQty: 8,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Trứng gà', 'Gluten', 'Pate gan'],
      imageUrl:
        'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
      description:
        'Pate gan béo ngậy sốt cà chua tiêu đen, trứng ốp lòng đào, xúc xích và bánh mì giòn rụm.',
      ingredients: 'Pate gan heo, trứng gà, xúc xích, sốt cà chua thảo mộc, bánh mì nướng',
      calories: 610,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    name: 'Bún Đậu Mẹt Làng Mơ - Tô Hiệu',
    address: '110 Tô Hiệu, Phường Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0428,
    lng: 105.7925,
    phone: '0988123004',
    logoUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 240,
    item: {
      name: 'Mẹt Cứu Món • Bún Đậu Chả Cốm Nem Rán',
      category: 'Meals',
      originalPrice: 55000,
      currentPrice: 25000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 6,
      allergens: ['Mắm tôm', 'Đậu nành'],
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      description:
        'Đậu mơ rán giòn ngoài mềm trong, chả cốm Mễ Trì chiên phồng, dồi sụn và mắm tôm Thanh Hóa.',
      ingredients: 'Đậu phụ làng Mơ, bún lá bánh, chả cốm, mắm tôm nguyên chất, quất, ớt tươi',
      calories: 580,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    name: 'Tiệm Chè Chang Hi • Chè Thốt Nốt Tô Hiệu',
    address: '114 Tô Hiệu, Phường Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0422,
    lng: 105.7922,
    phone: '0988123005',
    logoUrl:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 165,
    item: {
      name: 'Combo Cứu Món • 2 Cốc Chè Thốt Nốt Nước Cốt Dừa',
      category: 'Other',
      originalPrice: 70000,
      currentPrice: 28000,
      floorPrice: 25000,
      totalQty: 15,
      remainingQty: 7,
      shelfLifeHours: 12,
      allergens: ['Nước cốt dừa'],
      imageUrl:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
      description: 'Chè thốt nốt giòn sần sật, hạt đác dẻo thơm quyện cùng nước cốt dừa béo ngậy.',
      ingredients:
        'Thịt thốt nốt An Giang, hạt đác rim đường phèn, nước cốt dừa tươi, thạch củ năng',
      calories: 340,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    name: 'Cơm Niêu Singapore Kombo - Hoàng Quốc Việt',
    address: '138 Hoàng Quốc Việt, Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.045,
    lng: 105.7932,
    phone: '0988123006',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 210,
    item: {
      name: 'Suất Cứu Món • Cơm Niêu Bò Sốt Tiêu Đen Cháy Giòn',
      category: 'Meals',
      originalPrice: 85000,
      currentPrice: 38000,
      floorPrice: 32000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 8,
      allergens: ['Đậu nành', 'Tiêu'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Lớp cơm cháy vàng giòn đáy niêu, thịt bò ướp sốt tiêu đen đậm đà sốt xèo xèo hấp dẫn.',
      ingredients: 'Gạo thơm ST25, thịt bò phi lê, nấm đông cô, sốt tiêu đen Singapore',
      calories: 650,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    name: 'Nem Nướng Nha Trang Cô Lê - Hoàng Quốc Việt',
    address: '89 Hoàng Quốc Việt, Nghĩa Đô, Cầu Giấy, Hà Nội',
    lat: 21.0468,
    lng: 105.7975,
    phone: '0988123007',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.6,
    ratingCount: 140,
    item: {
      name: 'Suất Cứu Món • Nem Nướng Cuốn Bánh Tráng Nước Chấm Tép',
      category: 'Meals',
      originalPrice: 45000,
      currentPrice: 20000,
      floorPrice: 16000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 10,
      allergens: ['Đậu phộng', 'Tép biển'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Nem nướng que thơm lừng, ram chiên giòn tan, xoài xanh, dưa chuột và sốt tương nếp gan heo.',
      ingredients: 'Thịt heo xay ướp mật mía, bánh tráng phơi sương, ram giòn, sốt tương đậu phộng',
      calories: 490,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000008',
    name: 'Bánh Cuốn Nóng Bà Hanh - Tô Hiệu',
    address: '21 Tô Hiệu, Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0442,
    lng: 105.7935,
    phone: '0988123008',
    logoUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 175,
    item: {
      name: 'Suất Cứu Món • Bánh Cuốn Tráng Tay Chả Quế Hà Nội',
      category: 'Meals',
      originalPrice: 40000,
      currentPrice: 18000,
      floorPrice: 15000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 6,
      allergens: ['Thịt heo', 'Mộc nhĩ'],
      imageUrl:
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      description:
        'Vỏ bánh tráng mỏng tang mềm mướt nhân thịt nạc băm mộc nhĩ nấm hương, rắc hành phi thơm nức.',
      ingredients: 'Bột gạo tẻ lên men tự nhiên, thịt băm, mộc nhĩ, chả quế Ước Lễ, hành phi giòn',
      calories: 420,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000009',
    name: 'Phở Cuốn Hương Mai - Nghĩa Tân',
    address: '25 Tô Hiệu, Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0438,
    lng: 105.793,
    phone: '0988123009',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 310,
    item: {
      name: 'Hộp Cứu Món • 10 Cuốn Phở Bò Tươi Hương Mai',
      category: 'Meals',
      originalPrice: 75000,
      currentPrice: 32000,
      floorPrice: 28000,
      totalQty: 12,
      remainingQty: 5,
      shelfLifeHours: 6,
      allergens: ['Thịt bò'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Bánh phở vuông cuốn thịt bò xào lăn chín tới cùng xà lách, rau mùi chấm nước mắm tỏi ớt chua ngọt.',
      ingredients: 'Bánh phở cuốn mỏng, thịt bò thăn, rau kinh giới, xà lách, nước mắm tỏi ớt',
      calories: 480,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000010',
    name: 'Nông Sản Sạch Bác Tôm - Hoàng Quốc Việt',
    address: '180 Hoàng Quốc Việt, Cổ Nhuế, Cầu Giấy, Hà Nội',
    lat: 21.0445,
    lng: 105.791,
    phone: '0988123010',
    logoUrl:
      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 410,
    item: {
      name: 'Túi Cứu Món • Rau Củ Hữu Cơ & Trái Cây Miền Tây',
      category: 'Groceries',
      originalPrice: 120000,
      currentPrice: 45000,
      floorPrice: 40000,
      totalQty: 15,
      remainingQty: 8,
      shelfLifeHours: 36,
      allergens: [],
      imageUrl:
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
      description:
        'Gói rau củ sạch thu hoạch trong ngày: cải ngọt, mồng tơi, cà chua bi chùm, cam sành mọng nước.',
      ingredients: 'Rau xanh chuẩn VietGAP, quả tươi hữu cơ thu hoạch trong ngày',
      calories: 180,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000011',
    name: 'Tiệm Trà & Cafe Phố - 122 Hoàng Quốc Việt',
    address: '122 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội',
    lat: 21.0458,
    lng: 105.795,
    phone: '0988123011',
    logoUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 150,
    item: {
      name: 'Combo Cứu Món • Cafe Muối & Croissant Nướng Sữa',
      category: 'Baked goods',
      originalPrice: 65000,
      currentPrice: 25000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 12,
      allergens: ['Gluten', 'Sữa tươi'],
      imageUrl:
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      description:
        'Cà phê phin ủ lạnh lớp kem muối biển mịn màng cùng bánh sừng bò nướng bơ Pháp giòn thơm.',
      ingredients: 'Hạt cà phê Robusta Đắk Lắk, kem béo muối hồng, bánh mì sừng bò bơ Pháp',
      calories: 380,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000012',
    name: 'Bánh Mì Dân Tổ Hà Nội - Hoàng Quốc Việt',
    address: '210 Hoàng Quốc Việt, Cổ Nhuế, Cầu Giấy, Hà Nội',
    lat: 21.044,
    lng: 105.7895,
    phone: '0988123012',
    logoUrl:
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 220,
    item: {
      name: 'Suất Cứu Món • Bánh Mì Nhân Xào Thập Cẩm Dân Tổ',
      category: 'Meals',
      originalPrice: 35000,
      currentPrice: 16000,
      floorPrice: 14000,
      totalQty: 14,
      remainingQty: 6,
      shelfLifeHours: 8,
      allergens: ['Pate', 'Trứng', 'Gluten'],
      imageUrl:
        'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
      description:
        'Nhân pate, trứng, bơ, chả lụa xào quyện sền sệt đậm đà nhồi ngập trong ổ bánh mì nóng giòn.',
      ingredients: 'Bánh mì giòn, nhân xào pate gan, trứng vịt, chả lụa, bơ thực vật',
      calories: 520,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000013',
    name: 'Xôi Xéo & Xôi Khúc Cô Mây - Chợ Nghĩa Tân',
    address: 'Ki-ốt 12 Chợ Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.043,
    lng: 105.7915,
    phone: '0988123013',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 380,
    item: {
      name: 'Gói Cứu Món • Xôi Xéo Mỡ Hành Ruốc Thịt Thơm Nức',
      category: 'Meals',
      originalPrice: 35000,
      currentPrice: 15000,
      floorPrice: 12000,
      totalQty: 12,
      remainingQty: 5,
      shelfLifeHours: 10,
      allergens: ['Hành phi'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Xôi nếp cái hoa vàng dẻo quánh vàng ươm nghệ tươi, đỗ xanh thái mỏng, rưới mỡ gà hành phi thơm lừng.',
      ingredients:
        'Gạo nếp cái hoa vàng, đỗ xanh đồ nhuyễn, mỡ gà ta, hành phi tự làm, ruốc thịt heo',
      calories: 590,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000014',
    name: 'Lẩu Ếch Măng Cay Tiến Béo - Trần Cung',
    address: '32 Trần Cung, Phường Nghĩa Tân, Cầu Giấy, Hà Nội',
    lat: 21.0475,
    lng: 105.792,
    phone: '0988123014',
    logoUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.6,
    ratingCount: 160,
    item: {
      name: 'Suất Cứu Món • Ếch Xào Măng Cay Giòn Kèm Bún',
      category: 'Meals',
      originalPrice: 90000,
      currentPrice: 39000,
      floorPrice: 35000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 8,
      allergens: ['Măng chua', 'Hành tỏi'],
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      description:
        'Đùi ếch đồng chiên giòn sốt cùng măng củ cay nồng đậm đà, ăn kèm bún tươi và lá lốt thơm bùi.',
      ingredients: 'Thịt ếch đồng tươi, măng củ ngâm ớt, lá lốt, tía tô, bún tươi',
      calories: 460,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000015',
    name: 'Bún Ốc Sườn Cô Sáu - Phùng Chí Kiên',
    address: '45 Phùng Chí Kiên, Nghĩa Đô, Cầu Giấy, Hà Nội',
    lat: 21.0425,
    lng: 105.7978,
    phone: '0988123015',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 205,
    item: {
      name: 'Suất Cứu Món • Bún Ốc Nhồi Sườn Sụn Giấm Bỗng',
      category: 'Meals',
      originalPrice: 55000,
      currentPrice: 24000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 6,
      allergens: ['Ốc nhồi', 'Giấm bỗng nếp'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Ốc nhồi giòn sần sật, sườn sụn non ninh mềm, nước dùng chua thanh thanh mùi giấm bỗng gia truyền.',
      ingredients: 'Ốc nhồi đồng, sườn sụn heo, cà chua, giấm bỗng nếp cái hoa vàng, tía tô',
      calories: 480,
    },
  },

  // -------------------------------------------------------------
  // CỤM 2: BÁN KÍNH GẦN (1.2 KM - 3.0 KM) - XUÂN THỦY, CẦU GIẤY, DUY TÂN
  // -------------------------------------------------------------
  {
    id: 'a1000000-0000-4000-8000-000000000016',
    name: 'Phở Thìn Lò Đúc - Nguyễn Khánh Toàn',
    address: '12 Nguyễn Khánh Toàn, Quan Hoa, Cầu Giấy, Hà Nội',
    lat: 21.0405,
    lng: 105.801,
    phone: '0988123016',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 420,
    item: {
      name: 'Suất Cứu Món • Phở Bò Tái Lăn Đẫm Hành Lá Thìn',
      category: 'Meals',
      originalPrice: 70000,
      currentPrice: 30000,
      floorPrice: 26000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 6,
      allergens: ['Thịt bò'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Đặc sản phở Thìn với thịt bò xào lửa lớn đẫm hành lá hoa, nước dùng béo ngọt đậm sâu.',
      ingredients: 'Thịt bò bắp, hành lá thái hoa, bánh phở tươi, tiêu đen, gừng tươi',
      calories: 550,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000017',
    name: 'Bún Bò Huế O Xuân - Nguyễn Khánh Toàn',
    address: '28 Nguyễn Khánh Toàn, Dịch Vọng, Cầu Giấy, Hà Nội',
    lat: 21.0395,
    lng: 105.7995,
    phone: '0988123017',
    logoUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 310,
    item: {
      name: 'Suất Cứu Món • Bún Bò Huế Chả Cua Móng Giò',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 28000,
      floorPrice: 24000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 8,
      allergens: ['Mắm ruốc Huế', 'Chả cua'],
      imageUrl:
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      description:
        'Nước dùng ngậy thơm mùi sả và mắm ruốc cố đô, thịt nạm bò hoa, chả cua quết tay thơm nức.',
      ingredients: 'Bún sợi to, nạm bò hoa, chả cua Huế, sả cây, ớt sa tế, mắm ruốc',
      calories: 580,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000018',
    name: 'Cơm Tấm Sà Bì Chưởng - Xuân Thủy',
    address: '86 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    lat: 21.0375,
    lng: 105.789,
    phone: '0988123018',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 520,
    item: {
      name: 'Suất Cứu Món • Cơm Tấm Sườn Nướng Mỡ Hành Chả Trứng',
      category: 'Meals',
      originalPrice: 68000,
      currentPrice: 29000,
      floorPrice: 25000,
      totalQty: 12,
      remainingQty: 5,
      shelfLifeHours: 8,
      allergens: ['Trứng', 'Đậu nành'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Sườn cốt lết ướp mật ong nướng than hoa mềm mọng, chả trứng hấp béo ngậy và mỡ hành tóp mỡ giòn.',
      ingredients: 'Gạo tấm thơm, sườn cốt lết nướng, chả trứng thịt, mỡ hành, đồ chua cà rốt',
      calories: 690,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000019',
    name: 'Bánh Xèo Nem Lụi Sáu Tước - Dịch Vọng Hậu',
    address: '30 Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    lat: 21.036,
    lng: 105.788,
    phone: '0988123019',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.6,
    ratingCount: 180,
    item: {
      name: 'Combo Cứu Món • 2 Bánh Xèo Giòn Rụm & 4 Nem Lụi',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 27000,
      floorPrice: 23000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Tôm tép', 'Đậu phộng'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Vỏ bánh xèo giòn rụm màu nghệ nhân tôm thịt giá đỗ, cuốn bánh tráng rau rừng chấm sốt bơ đậu phộng.',
      ingredients: 'Bột gạo nước cốt dừa, tôm sú, thịt ba chỉ, nem lụi nướng sả, nước lèo đậu gan',
      calories: 570,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000020',
    name: 'Bún Thang Phố Cổ - Nguyễn Văn Huyên',
    address: '18 Nguyễn Văn Huyên, Quan Hoa, Cầu Giấy, Hà Nội',
    lat: 21.041,
    lng: 105.7985,
    phone: '0988123020',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 260,
    item: {
      name: 'Suất Cứu Món • Bún Thang Hà Nội Tinh Hoa Phố Cổ',
      category: 'Meals',
      originalPrice: 60000,
      currentPrice: 26000,
      floorPrice: 22000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 6,
      allergens: ['Trứng', 'Tôm khô', 'Mắm tôm'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Bát bún thang cầu kỳ như bức tranh đa sắc: gà xé nhỏ, giò lụa chỉ, trứng tráng mỏng, củ cải dầm và chút tinh dầu cà cuống.',
      ingredients:
        'Thịt gà ta thả vườn, giò lụa, trứng tráng chỉ, tôm nõn giã bông, rau răm, nước dùng xương gà tôm he',
      calories: 490,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000021',
    name: 'Bếp Cơm Gà Hội An - Duy Tân',
    address: '55 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    lat: 21.0335,
    lng: 105.7865,
    phone: '0988123021',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 290,
    item: {
      name: 'Suất Cứu Món • Cơm Gà Xé Phay Trộn Rau Răm Nghệ Vàng',
      category: 'Meals',
      originalPrice: 58000,
      currentPrice: 25000,
      floorPrice: 20000,
      totalQty: 14,
      remainingQty: 6,
      shelfLifeHours: 8,
      allergens: ['Thịt gà'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Cơm nấu nước luộc gà thơm dẻo hạt vàng ươm, thịt gà ta xé phay bóp chua ngọt cùng hành tây tiêu rừng.',
      ingredients:
        'Gạo tấm nấu nước cốt gà, thịt gà mái dầu, hành tây ngâm giấm, rau răm, ớt rim Hội An',
      calories: 540,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000022',
    name: 'Mì Quảng Bà Mua - Trần Thái Tông',
    address: '42 Trần Thái Tông, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    lat: 21.0348,
    lng: 105.7895,
    phone: '0988123022',
    logoUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 220,
    item: {
      name: 'Suất Cứu Món • Mì Quảng Tôm Thịt Trứng Cút Bánh Đa Mè',
      category: 'Meals',
      originalPrice: 55000,
      currentPrice: 24000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Đậu phộng', 'Tôm'],
      imageUrl:
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      description:
        'Sợi mì gạo bản to mềm mượt, tôm thịt rim đậm đà chan nước nhưn xâm xấp, bẻ vụn bánh tráng mè giòn rụm.',
      ingredients:
        'Mì gạo bột nghệ, tôm đất, thịt nạc dăm, trứng cút, bánh tráng nướng mè đen, lạc rang',
      calories: 520,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000023',
    name: 'Vịt Cỏ Vân Đình Chú Béo - Quan Hoa',
    address: '68 Quan Hoa, Cầu Giấy, Hà Nội',
    lat: 21.0385,
    lng: 105.8035,
    phone: '0988123023',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 195,
    item: {
      name: 'Suất Cứu Món • Nửa Con Vịt Nướng Than Mật Ong & Canh Măng',
      category: 'Meals',
      originalPrice: 110000,
      currentPrice: 48000,
      floorPrice: 42000,
      totalQty: 6,
      remainingQty: 3,
      shelfLifeHours: 8,
      allergens: ['Thịt gia cầm'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Vịt cỏ Vân Đình thịt nạc mềm ngọt da mỏng giòn thơm mùi mật ong rừng và lá móc mật, kèm măng ớt.',
      ingredients: 'Vịt cỏ thả đồng, lá móc mật tươi, mật ong, nước sốt tỏi ớt, măng củ hầm',
      calories: 630,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000024',
    name: 'Cháo Sườn Sụn Cô Là - Cầu Giấy',
    address: '15 Đường Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội',
    lat: 21.035,
    lng: 105.802,
    phone: '0988123024',
    logoUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 340,
    item: {
      name: 'Bát Cứu Món • Cháo Sườn Bột Xay Quẩy Giòn Ruốc Thịt',
      category: 'Meals',
      originalPrice: 35000,
      currentPrice: 15000,
      floorPrice: 12000,
      totalQty: 15,
      remainingQty: 7,
      shelfLifeHours: 8,
      allergens: ['Gluten quẩy'],
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      description:
        'Cháo bột gạo xay mịn màng sánh quánh nấu nước hầm sườn heo ngọt lịm, rắc quẩy giòn và ruốc nấm thịt.',
      ingredients:
        'Bột gạo tẻ xay nước, sườn non heo, quẩy rán giòn, ruốc thịt heo sao vàng, tiêu sọ',
      calories: 410,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000025',
    name: 'Bánh Mì Kẹp Thịt Nướng Bà Dần - Xuân Thủy',
    address: '48 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    lat: 21.037,
    lng: 105.7875,
    phone: '0988123025',
    logoUrl:
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 460,
    item: {
      name: 'Combo Cứu Món • 2 Bánh Mì Thịt Nướng Bơ Tỏi Sốt Cay',
      category: 'Meals',
      originalPrice: 50000,
      currentPrice: 22000,
      floorPrice: 18000,
      totalQty: 14,
      remainingQty: 6,
      shelfLifeHours: 10,
      allergens: ['Gluten', 'Pate'],
      imageUrl:
        'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
      description:
        'Thịt xiên nướng than hoa sả ớt mềm đậm vị nhồi vào bánh mì giòn tan cùng nộm đu đủ mát giòn.',
      ingredients:
        'Bánh mì đặc ruột, thịt nạc vai ướp ngũ vị nướng than, sốt ớt rim cay ngọt, ngò rí',
      calories: 550,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000026',
    name: 'Trà Sữa Đô Đô • Mochi Kéo Dài - Cầu Giấy',
    address: '35 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội',
    lat: 21.0345,
    lng: 105.8015,
    phone: '0988123026',
    logoUrl:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 180,
    item: {
      name: 'Combo Cứu Món • 2 Ly Trà Sữa Mochi Nướng Trân Châu Đen',
      category: 'Other',
      originalPrice: 70000,
      currentPrice: 28000,
      floorPrice: 25000,
      totalQty: 12,
      remainingQty: 5,
      shelfLifeHours: 12,
      allergens: ['Sữa bò tươi'],
      imageUrl:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
      description:
        'Trà sữa ô long đậm vị trà kết hợp mochi gạo nếp dẻo kéo sợi béo ngậy và trân châu đường đen.',
      ingredients:
        'Trà ô long thượng hạng, sữa tươi tiệt trùng, mochi nếp dẻo, trân châu sắn caramen',
      calories: 360,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000027',
    name: 'Cà Phê Trứng Hà Nội - Nguyễn Văn Huyên',
    address: '10 Nguyễn Văn Huyên, Dịch Vọng, Cầu Giấy, Hà Nội',
    lat: 21.042,
    lng: 105.797,
    phone: '0988123027',
    logoUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 270,
    item: {
      name: 'Combo Cứu Món • Cà Phê Trứng Béo Ngậy & Bánh Bông Lan Trứng Muối',
      category: 'Baked goods',
      originalPrice: 65000,
      currentPrice: 26000,
      floorPrice: 22000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 12,
      allergens: ['Trứng gà', 'Sữa đặc', 'Gluten'],
      imageUrl:
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
      description:
        'Lớp kem trứng đánh bông mịn như bọt tuyết bồng bềnh trên tách cà phê phin nguyên chất nóng ấm.',
      ingredients:
        'Cà phê Robusta mộc, lòng đỏ trứng gà tươi, sữa đặc Ông Thọ, bột ca cao nguyên chất',
      calories: 390,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000028',
    name: 'Bánh Giò Nóng Cô Béo - Vườn Hoa Nghĩa Đô',
    address: '15 Nguyễn Khánh Toàn (cạnh Vườn Hoa Nghĩa Đô), Cầu Giấy, Hà Nội',
    lat: 21.0435,
    lng: 105.796,
    phone: '0988123028',
    logoUrl:
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 230,
    item: {
      name: 'Suất Cứu Món • Bánh Giò Nóng Đầy Đủ Giò Tai Nem Chua',
      category: 'Meals',
      originalPrice: 40000,
      currentPrice: 17000,
      floorPrice: 14000,
      totalQty: 12,
      remainingQty: 6,
      shelfLifeHours: 8,
      allergens: ['Mộc nhĩ', 'Thịt heo'],
      imageUrl:
        'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
      description:
        'Bột bánh giò mịn màng núng nính thơm mùi lá chuối, ngập nhân thịt nạc mộc nhĩ hạt tiêu thơm nức mũi.',
      ingredients:
        'Bột gạo tẻ pha bột năng, mộc nhĩ nấm hương, giò tai lụa, nem chua rán, sốt ớt tương',
      calories: 430,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000029',
    name: 'Quán Ăn Chay Thiền Tâm - Khúc Thừa Dụ',
    address: '15 Khúc Thừa Dụ, Dịch Vọng, Cầu Giấy, Hà Nội',
    lat: 21.0355,
    lng: 105.793,
    phone: '0988123029',
    logoUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 310,
    item: {
      name: 'Suất Cứu Món • Cơm Chay Thập Cẩm Sen Vàng & Nấm Kho Tiêu',
      category: 'Meals',
      originalPrice: 50000,
      currentPrice: 22000,
      floorPrice: 18000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 8,
      allergens: ['Đậu nành', 'Hạt sen'],
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      description:
        'Món chay thanh tịnh từ nấm đùi gà kho tiêu, đậu hũ sốt cà chua nấm đông cô, hạt sen bùi béo bổ dưỡng.',
      ingredients: 'Gạo lứt dẻo, hạt sen Huế, nấm đùi gà, đậu phụ non, rau củ hấp ngũ sắc',
      calories: 410,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000030',
    name: 'Trái Cây & Nước Ép Fresh Farm - Duy Tân',
    address: '24 Duy Tân, Cầu Giấy, Hà Nội',
    lat: 21.0325,
    lng: 105.7845,
    phone: '0988123030',
    logoUrl:
      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 140,
    item: {
      name: 'Combo Cứu Món • 2 Chai Nước Ép Cam Cà Rốt Ép Chậm Nguyên Chất',
      category: 'Other',
      originalPrice: 60000,
      currentPrice: 24000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 24,
      allergens: [],
      imageUrl:
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
      description:
        'Nước ép trái cây tươi không thêm đường, giữ trọn vẹn vitamin C tăng sức đề kháng tự nhiên.',
      ingredients: 'Cam sành Hàm Yên, cà rốt Đà Lạt hữu cơ ép lạnh nguyên chất',
      calories: 140,
    },
  },

  // -------------------------------------------------------------
  // CỤM 3: BÁN KÍNH TRUNG BÌNH (3.0 KM - 6.0 KM) - TÂY HỒ, BA ĐÌNH, MỸ ĐÌNH
  // -------------------------------------------------------------
  {
    id: 'a1000000-0000-4000-8000-000000000031',
    name: 'Bánh Tôm Hồ Tây Truyền Thống - Trích Sài',
    address: '1 Đường Thanh Niên (Góc Trích Sài), Tây Hồ, Hà Nội',
    lat: 21.052,
    lng: 105.815,
    phone: '0988123031',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 380,
    item: {
      name: 'Đĩa Cứu Món • 6 Chiếc Bánh Tôm Hồ Tây Giòn Rụm',
      category: 'Meals',
      originalPrice: 80000,
      currentPrice: 35000,
      floorPrice: 30000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 8,
      allergens: ['Tôm nước ngọt', 'Gluten'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Tôm đồng đỏ au nằm trên bánh khoai bột vàng ruộm thơm giòn, chấm nước mắm tỏi ớt chua ngọt.',
      ingredients:
        'Tôm càng đồng, khoai lang ngọt sợi, bột mì bột năng chiên giòn, nước mắm dưa góp',
      calories: 520,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000032',
    name: 'Bún Riêu Cua Bắp Bò - Lạc Long Quân',
    address: '18 Lạc Long Quân, Nghĩa Đô, Tây Hồ, Hà Nội',
    lat: 21.0515,
    lng: 105.805,
    phone: '0988123032',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 295,
    item: {
      name: 'Suất Cứu Món • Bún Riêu Cua Đồng Bắp Bò Giò Tai',
      category: 'Meals',
      originalPrice: 55000,
      currentPrice: 24000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 6,
      allergens: ['Cua đồng', 'Hành phi'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Gạch cua đồng giã tay đóng tảng dày, nước riêu chua thanh thanh vị giấm bỗng nếp và cà chua đỏ au.',
      ingredients: 'Cua đồng tươi giã tay, bắp bò hoa, đậu rán, giò tai giòn, giấm bỗng gạo',
      calories: 510,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000033',
    name: 'Cơm Gà Xối Mỡ 142 - Trung Kính',
    address: '12 Trung Kính, Yên Hòa, Cầu Giấy, Hà Nội',
    lat: 21.026,
    lng: 105.795,
    phone: '0988123033',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 360,
    item: {
      name: 'Suất Cứu Món • Cơm Đỏ Gà Xối Mỡ Đùi Góc Tư Giòn Da',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 28000,
      floorPrice: 24000,
      totalQty: 12,
      remainingQty: 5,
      shelfLifeHours: 8,
      allergens: ['Thịt gà'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Đùi gà góc tư chiên xối mỡ nóng hổi lớp da vàng giòn rụm bên trong mọng nước, hạt cơm đỏ thơm bùi.',
      ingredients:
        'Đùi gà góc tư tươi, cơm đảo cà chua, dưa leo ngâm giấm, nước sốt tỏi ớt đặc trưng',
      calories: 720,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000034',
    name: 'Bún Chả Hương Liên - Đội Cấn',
    address: '24 Đội Cấn, Liễu Giai, Ba Đình, Hà Nội',
    lat: 21.036,
    lng: 105.817,
    phone: '0988123034',
    logoUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 450,
    item: {
      name: 'Suất Cứu Món • Bún Chả Đặc Biệt Kèm Nem Cua Bể',
      category: 'Meals',
      originalPrice: 70000,
      currentPrice: 30000,
      floorPrice: 26000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Hải sản cua', 'Nước mắm'],
      imageUrl:
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      description:
        'Chả thịt nướng than hoa thơm lừng kết hợp nem cua bể giòn rụm đậm đà phong vị bún chả tổng thống.',
      ingredients: 'Thịt ba rọi heo nướng, nem cua bể Hải Phòng, bún sợi nhỏ, đu đủ cà rốt dầm',
      calories: 630,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000035',
    name: 'Phở Bò Nam Định Khôi Hói - Kim Mã',
    address: '60 Kim Mã, Ba Đình, Hà Nội',
    lat: 21.0315,
    lng: 105.819,
    phone: '0988123035',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 280,
    item: {
      name: 'Suất Cứu Món • Phở Bò Bắp Gầu Giòn Nước Trong',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 28000,
      floorPrice: 24000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 6,
      allergens: ['Thịt bò'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Nước phở bò trong veo ngọt thanh hầm kỹ 18 tiếng, gầu giòn sần sật ngậy thơm béo ngậy.',
      ingredients: 'Thịt gầu bò, bắp bò hoa, bánh phở thái tay, nước hầm xương ống nguyên chất',
      calories: 540,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000036',
    name: 'Lẩu Gà Lá É Tao Ngộ - Vũ Phạm Hàm',
    address: '78 Vũ Phạm Hàm, Yên Hòa, Cầu Giấy, Hà Nội',
    lat: 21.021,
    lng: 105.799,
    phone: '0988123036',
    logoUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 240,
    item: {
      name: 'Suất Cứu Món • Thịt Gà Nấu Lá É Cay Nồng Kèm Măng Bún',
      category: 'Meals',
      originalPrice: 85000,
      currentPrice: 38000,
      floorPrice: 32000,
      totalQty: 8,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Lá é cay', 'Măng le'],
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
      description:
        'Thịt gà đồi dai giòn thơm thoang thoảng mùi lá é Tây Nguyên the the ấm nồng đặc sắc.',
      ingredients: 'Thịt gà đồi, lá é tươi, măng le rừng, ớt xiêm xanh giã nhuyễn, bún tươi',
      calories: 510,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000037',
    name: 'Ốc Nóng Hà Thành - Đào Tấn',
    address: '26 Đào Tấn, Cống Vị, Ba Đình, Hà Nội',
    lat: 21.034,
    lng: 105.811,
    phone: '0988123037',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 220,
    item: {
      name: 'Bát Cứu Món • Ốc Mít Luộc Lá Chanh Sả Nóng Hổi',
      category: 'Meals',
      originalPrice: 60000,
      currentPrice: 25000,
      floorPrice: 22000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 6,
      allergens: ['Ốc mít'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Ốc mít béo múp luộc sả lá chanh giòn ngọt chấm nước mắm gừng tỏi ớt lá chanh chuẩn vị xưa.',
      ingredients: 'Ốc mít tươi chọn lọc, sả cây, lá chanh ta, gừng già, nước mắm chấm bí truyền',
      calories: 280,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000038',
    name: 'Bánh Bèo Nậm Lọc Cố Đô - Lê Văn Lương',
    address: '15 Lê Văn Lương, Trung Hòa, Cầu Giấy, Hà Nội',
    lat: 21.01,
    lng: 105.803,
    phone: '0988123038',
    logoUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 190,
    item: {
      name: 'Khay Cứu Món • Thập Cẩm Bánh Bèo Chén Bánh Bột Lọc Tôm Nhảy',
      category: 'Meals',
      originalPrice: 55000,
      currentPrice: 23000,
      floorPrice: 19000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 8,
      allergens: ['Tôm biển', 'Hành phi'],
      imageUrl:
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
      description:
        'Bánh bèo chén rắc tôm chấy da heo chiên giòn rụm cùng bánh bột lọc nhân tôm thịt trong veo dẻo thơm.',
      ingredients: 'Bột gạo lọc, tôm sông rim, mỡ hành, tóp mỡ chiên giòn, nước mắm ruốc loãng',
      calories: 430,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000039',
    name: 'Chè Thái Sầu Riêng Bà Liên - Giảng Võ',
    address: '82 Giảng Võ, Đống Đa, Hà Nội',
    lat: 21.028,
    lng: 105.823,
    phone: '0988123039',
    logoUrl:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 380,
    item: {
      name: 'Combo Cứu Món • 2 Bát Chè Thái Sầu Riêng Đẫm Topping',
      category: 'Other',
      originalPrice: 70000,
      currentPrice: 28000,
      floorPrice: 25000,
      totalQty: 12,
      remainingQty: 6,
      shelfLifeHours: 12,
      allergens: ['Sầu riêng', 'Sữa tươi'],
      imageUrl:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
      description:
        'Thịt sầu riêng Ri6 thơm béo ngậy tan chảy, thạch hạt lựu, mít ngọt giòn trong nước cốt dừa mát lịm.',
      ingredients: 'Sầu riêng tươi Ri6, mít Thái xắt sợi, thạch ngọc trai, nước cốt dừa Bến Tre',
      calories: 420,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000040',
    name: 'Bánh Đa Cua Hải Phòng An Dương - Võ Chí Công',
    address: '12 Võ Chí Công, Nghĩa Đô, Tây Hồ, Hà Nội',
    lat: 21.0505,
    lng: 105.8015,
    phone: '0988123040',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 230,
    item: {
      name: 'Bát Cứu Món • Bánh Đa Cua Nâu Chả Lá Lốt Chả Cá Thu',
      category: 'Meals',
      originalPrice: 55000,
      currentPrice: 24000,
      floorPrice: 20000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 6,
      allergens: ['Cua bể', 'Cá thu'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Sợi bánh đa đỏ dẻo dai đất Cảng, gạch cua bể béo ngậy, chả lá lốt thơm lừng ăn kèm rau muống giòn.',
      ingredients:
        'Bánh đa đỏ Hải Phòng, cua đồng cua bể, chả lá lốt nướng, rau muống chẻ, hành phi',
      calories: 510,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000041',
    name: 'Bún Mọc Chân Gà Rút Xương - Đội Cấn',
    address: '33 Đội Cấn, Ba Đình, Hà Nội',
    lat: 21.0355,
    lng: 105.816,
    phone: '0988123041',
    logoUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 160,
    item: {
      name: 'Suất Cứu Món • Bún Mọc Nấm Hương Chân Gà Giòn Rụm',
      category: 'Meals',
      originalPrice: 50000,
      currentPrice: 22000,
      floorPrice: 18000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 6,
      allergens: ['Nấm hương'],
      imageUrl:
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      description:
        'Viên mọc nạc heo giã tay quết nấm hương mộc nhĩ ngọt bùi, chân gà rút xương giòn sần sật.',
      ingredients:
        'Bún tươi, mọc nấm hương thịt heo, chân gà rút xương ngâm giấm, nước dùng xương hầm',
      calories: 460,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000042',
    name: 'Cơm Lam Gà Nướng Tây Bắc - Lê Đức Thọ',
    address: '88 Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
    lat: 21.027,
    lng: 105.772,
    phone: '0988123042',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 210,
    item: {
      name: 'Combo Cứu Món • Ống Cơm Lam Nướng Nứa & Đùi Gà Nướng Mắc Khén',
      category: 'Meals',
      originalPrice: 75000,
      currentPrice: 32000,
      floorPrice: 28000,
      totalQty: 8,
      remainingQty: 4,
      shelfLifeHours: 10,
      allergens: ['Hạt mắc khén'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Gạo nếp nương nướng trong ống nứa dẻo thơm ngạt ngào mùi khói bếp, gà đồi tẩm mắc khén hạt dổi nướng than.',
      ingredients:
        'Gạo nếp nương Điện Biên, đùi gà tre, hạt mắc khén, hạt dổi rừng, muối chẩm chéo',
      calories: 610,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000043',
    name: 'Sói Biển • Chuỗi Thực Phẩm Sạch - Thụy Khuê',
    address: '45 Thụy Khuê, Tây Hồ, Hà Nội',
    lat: 21.044,
    lng: 105.818,
    phone: '0988123043',
    logoUrl:
      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 480,
    item: {
      name: 'Túi Cứu Món • Trái Cây & Bánh Ngọt Sữa Chua Sấy Thăng Hoa',
      category: 'Groceries',
      originalPrice: 110000,
      currentPrice: 42000,
      floorPrice: 38000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 48,
      allergens: [],
      imageUrl:
        'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800&auto=format&fit=crop&q=80',
      description:
        'Trái cây đặc sản miền tây bưởi da xanh ngọt mát kèm sữa chua sấy thăng hoa giòn tan.',
      ingredients: 'Bưởi da xanh Bến Tre chuẩn GlobalGAP, sữa chua sấy lạnh giữ men vi sinh',
      calories: 220,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000044',
    name: 'Nem Chua Rán Tạm Thương - Chùa Láng',
    address: '19 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội',
    lat: 21.0235,
    lng: 105.801,
    phone: '0988123044',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 390,
    item: {
      name: 'Mẹt Cứu Món • 10 Chiếc Nem Chua Rán Tẩm Bột Bánh Xoài Xanh',
      category: 'Meals',
      originalPrice: 60000,
      currentPrice: 25000,
      floorPrice: 20000,
      totalQty: 12,
      remainingQty: 6,
      shelfLifeHours: 8,
      allergens: ['Thịt heo', 'Bột chiên xù'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Nem chua tẩm bột chiên xù vàng ươm vỏ giòn ruột dẻo mềm dai ngọt, chấm tương ớt cay nồng.',
      ingredients: 'Bì heo, thịt nạc mông ướp thính, bột chiên xù, tương ớt Mường Khương',
      calories: 470,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000045',
    name: 'Bánh Tráng Cuốn Thịt Heo Hoàng Bèo - Nguyễn Chí Thanh',
    address: '60 Nguyễn Chí Thanh, Láng Thượng, Đống Đa, Hà Nội',
    lat: 21.022,
    lng: 105.808,
    phone: '0988123045',
    logoUrl:
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.7,
    ratingCount: 330,
    item: {
      name: 'Suất Cứu Món • Bánh Tráng Cuốn Thịt Heo Quay Giòn Bì Mắm Nêm',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 28000,
      floorPrice: 24000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Mắm nêm cá cơm', 'Thịt heo'],
      imageUrl:
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      description:
        'Thịt heo quay giòn bì 3 chỉ cắt lát mỏng cuốn bánh tráng Đại Lộc cùng dưa leo xoài xanh chấm mắm nêm đậm đà.',
      ingredients:
        'Thịt ba chỉ quay giòn bì, bánh tráng phơi sương, mắm nêm cá cơm nguyên chất, rau thơm',
      calories: 580,
    },
  },

  // -------------------------------------------------------------
  // CỤM 4: BÁN KÍNH TRUNG TÂM (6.0 KM - 9.5 KM) - PHỐ CỔ, HOÀN KIẾM, ĐỐNG ĐA
  // -------------------------------------------------------------
  {
    id: 'a1000000-0000-4000-8000-000000000046',
    name: 'Phở Gia Truyền Bát Đàn - Hoàn Kiếm',
    address: '49 Bát Đàn, Cửa Đông, Hoàn Kiếm, Hà Nội',
    lat: 21.0345,
    lng: 105.8475,
    phone: '0988123046',
    logoUrl:
      'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 890,
    item: {
      name: 'Suất Cứu Món • Phở Bò Tái Nạm Bát Đàn Nước Trong Thanh Vị',
      category: 'Meals',
      originalPrice: 75000,
      currentPrice: 32000,
      floorPrice: 28000,
      totalQty: 8,
      remainingQty: 3,
      shelfLifeHours: 6,
      allergens: ['Thịt bò'],
      imageUrl:
        'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
      description:
        'Hương vị phở gia truyền hơn 70 năm đất Hà Thành, nước dùng không mì chính ngọt thanh vị tủy xương bò.',
      ingredients:
        'Xương ống bò hầm 24 tiếng, thịt bò tái nạm bắp, bánh phở mềm không chua, hành hoa',
      calories: 540,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000047',
    name: 'Bún Chả Hàng Mành Đắc Kim - Hoàn Kiếm',
    address: '1 Hàng Mành, Hàng Gai, Hoàn Kiếm, Hà Nội',
    lat: 21.033,
    lng: 105.8485,
    phone: '0988123047',
    logoUrl:
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 750,
    item: {
      name: 'Suất Cứu Món • Bún Chả Nướng Kèm Nem Cua Đắc Kim',
      category: 'Meals',
      originalPrice: 80000,
      currentPrice: 35000,
      floorPrice: 30000,
      totalQty: 10,
      remainingQty: 4,
      shelfLifeHours: 8,
      allergens: ['Nước mắm', 'Cua bể'],
      imageUrl:
        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
      description:
        'Chả thịt nướng que tre thơm nồng nàn góc phố cổ, bát nước chấm nóng ấm dầm đu đủ tỏi ớt thơm ngây ngất.',
      ingredients:
        'Thịt heo ba chỉ ướp mật mía, nem cua gói bánh đa nem giòn, bún rối tươi, rau thơm',
      calories: 620,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000048',
    name: 'Cà Phê Giảng Trứng Cổ Điển - Nguyễn Hữu Huân',
    address: '39 Nguyễn Hữu Huân, Lý Thái Tổ, Hoàn Kiếm, Hà Nội',
    lat: 21.034,
    lng: 105.854,
    phone: '0988123048',
    logoUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 980,
    item: {
      name: 'Combo Cứu Món • 2 Cốc Cà Phê Trứng Nóng Hổi Giảng 1946',
      category: 'Other',
      originalPrice: 70000,
      currentPrice: 28000,
      floorPrice: 25000,
      totalQty: 12,
      remainingQty: 6,
      shelfLifeHours: 12,
      allergens: ['Lòng đỏ trứng gà', 'Sữa đặc'],
      imageUrl:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
      description:
        'Cà phê trứng khởi nguồn từ cụ Giảng năm 1946, lớp kem trứng vàng óng sánh mịn ngọt ngào hòa quyện cà phê đậm đà.',
      ingredients:
        'Cà phê phin Robusta tuyển chọn, lòng đỏ trứng gà tươi đánh bông kem, sữa đặc cao cấp',
      calories: 380,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000049',
    name: 'Bánh Mì 25 - Hàng Cá Phố Cổ',
    address: '25 Hàng Cá, Hàng Đào, Hoàn Kiếm, Hà Nội',
    lat: 21.0365,
    lng: 105.849,
    phone: '0988123049',
    logoUrl:
      'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.9,
    ratingCount: 880,
    item: {
      name: 'Combo Cứu Món • 2 Bánh Mì Pate Xá Xíu Phố Cổ Kèm Nước Mơ Chùa Hương',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 27000,
      floorPrice: 23000,
      totalQty: 14,
      remainingQty: 6,
      shelfLifeHours: 8,
      allergens: ['Gluten', 'Pate'],
      imageUrl:
        'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80',
      description:
        'Bánh mì nướng than giòn rụm kẹp thịt xá xíu thơm mềm, pate gan béo mịn tự làm và dưa leo nộm giòn mát.',
      ingredients:
        'Bánh mì baguette Việt Nam, thịt xá xíu hoa sen, pate gan truyền thống, nước sốt mật ong',
      calories: 560,
    },
  },
  {
    id: 'a1000000-0000-4000-8000-000000000050',
    name: 'Xôi Yến Hà Nội - Nguyễn Hữu Huân',
    address: '35B Nguyễn Hữu Huân, Hàng Bạc, Hoàn Kiếm, Hà Nội',
    lat: 21.0335,
    lng: 105.8535,
    phone: '0988123050',
    logoUrl:
      'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&auto=format&fit=crop&q=80',
    ratingAvg: 4.8,
    ratingCount: 650,
    item: {
      name: 'Suất Cứu Món • Xôi Xéo Thịt Kho Tàu Trứng Kho Lòng Đào',
      category: 'Meals',
      originalPrice: 65000,
      currentPrice: 28000,
      floorPrice: 24000,
      totalQty: 10,
      remainingQty: 5,
      shelfLifeHours: 8,
      allergens: ['Trứng kho', 'Hành phi'],
      imageUrl:
        'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
      description:
        'Bát xôi xéo đỗ xanh béo ngậy ăn cùng thịt kho tàu mềm rục ngấm gia vị thảo mộc và trứng kho lòng đào.',
      ingredients:
        'Gạo nếp nương, đỗ xanh đồ nhuyễn, thịt ba chỉ kho tàu nước dừa, trứng kho, hành phi thơm',
      calories: 680,
    },
  },
];

export async function seedHanoiStoresAndOffers(dataSource: DataSource): Promise<{
  storesCount: number;
  itemsCount: number;
  offersCount: number;
  storesUpdated?: number;
  itemsUpdated?: number;
  offersUpdated?: number;
}> {
  const logger = new Logger('HanoiDemoSeed');
  logger.log(
    '🚀 Bắt đầu nạp 50 cửa hàng ẩm thực Việt Nam quanh 122 Hoàng Quốc Việt, Cầu Giấy, Hà Nội...',
  );

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Đảm bảo có User chủ quán demo cho Hà Nội & phân quyền store_members
    const demoStoreAccounts = [
      {
        userId: 'a1000000-0000-4000-8000-000000000000',
        storeId: 'a1000000-0000-4000-8000-000000000001',
        email: 'chuthucan.hanoi@surplusiq.vn',
        phone: '0988123000',
        name: 'Chủ Quán Phở Cụ Chiêu & Cụm Hà Nội',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000021',
        storeId: 'a1000000-0000-4000-8000-000000000002',
        email: 'buncha.sinhtu@surplusiq.vn',
        phone: '0988123002',
        name: 'Chủ Quán Bún Chả Sinh Từ',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000025',
        storeId: 'a1000000-0000-4000-8000-000000000005',
        email: 'che.changhi@surplusiq.vn',
        phone: '0988123005',
        name: 'Chủ Tiệm Chè Chang Hi',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000032',
        storeId: 'a1000000-0000-4000-8000-000000000012',
        email: 'banhmi.danto@surplusiq.vn',
        phone: '0988123012',
        name: 'Chủ Quán Bánh Mì Dân Tổ',
      },
      {
        userId: 'a1000000-0000-4000-8000-000000000033',
        storeId: 'a1000000-0000-4000-8000-000000000013',
        email: 'xoixeo.comay@surplusiq.vn',
        phone: '0988123013',
        name: 'Chủ Quán Xôi Xéo Cô Mây',
      },
    ];

    const hanoiOwnerId = demoStoreAccounts[0].userId;

    for (const acc of demoStoreAccounts) {
      const existingUser = await queryRunner.manager.findOne(UserEntity, {
        where: { id: acc.userId },
      });
      if (!existingUser) {
        const ownerUser = queryRunner.manager.create(UserEntity, {
          id: acc.userId,
          email: acc.email,
          phone: acc.phone,
          role: UserRole.STORE_USER,
          status: UserStatus.ACTIVE,
          passwordHash: CryptoUtil.hashPassword('123456'),
        });
        await queryRunner.manager.save(UserEntity, ownerUser);
      } else {
        existingUser.status = UserStatus.ACTIVE;
        existingUser.role = UserRole.STORE_USER;
        existingUser.passwordHash = CryptoUtil.hashPassword('123456');
        await queryRunner.manager.save(UserEntity, existingUser);
      }

      // Đảm bảo có StoreMemberEntity liên kết tài khoản với cửa hàng để login app merchant/web store lấy được storeId
      const existingMember = await queryRunner.manager.findOne(StoreMemberEntity, {
        where: { userId: acc.userId },
      });
      if (!existingMember) {
        const member = queryRunner.manager.create(StoreMemberEntity, {
          storeId: acc.storeId,
          userId: acc.userId,
          permission: StorePermission.OWNER,
          status: StoreMemberStatus.ACTIVE,
          lastActiveAt: new Date(),
        });
        await queryRunner.manager.save(StoreMemberEntity, member);
      } else {
        existingMember.storeId = acc.storeId;
        existingMember.permission = StorePermission.OWNER;
        existingMember.status = StoreMemberStatus.ACTIVE;
        await queryRunner.manager.save(StoreMemberEntity, existingMember);
      }
    }

    const now = new Date();
    // Khung giờ nhận hàng: từ sáng (07:00) đến tối muộn (23:30) để hiển thị tự nhiên, hợp lý cho quán ăn
    const pickupStart = new Date(now);
    pickupStart.setHours(7, 0, 0, 0);

    const pickupEnd = new Date(now);
    pickupEnd.setDate(pickupEnd.getDate() + 1);
    pickupEnd.setHours(23, 30, 0, 0);

    const expiresAt = new Date(pickupEnd);

    let storesInserted = 0;
    let storesUpdated = 0;
    let itemsInserted = 0;
    let itemsUpdated = 0;
    let offersInserted = 0;
    let offersUpdated = 0;

    for (const storeDef of HANOI_50_STORES) {
      // 2. Insert or update StoreEntity
      const existingStore = await queryRunner.manager.findOne(StoreEntity, {
        where: { id: storeDef.id },
      });

      if (!existingStore) {
        // PostGIS geometry: ST_SetSRID(ST_MakePoint(lng, lat), 4326)
        await queryRunner.query(
          `INSERT INTO "stores" (
            "id", "owner_user_id", "name", "address", "location", "phone",
            "logo_url", "status", "rating_avg", "rating_count", "is_demo", "trial_used"
          ) VALUES (
            $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7,
            $8, $9, $10, $11, true, false
          ) ON CONFLICT ("id") DO UPDATE SET
            "location" = ST_SetSRID(ST_MakePoint($5, $6), 4326),
            "name" = EXCLUDED."name",
            "address" = EXCLUDED."address"`,
          [
            storeDef.id,
            hanoiOwnerId,
            storeDef.name,
            storeDef.address,
            storeDef.lng,
            storeDef.lat,
            storeDef.phone,
            storeDef.logoUrl,
            StoreStatus.ACTIVE,
            storeDef.ratingAvg,
            storeDef.ratingCount,
          ],
        );
        storesInserted++;
      } else {
        await queryRunner.query(
          `UPDATE "stores" SET
            "status" = $1,
            "location" = ST_SetSRID(ST_MakePoint($2, $3), 4326),
            "name" = $4,
            "address" = $5,
            "phone" = $6,
            "logo_url" = $7,
            "rating_avg" = $8,
            "rating_count" = $9
          WHERE "id" = $10`,
          [
            StoreStatus.ACTIVE,
            storeDef.lng,
            storeDef.lat,
            storeDef.name,
            storeDef.address,
            storeDef.phone,
            storeDef.logoUrl,
            storeDef.ratingAvg,
            storeDef.ratingCount,
            storeDef.id,
          ],
        );
        storesUpdated++;
      }

      // Store Settings
      const existingSettings = await queryRunner.manager.findOne(StoreSettingsEntity, {
        where: { storeId: storeDef.id },
      });
      if (!existingSettings) {
        const settings = queryRunner.manager.create(StoreSettingsEntity, {
          storeId: storeDef.id,
          defaultPickupStart: '18:00:00',
          defaultPickupEnd: '21:30:00',
          floorRatio: 0.4,
          pricingMode: PricingMode.MANUAL,
          taskReminders: { closingChecklist: true },
        });
        await queryRunner.manager.save(StoreSettingsEntity, settings);
      }

      // Kích hoạt gói PRO (Subscription) cho quán để mở toàn bộ tính năng và quota
      const existingSub = await queryRunner.manager.findOne(SubscriptionEntity, {
        where: { storeId: storeDef.id },
      });
      if (!existingSub) {
        const sub = queryRunner.manager.create(SubscriptionEntity, {
          storeId: storeDef.id,
          plan: SubscriptionPlan.PRO,
          periodStart: now,
          periodEnd: new Date(now.getTime() + 365 * 24 * 3600 * 1000),
          status: SubscriptionStatus.ACTIVE,
          cancelAtPeriodEnd: false,
          downgradeAtPeriodEnd: false,
          trialUsed: true,
        });
        await queryRunner.manager.save(SubscriptionEntity, sub);
      } else {
        existingSub.status = SubscriptionStatus.ACTIVE;
        existingSub.plan = SubscriptionPlan.PRO;
        existingSub.periodEnd = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
        await queryRunner.manager.save(SubscriptionEntity, existingSub);
      }

      // 3. Insert or update ItemEntity
      const itemId = storeDef.id.replace('a1000000', 'b1000000');
      const existingItem = await queryRunner.manager.findOne(ItemEntity, {
        where: { id: itemId },
      });

      if (!existingItem) {
        const item = queryRunner.manager.create(ItemEntity, {
          id: itemId,
          storeId: storeDef.id,
          name: storeDef.item.name,
          category: normalizeFoodCategory(storeDef.item.category, storeDef.item.name),
          originalPrice: storeDef.item.originalPrice,
          standardShelfLifeHours: storeDef.item.shelfLifeHours,
          ingredients: storeDef.item.ingredients,
          allergens: storeDef.item.allergens,
          imageUrl: storeDef.item.imageUrl,
          description: storeDef.item.description,
          nutritionEstimate: {
            calories: storeDef.item.calories,
            source: 'Thực đơn món Việt Nam truyền thống',
          },
          status: ItemStatus.ACTIVE,
          informationSource: TrustpassInformationSource.STORE,
          verificationStatus: TrustpassVerificationStatus.VERIFIED,
          trustpassVersion: 1,
          trustpassPublishedAt: now,
          reviewStatus: TrustpassReviewStatus.NONE,
        });
        await queryRunner.manager.save(ItemEntity, item);
        itemsInserted++;
      } else {
        existingItem.status = ItemStatus.ACTIVE;
        existingItem.name = storeDef.item.name;
        existingItem.category = storeDef.item.category;
        existingItem.originalPrice = storeDef.item.originalPrice;
        existingItem.imageUrl = storeDef.item.imageUrl;
        existingItem.description = storeDef.item.description;
        await queryRunner.manager.save(ItemEntity, existingItem);
        itemsUpdated++;
      }

      // 4. Insert or update OfferEntity (Suất Cứu Món)
      const offerId = storeDef.id.replace('a1000000', 'c1000000');
      const existingOffer = await queryRunner.manager.findOne(OfferEntity, {
        where: { id: offerId },
      });

      if (!existingOffer) {
        const offer = queryRunner.manager.create(OfferEntity, {
          id: offerId,
          storeId: storeDef.id,
          itemId: itemId,
          kind: OfferKind.SURPRISE_BAG,
          totalQuantity: storeDef.item.totalQty,
          remainingQuantity: storeDef.item.remainingQty,
          soldQuantity: storeDef.item.totalQty - storeDef.item.remainingQty,
          originalPrice: storeDef.item.originalPrice,
          currentPrice: storeDef.item.currentPrice,
          floorPrice: storeDef.item.floorPrice,
          pickupStart,
          pickupEnd,
          expiresAt,
          status: OfferStatus.OPEN,
        });
        await queryRunner.manager.save(OfferEntity, offer);
        offersInserted++;
      } else {
        existingOffer.status = OfferStatus.OPEN;
        existingOffer.pickupStart = pickupStart;
        existingOffer.pickupEnd = pickupEnd;
        existingOffer.expiresAt = expiresAt;
        existingOffer.totalQuantity = storeDef.item.totalQty;
        existingOffer.remainingQuantity = storeDef.item.remainingQty;
        existingOffer.soldQuantity = storeDef.item.totalQty - storeDef.item.remainingQty;
        existingOffer.originalPrice = storeDef.item.originalPrice;
        existingOffer.currentPrice = storeDef.item.currentPrice;
        existingOffer.floorPrice = storeDef.item.floorPrice;
        await queryRunner.manager.save(OfferEntity, existingOffer);
        offersUpdated++;
      }
    }

    await queryRunner.commitTransaction();
    logger.log(
      `✅ [HanoiDemoSeed] Hoàn tất nạp seed: ${HANOI_50_STORES.length} cửa hàng tại Hà Nội (mới thêm: ${storesInserted} quán, ${itemsInserted} món, ${offersInserted} suất | làm mới hạn dùng: ${storesUpdated} quán, ${itemsUpdated} món, ${offersUpdated} suất cứu món).`,
    );

    return {
      storesCount: HANOI_50_STORES.length,
      itemsCount: HANOI_50_STORES.length,
      offersCount: HANOI_50_STORES.length,
      storesUpdated,
      itemsUpdated,
      offersUpdated,
    };
  } catch (err) {
    await queryRunner.rollbackTransaction();
    logger.error(
      '❌ [HanoiDemoSeed] Lỗi khi nạp seed Hà Nội:',
      err instanceof Error ? err.stack : String(err),
    );
    throw err;
  } finally {
    await queryRunner.release();
  }
}
