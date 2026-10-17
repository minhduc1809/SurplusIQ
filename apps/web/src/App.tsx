import { useState, useEffect } from 'react';
import {
  Compass,
  ShoppingBag,
  Heart,
  User,
  ArrowLeft,
  Clock,
  MapPin,
  Star,
  Check,
  Sparkles,
  X,
  ChevronRight,
  QrCode,
  Filter,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  AlertTriangle,
  Tag,
  Edit3,
  Send,
  BarChart3,
} from 'lucide-react';

interface Deal {
  id: string;
  storeName: string;
  storeAddress: string;
  storeLogoUrl: string;
  coverImageUrl: string;
  title: string;
  whatYouCouldGet: string;
  category: 'Meals' | 'Baked goods' | 'Groceries' | 'Other';
  originalPrice: number;
  discountPrice: number;
  remainingStock: number;
  pickupWindowText: string;
  distanceText: string;
  rating: number;
  reviewCount: number;
  allergens: string[];
  isFavorite: boolean;
  isUrgent?: boolean;
}

const INITIAL_DEALS: Deal[] = [
  {
    id: 'deal-1',
    storeName: 'Rincón del Pan - Rambla Pulido',
    storeAddress: 'C. de Castro, 22, 38004 Santa Cruz de Tenerife',
    storeLogoUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&auto=format&fit=crop&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    title: 'Túi Bất Ngờ • Magic Bag',
    whatYouCouldGet:
      'Salva Comida en Rincón del Pan y tu Pack Sorpresa podrá contener variedad de bollería y otros productos tanto dulces como salados nướng tươi trong ngày.',
    category: 'Baked goods',
    originalPrice: 90000,
    discountPrice: 29900,
    remainingStock: 2,
    pickupWindowText: 'Collect: 20:30 - 21:00 Today',
    distanceText: '582 m',
    rating: 3.7,
    reviewCount: 121,
    allergens: ['Gluten', 'Sữa bò', 'Trứng gà', 'Bơ thực vật'],
    isFavorite: true,
    isUrgent: true,
  },
  {
    id: 'deal-2',
    storeName: 'Rincón del Pan - Valentín Sanz',
    storeAddress: 'Calle Valentín Sanz, 18',
    storeLogoUrl:
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=160&auto=format&fit=crop&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80',
    title: 'Magic Bag • Bánh Sừng Bò & Tart',
    whatYouCouldGet:
      'Gồm 2-3 phần bánh sừng bò kem bơ Pháp giòn rụm và bánh tart trái cây ngọt ngào.',
    category: 'Baked goods',
    originalPrice: 90000,
    discountPrice: 29900,
    remainingStock: 4,
    pickupWindowText: 'Collect today 20:50 - 21:20',
    distanceText: '582 m',
    rating: 4.3,
    reviewCount: 98,
    allergens: ['Gluten', 'Sữa'],
    isFavorite: false,
    isUrgent: false,
  },
  {
    id: 'deal-3',
    storeName: 'La Albahaca - Comida casera para llevar',
    storeAddress: 'Avenida de Anaga, 12',
    storeLogoUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    title: 'Magic Bag • Suất Bữa Ăn Nóng',
    whatYouCouldGet: 'Suất cơm mặn gia đình, mì Ý pesto hoặc súp kem nấm ấm nóng thơm ngon.',
    category: 'Meals',
    originalPrice: 120000,
    discountPrice: 42000,
    remainingStock: 3,
    pickupWindowText: 'Collect today 14:00 - 15:30',
    distanceText: '645 m',
    rating: 4.3,
    reviewCount: 76,
    allergens: ['Đậu nành', 'Tiêu'],
    isFavorite: false,
    isUrgent: false,
  },
  {
    id: 'deal-4',
    storeName: 'Rincón del Pan - Calle de la Rosa',
    storeAddress: 'Calle de la Rosa, 34',
    storeLogoUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
    coverImageUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    title: 'Magic Bag • Bánh Mì Men Sourdough',
    whatYouCouldGet: 'Ổ bánh mì ngũ cốc nguyên cám lên men tự nhiên và bánh ngọt tráng miệng.',
    category: 'Baked goods',
    originalPrice: 90000,
    discountPrice: 29900,
    remainingStock: 2,
    pickupWindowText: 'Collect today 20:30 - 21:10',
    distanceText: '759 m',
    rating: 4.1,
    reviewCount: 54,
    allergens: ['Lúa mì', 'Hạt vừng'],
    isFavorite: false,
    isUrgent: true,
  },
];

export default function App() {
  const [appMode, setAppMode] = useState<'mobile' | 'store'>('mobile');

  // Customer Mobile App State
  const [activeTab, setActiveTab] = useState<'discover' | 'browse' | 'favourites' | 'me'>(
    'discover',
  );
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPickupPass, setShowPickupPass] = useState(false);
  const [showFavoriteToast, setShowFavoriteToast] = useState(false);
  const [showAiSheet, setShowAiSheet] = useState(false);

  // Preferences State (Matching Image 2 Screen 2)
  const [filterMatchingOnly, setFilterMatchingOnly] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Meals',
    'Baked goods',
    'Groceries',
    'Other',
  ]);
  const [selectedDietary, setSelectedDietary] = useState<'None' | 'Vegetarian' | 'Vegan'>('None');
  const [selectedTimes, setSelectedTimes] = useState<string[]>(['Morning', 'Noon']);

  // Deals State
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [holdTimer, setHoldTimer] = useState(600); // 10 minutes in seconds

  // Hold Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (showCheckout && holdTimer > 0) {
      interval = setInterval(() => {
        setHoldTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showCheckout, holdTimer]);

  // Customer Checkout Promotion (R1-053)
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;
    if (code === 'SAVE15' || code === 'SAVEBITE15' || code === 'GIAM15K') {
      const disc = Math.round((selectedDeal?.discountPrice || 29900) * 0.15);
      setDiscountAmount(disc);
      setAppliedPromo(code);
      setPromoFeedback(
        `Áp dụng thành công mã ${code}: Giảm ${disc.toLocaleString('vi-VN')} ₫ (15%)`,
      );
    } else if (code === 'WELCOME10K' || code === 'BANHMI10') {
      const disc = 10000;
      setDiscountAmount(disc);
      setAppliedPromo(code);
      setPromoFeedback(`Áp dụng thành công mã ${code}: Giảm ${disc.toLocaleString('vi-VN')} ₫`);
    } else {
      setPromoFeedback(`Mã "${code}" không hợp lệ hoặc đã hết hạn sử dụng.`);
    }
  };

  // Customer AI Chat (R1-083, R1-088)
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<
    Array<{ sender: 'user' | 'ai'; text: string }>
  >([
    {
      sender: 'ai',
      text: '👋 Chào bạn! Tôi là trợ lý SaveBite AI. Bạn cần tìm deal ngon hôm nay hay hỏi về tình trạng đơn hàng đang chờ nhận?',
    },
  ]);

  const handleSendAiMessage = (customMsg?: string) => {
    const query = (customMsg || aiChatInput).trim();
    if (!query) return;

    const newMsgs = [...aiChatMessages, { sender: 'user' as const, text: query }];
    setAiChatMessages(newMsgs);
    setAiChatInput('');

    // AI logic recognizing real order status (R1-083, R1-088)
    const qLower = query.toLowerCase();
    setTimeout(() => {
      let reply: string;
      if (
        qLower.includes('đơn') ||
        qLower.includes('nhận') ||
        qLower.includes('đến') ||
        qLower.includes('lấy')
      ) {
        reply =
          '🔍 [Hệ thống nhận diện đơn hàng của bạn]: Bạn đang có đơn hàng #SUQ8921 (Túi Bất Ngờ • Magic Bag) tại tiệm Rincón del Pan. Khung giờ nhận hàng: 20:30 - 21:00 hôm nay. Hiện tiệm đã chuẩn bị xong, bạn hãy mở mục "Vé QR" trong app và ghé nhận nhé! Bạn cũng có thể bấm "Báo quán tôi sắp đến" để nhân viên gói sẵn.';
      } else if (
        qLower.includes('chỉ đường') ||
        qLower.includes('địa chỉ') ||
        qLower.includes('bản đồ')
      ) {
        reply =
          '📍 Địa chỉ tiệm: C. de Castro, 22, Santa Cruz de Tenerife (cách bạn 582m). Bạn có thể bấm nút "Chỉ đường" trên thẻ deal để mở Google Maps hoặc sao chép địa chỉ nếu máy không có app bản đồ (BR-013).';
      } else if (qLower.includes('dị ứng') || qLower.includes('sữa') || qLower.includes('gluten')) {
        reply =
          '⚠️ Cảnh báo thành phần: Suất bánh tại Rincón del Pan có chứa Gluten, Sữa bò và Trứng gà. Nếu bạn có dị ứng nặng với các chất này, vui lòng cân nhắc chọn món khác ở danh mục "Meals" nhé!';
      } else {
        reply = `Cảm ơn bạn đã hỏi về "${query}". SaveBite AI gợi ý cho bạn: Quanh khu vực bạn trong bán kính 1km hiện có 3 suất bánh nướng tươi ngon đang giảm giá tới 67% sau 20h. Bạn có thể chọn đặt giữ suất ngay để không bỏ lỡ nhé!`;
      }
      setAiChatMessages([...newMsgs, { sender: 'ai', text: reply }]);
    }, 400);
  };

  // Merchant Portal Tabs (R2 Use Cases)
  const [merchantTab, setMerchantTab] = useState<
    | 'forecast'
    | 'reports'
    | 'staff'
    | 'customers'
    | 'promotions'
    | 'simulation'
    | 'complaints'
    | 'offers'
  >('forecast');

  // R2-037 & R2-042: Forecast State
  const [selectedForecastItem, setSelectedForecastItem] = useState<string | null>('fc-3');
  const [fallbackChosen, setFallbackChosen] = useState<string | null>(null);

  // R2-081: Staff Audit Filter
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'AN' | 'BINH' | 'CUONG'>('ALL');

  // R2-089 & R2-090: Promotions
  const [promotionsList, setPromotionsList] = useState([
    {
      id: 'promo-1',
      code: 'SAVE15',
      name: 'Ưu đãi kích cầu giờ chót',
      discountPercent: 15,
      status: 'ACTIVE',
      usedCount: 24,
      revenueGenerated: 1680000,
      totalDiscountGiven: 252000,
      conversionRate: 22.4,
      expiresAt: '2026-10-31',
    },
    {
      id: 'promo-2',
      code: 'WELCOME10K',
      name: 'Tặng khách mới thử món',
      discountPercent: 10,
      status: 'ACTIVE',
      usedCount: 18,
      revenueGenerated: 940000,
      totalDiscountGiven: 94000,
      conversionRate: 17.1,
      expiresAt: '2026-10-25',
    },
    {
      id: 'promo-3',
      code: 'FLASH20',
      name: 'Xả bánh ngọt tươi sau 21h',
      discountPercent: 20,
      status: 'PAUSED',
      usedCount: 42,
      revenueGenerated: 2100000,
      totalDiscountGiven: 420000,
      conversionRate: 31.8,
      expiresAt: '2026-10-20',
    },
  ]);
  const [editingPromo, setEditingPromo] = useState<any | null>(null);

  // R2-117: AI Notification Drafter
  const [showAiNotificationModal, setShowAiNotificationModal] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState(
    'Giảm giá 30% bánh sừng bò kem bơ sau 20h30 hôm nay',
  );
  const [aiDraftResult, setAiDraftResult] = useState<string | null>(null);

  // R2-105: Simulation
  const [simDiscount, setSimDiscount] = useState(40);
  const [simDynamicPricing, setSimDynamicPricing] = useState(true);
  const [simRuns, setSimRuns] = useState([
    {
      id: 'sim-1',
      title: 'Thử nghiệm A (30 ngày, Chiết khấu 35%, Định giá động TẮT)',
      days: 30,
      discount: 35,
      dynamicPricing: false,
      simulatedRevenue: 3840000,
      revenueGainPercent: 12,
      salvagedPortions: 48,
      createdAt: '17/10/2026 14:15',
    },
    {
      id: 'sim-2',
      title: 'Thử nghiệm B (30 ngày, Chiết khấu 45%, Định giá động BẬT)',
      days: 30,
      discount: 45,
      dynamicPricing: true,
      simulatedRevenue: 4420000,
      revenueGainPercent: 24,
      salvagedPortions: 72,
      createdAt: '17/10/2026 16:30',
    },
  ]);
  const [simPeriodDays, setSimPeriodDays] = useState(30);
  const [showSimCompare, setShowSimCompare] = useState(false);

  // R2-118: Complaints & AI Reply
  const [selectedComplaint, setSelectedComplaint] = useState<{
    id: string;
    customerName: string;
    orderCode: string;
    reason: string;
    detail: string;
    status: string;
  } | null>({
    id: 'cp-1',
    customerName: 'Khách hàng #8921',
    orderCode: 'SUQ8921',
    reason: 'Chất lượng không như mô tả',
    detail: 'Bánh sừng bò nhận lúc 21h hơi nguội và không giòn như mong đợi.',
    status: 'PENDING',
  });
  const [aiReplyOption, setAiReplyOption] = useState<'REFUND' | 'REJECT' | 'APOLOGY'>('REFUND');
  const [aiGeneratedReply, setAiGeneratedReply] = useState<string | null>(null);

  const toggleFavorite = (dealId: string) => {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id === dealId) {
          const next = !d.isFavorite;
          if (next) {
            setShowFavoriteToast(true);
            setTimeout(() => setShowFavoriteToast(false), 3000);
          }
          return { ...d, isFavorite: next };
        }
        return d;
      }),
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0f1d',
        color: '#f9fafb',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Top Switcher Navigation */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          backgroundColor: '#111827',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>SurplusIQ</span>
          <span className="badge badge-emerald">Vừa Đủ • Bán Hết Trong Ngày</span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px',
            borderRadius: '12px',
          }}
        >
          <button
            onClick={() => setAppMode('mobile')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: appMode === 'mobile' ? '#00473e' : 'transparent',
              color: '#ffffff',
            }}
          >
            📱 App Khách Hàng (Too Good To Go UI)
          </button>
          <button
            onClick={() => setAppMode('store')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: appMode === 'store' ? '#10b981' : 'transparent',
              color: '#ffffff',
            }}
          >
            🏪 Web Chủ Cửa Hàng (Dashboard & Định Giá)
          </button>
        </div>
      </nav>

      {/* Main Body */}
      {appMode === 'mobile' ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
          {/* Mobile Frame (iPhone Shape) */}
          <div
            style={{
              width: '390px',
              minHeight: '844px',
              backgroundColor: '#ffffff',
              color: '#111827',
              borderRadius: '44px',
              boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7), 0 0 0 10px #1f2937',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {/* Phone Top Notch */}
            <div
              style={{
                height: '34px',
                backgroundColor: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 24px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#111827',
                borderTopLeftRadius: '44px',
                borderTopRightRadius: '44px',
              }}
            >
              <span>12:15</span>
              <div
                style={{
                  width: '120px',
                  height: '20px',
                  backgroundColor: '#000000',
                  borderRadius: '10px',
                }}
              />
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px' }}>5G</span>
                <span>●</span>
              </div>
            </div>

            {/* SCREEN 1: DEAL DETAIL SCREEN (Matching Image 2 Screen 1) */}
            {selectedDeal ? (
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Hero Cover Image */}
                <div style={{ position: 'relative', width: '100%', height: '240px' }}>
                  <img
                    src={selectedDeal.coverImageUrl}
                    alt={selectedDeal.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Top Floating Buttons */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      right: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <button
                      onClick={() => setSelectedDeal(null)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      onClick={() => toggleFavorite(selectedDeal.id)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        border: 'none',
                        color: selectedDeal.isFavorite ? '#ef4444' : '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Heart size={18} fill={selectedDeal.isFavorite ? '#ef4444' : 'none'} />
                    </button>
                  </div>

                  {/* Toast: "Great! This store was added to your list of favourites" (Image 2 Screen 1) */}
                  {showFavoriteToast && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '60px',
                        left: '20px',
                        right: '20px',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '10px 14px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        zIndex: 10,
                      }}
                    >
                      <Heart size={16} fill="#ef4444" color="#ef4444" />
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#111827' }}>
                        Great! This store was added to your list of favourites
                      </span>
                    </div>
                  )}

                  {/* Badge: "2 left" */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '16px',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: '#ffffff',
                      borderRadius: '20px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}
                  >
                    {selectedDeal.remainingStock} left
                  </div>
                </div>

                {/* Content Details */}
                <div style={{ padding: '16px', flex: 1 }}>
                  {/* Store Info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                    }}
                  >
                    <img
                      src={selectedDeal.storeLogoUrl}
                      alt={selectedDeal.storeName}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>
                      {selectedDeal.storeName}
                    </span>
                  </div>

                  {/* Title & Price */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>
                      {selectedDeal.title}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          textDecoration: 'line-through',
                          color: '#9ca3af',
                        }}
                      >
                        {selectedDeal.originalPrice.toLocaleString('vi-VN')} ₫
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#00473e' }}>
                        {selectedDeal.discountPrice.toLocaleString('vi-VN')} ₫
                      </div>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '13px',
                      color: '#00473e',
                      fontWeight: '700',
                      marginBottom: '12px',
                    }}
                  >
                    <Star size={15} fill="#00473e" />
                    <span>
                      {selectedDeal.rating} ({selectedDeal.reviewCount})
                    </span>
                  </div>

                  {/* Highlighted Red Box: Collection Time (Image 2 Screen 1) */}
                  <div
                    style={{
                      border: '1.5px solid #ef4444',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'rgba(239,68,68,0.03)',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#ef4444" />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                        {selectedDeal.pickupWindowText}
                      </span>
                    </div>
                    <span
                      style={{
                        backgroundColor: '#00473e',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Today
                    </span>
                  </div>

                  {/* Address */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#4b5563',
                      marginBottom: '14px',
                    }}
                  >
                    <MapPin size={16} color="#00473e" />
                    <div style={{ flex: 1 }}>
                      <div>{selectedDeal.storeAddress}</div>
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                        More information about the store &gt;
                      </span>
                    </div>
                  </div>

                  <hr
                    style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }}
                  />

                  {/* WHAT YOU COULD GET */}
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#6b7280',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                    }}
                  >
                    WHAT YOU COULD GET
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#374151',
                      lineHeight: '1.4',
                      marginBottom: '10px',
                    }}
                  >
                    {selectedDeal.whatYouCouldGet}
                  </p>
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(0,71,62,0.1)',
                      color: '#00473e',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '700',
                    }}
                  >
                    {selectedDeal.category}
                  </span>

                  <hr
                    style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '14px 0' }}
                  />

                  {/* Ingredients & allergens */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>
                        Ingredients & allergens
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {selectedDeal.allergens.join(', ')}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#9ca3af" />
                  </div>

                  <hr
                    style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '14px 0' }}
                  />

                  {/* WHAT OTHER PEOPLE ARE SAYING */}
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#6b7280',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                    }}
                  >
                    WHAT OTHER PEOPLE ARE SAYING
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: '4px',
                    }}
                  >
                    <Star size={18} fill="#00473e" color="#00473e" />
                    <span>{selectedDeal.rating} / 5.0</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#00473e', fontWeight: '700' }}>
                    TOP 3 HIGHLIGHTS: Bánh tươi ngon • Tiệm nhiệt tình • Tiết kiệm sâu
                  </div>
                </div>

                {/* Sticky Reserve CTA Button */}
                <div
                  style={{
                    position: 'sticky',
                    bottom: 0,
                    backgroundColor: '#ffffff',
                    padding: '12px 16px',
                    boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
                  }}
                >
                  <button
                    onClick={() => setShowCheckout(true)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#00473e',
                      color: '#ffffff',
                      borderRadius: '24px',
                      fontSize: '15px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Reserve
                  </button>
                </div>
              </div>
            ) : showPreferences ? (
              /* SCREEN 2: PREFERENCES SCREEN (Matching Image 2 Screen 2) */
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <button
                    onClick={() => setShowPreferences(false)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>Preferences</span>
                </div>

                <div style={{ padding: '16px', flex: 1 }}>
                  {/* Switch */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                      Show Magic Bags matching your preferences
                    </span>
                    <input
                      type="checkbox"
                      checked={filterMatchingOnly}
                      onChange={(e) => setFilterMatchingOnly(e.target.checked)}
                      style={{ width: '20px', height: '20px', accentColor: '#00473e' }}
                    />
                  </div>

                  {/* Section 1: Select your preferences below (Green bordered box in screenshot) */}
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                    Select your preferences below
                  </div>
                  <div
                    style={{
                      border: '1.5px solid #059669',
                      borderRadius: '12px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '20px',
                    }}
                  >
                    {[
                      { name: 'Meals', bg: '#fef9c3', icon: '🍲' },
                      { name: 'Baked goods', bg: '#ffedd5', icon: '🥐' },
                      { name: 'Groceries', bg: '#dcfce7', icon: '🥦' },
                      { name: 'Other', bg: '#e0f2fe', icon: '🛍️' },
                    ].map((cat) => {
                      const isChecked = selectedCategories.includes(cat.name);
                      return (
                        <div
                          key={cat.name}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedCategories(
                                selectedCategories.filter((c) => c !== cat.name),
                              );
                            } else {
                              setSelectedCategories([...selectedCategories, cat.name]);
                            }
                          }}
                          style={{
                            backgroundColor: cat.bg,
                            borderRadius: '10px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '700' }}>{cat.name}</span>
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: isChecked ? '#00473e' : '#ffffff',
                              border: '1px solid #00473e',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                            }}
                          >
                            {isChecked && <Check size={14} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Section 2: Dietary preferences */}
                  <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                    Dietary preferences
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    {(['None', 'Vegetarian', 'Vegan'] as const).map((diet) => (
                      <button
                        key={diet}
                        onClick={() => setSelectedDietary(diet)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          border: '1px solid #00473e',
                          backgroundColor: selectedDietary === diet ? '#00473e' : 'transparent',
                          color: selectedDietary === diet ? '#ffffff' : '#00473e',
                          cursor: 'pointer',
                        }}
                      >
                        {diet}
                      </button>
                    ))}
                  </div>

                  {/* Section 3: Preferred collection times (Red highlighted box in screenshot) */}
                  <div
                    style={{
                      border: '1.5px solid #ef4444',
                      borderRadius: '10px',
                      padding: '10px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                      Preferred collection times
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'Morning', title: 'Morning', time: '05:00 - 10:00' },
                        { id: 'Noon', title: 'Noon', time: '10:00 - 14:00' },
                      ].map((slot) => {
                        const isSelected = selectedTimes.includes(slot.id);
                        return (
                          <div
                            key={slot.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedTimes(selectedTimes.filter((t) => t !== slot.id));
                              } else {
                                setSelectedTimes([...selectedTimes, slot.id]);
                              }
                            }}
                            style={{
                              flex: 1,
                              backgroundColor: isSelected ? '#00473e' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#111827',
                              border: '1px solid #00473e',
                              borderRadius: '8px',
                              padding: '8px',
                              textAlign: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: '700' }}>
                              {slot.title} {isSelected && '✓'}
                            </div>
                            <div style={{ fontSize: '10px', opacity: 0.8 }}>{slot.time}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Reset all & Apply */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedCategories(['Meals', 'Baked goods', 'Groceries', 'Other']);
                      setSelectedDietary('None');
                      setSelectedTimes(['Morning', 'Noon']);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      cursor: 'pointer',
                    }}
                  >
                    Reset all
                  </button>
                  <button
                    onClick={() => setShowPreferences(false)}
                    style={{
                      backgroundColor: '#00473e',
                      color: '#ffffff',
                      borderRadius: '24px',
                      padding: '10px 32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : (
              /* MAIN TABS (Discover, Browse, Favourites, Me) */
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'discover' && (
                  /* IMAGE 3: DISCOVER SCREEN */
                  <div style={{ flex: 1, paddingBottom: '16px' }}>
                    {/* Top Location Picker */}
                    <div
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '700',
                        }}
                      >
                        <MapPin size={16} color="#00473e" />
                        <span>Duggi, Santa Cruz de Tenerife within 1 km</span>
                        <ChevronDown size={14} color="#6b7280" />
                      </div>
                      <button
                        onClick={() => setShowAiSheet(true)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,71,62,0.1)',
                          border: 'none',
                          color: '#00473e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>

                    {/* Search & Filter Bar */}
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px' }}>
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: '#f3f4f6',
                          borderRadius: '24px',
                          padding: '8px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          color: '#9ca3af',
                        }}
                      >
                        <span>🔍 Search</span>
                      </div>
                      <button
                        onClick={() => setShowPreferences(true)}
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#f3f4f6',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Filter size={16} color="#111827" />
                      </button>
                    </div>

                    {/* Section 1: Recommended for you (Carousel) */}
                    <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: '800' }}>
                          Recommended for you
                        </span>
                        <span
                          onClick={() => setActiveTab('browse')}
                          style={{
                            fontSize: '12px',
                            color: '#00473e',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          See all &gt;
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          overflowX: 'auto',
                          paddingBottom: '8px',
                        }}
                      >
                        {deals.map((deal) => (
                          <div
                            key={deal.id}
                            onClick={() => setSelectedDeal(deal)}
                            style={{
                              minWidth: '220px',
                              backgroundColor: '#ffffff',
                              borderRadius: '16px',
                              border: '1px solid #e5e7eb',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                          >
                            <div style={{ position: 'relative', height: '110px' }}>
                              <img
                                src={deal.coverImageUrl}
                                alt={deal.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                  backgroundColor: 'rgba(0,0,0,0.75)',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                }}
                              >
                                {deal.remainingStock} left
                              </div>
                            </div>
                            <div style={{ padding: '10px' }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {deal.storeName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{deal.title}</div>
                              <div
                                style={{
                                  border: '1px solid #ef4444',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  margin: '6px 0',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                }}
                              >
                                {deal.pickupWindowText}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '12px',
                                }}
                              >
                                <span style={{ color: '#00473e', fontWeight: '700' }}>
                                  ★ {deal.rating}
                                </span>
                                <span style={{ fontWeight: '800' }}>
                                  {deal.discountPrice.toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Save before it's too late */}
                    <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: '800' }}>
                          Save before it's too late
                        </span>
                        <span
                          onClick={() => setActiveTab('browse')}
                          style={{
                            fontSize: '12px',
                            color: '#00473e',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          See all &gt;
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          overflowX: 'auto',
                          paddingBottom: '8px',
                        }}
                      >
                        {deals
                          .filter((d) => d.isUrgent)
                          .map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => setSelectedDeal(deal)}
                              style={{
                                minWidth: '220px',
                                backgroundColor: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e5e7eb',
                                overflow: 'hidden',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ position: 'relative', height: '110px' }}>
                                <img
                                  src={deal.coverImageUrl}
                                  alt={deal.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                  }}
                                >
                                  Sắp hết giờ
                                </div>
                              </div>
                              <div style={{ padding: '10px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                                  {deal.storeName}
                                </div>
                                <div
                                  style={{
                                    border: '1px solid #ef4444',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    margin: '6px 0',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                  }}
                                >
                                  {deal.pickupWindowText}
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                  }}
                                >
                                  <span
                                    style={{
                                      color: '#00473e',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                    }}
                                  >
                                    ★ {deal.rating}
                                  </span>
                                  <span style={{ fontWeight: '800', fontSize: '12px' }}>
                                    {deal.discountPrice.toLocaleString('vi-VN')} ₫
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'browse' && (
                  /* IMAGE 2 SCREEN 3: RECOMMENDED FOR YOU (BROWSE LIST) */
                  <div style={{ flex: 1, padding: '16px' }}>
                    <div style={{ fontSize: '17px', fontWeight: '800', marginBottom: '12px' }}>
                      Recommended for you
                    </div>

                    {/* Star Recommendation Banner */}
                    <div
                      style={{
                        border: '1px solid rgba(0,71,62,0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '16px',
                      }}
                    >
                      <Star size={18} color="#00473e" />
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#00473e' }}>
                        Magic Bags we think you'll love.
                      </span>
                    </div>

                    {/* Deal Cards List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {deals.map((deal) => (
                        <div
                          key={deal.id}
                          onClick={() => setSelectedDeal(deal)}
                          style={{
                            border: '1px solid #e5e7eb',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ position: 'relative', height: '140px' }}>
                            <img
                              src={deal.coverImageUrl}
                              alt={deal.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                color: '#ffffff',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '700',
                              }}
                            >
                              {deal.remainingStock} left
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(deal.id);
                              }}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.4)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: deal.isFavorite ? '#ef4444' : '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              <Heart size={16} fill={deal.isFavorite ? '#ef4444' : 'none'} />
                            </button>
                          </div>
                          <div style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px' }}>
                              {deal.storeName}
                            </div>
                            <div
                              style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 6px' }}
                            >
                              {deal.title}
                            </div>
                            {/* Red highlight box */}
                            <div
                              style={{
                                border: '1px solid #ef4444',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#111827',
                                marginBottom: '8px',
                              }}
                            >
                              {deal.pickupWindowText}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                <span style={{ color: '#00473e', fontWeight: '700' }}>
                                  ★ {deal.rating}
                                </span>
                                <span style={{ color: '#6b7280' }}>{deal.distanceText}</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    textDecoration: 'line-through',
                                    color: '#9ca3af',
                                  }}
                                >
                                  {deal.originalPrice.toLocaleString('vi-VN')} ₫
                                </div>
                                <div
                                  style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}
                                >
                                  {deal.discountPrice.toLocaleString('vi-VN')} ₫
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'favourites' && (
                  /* FAVOURITES SCREEN */
                  <div style={{ flex: 1, padding: '16px' }}>
                    <div style={{ fontSize: '17px', fontWeight: '800', marginBottom: '14px' }}>
                      Favourites
                    </div>
                    {deals.filter((d) => d.isFavorite).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
                        <Heart
                          size={48}
                          color="#ef4444"
                          style={{ opacity: 0.3, margin: '0 auto 12px' }}
                        />
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>
                          Chưa có tiệm yêu thích
                        </div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Hãy nhấn hình trái tim để lưu lại các tiệm bánh bạn ưng ý nhất!
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {deals
                          .filter((d) => d.isFavorite)
                          .map((deal) => (
                            <div
                              key={deal.id}
                              onClick={() => setSelectedDeal(deal)}
                              style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                padding: '12px',
                                display: 'flex',
                                gap: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              <img
                                src={deal.coverImageUrl}
                                alt={deal.title}
                                style={{
                                  width: '80px',
                                  height: '80px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '700', fontSize: '13px' }}>
                                  {deal.storeName}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                  {deal.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#ef4444',
                                    fontWeight: '700',
                                    marginTop: '4px',
                                  }}
                                >
                                  {deal.pickupWindowText}
                                </div>
                                <div
                                  style={{ fontWeight: '800', fontSize: '13px', marginTop: '4px' }}
                                >
                                  {deal.discountPrice.toLocaleString('vi-VN')} ₫
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'me' && (
                  /* ME / PROFILE SCREEN */
                  <div style={{ flex: 1, padding: '16px' }}>
                    <div style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>
                      Me
                    </div>
                    {/* User Info */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(0,71,62,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#00473e',
                        }}
                      >
                        <User size={28} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '16px' }}>Nguyễn Văn An</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          an.nguyen@example.com
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            backgroundColor: '#e6f3ee',
                            color: '#00473e',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '700',
                          }}
                        >
                          Khách hàng thân thiết
                        </span>
                      </div>
                    </div>

                    {/* Impact Card */}
                    <div
                      style={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        padding: '16px',
                        marginBottom: '20px',
                      }}
                    >
                      <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '12px' }}>
                        🌱 Thành tích Cứu Món
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#00473e' }}>
                            18.5 kg
                          </div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>Thực phẩm cứu</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#3b82f6' }}>
                            46.2 kg
                          </div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>Giảm CO2e</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b' }}>
                            4.82 tr ₫
                          </div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>Tiền tiết kiệm</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          📦 Đơn hàng của tôi
                        </span>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                      <div
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          🥗 Hồ sơ ăn uống & dị ứng
                        </span>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                      <div
                        onClick={() => setShowAiSheet(true)}
                        style={{
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                          ✨ Trợ lý Cứu Món AI (SaveBite)
                        </span>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMAGE 1: BOTTOM NAVIGATION BAR (Discover, Browse, Favourites, Me) */}
            <div
              style={{
                height: '60px',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '0 8px',
              }}
            >
              {[
                { id: 'discover', label: 'Discover', icon: Compass },
                { id: 'browse', label: 'Browse', icon: ShoppingBag },
                { id: 'favourites', label: 'Favourites', icon: Heart },
                { id: 'me', label: 'Me', icon: User },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = activeTab === tab.id && !selectedDeal && !showPreferences;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSelectedDeal(null);
                      setShowPreferences(false);
                      setActiveTab(tab.id as any);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      cursor: 'pointer',
                      color: isSelected ? '#00473e' : '#9ca3af',
                    }}
                  >
                    <IconComponent
                      size={22}
                      strokeWidth={isSelected ? 2.5 : 1.8}
                      fill={
                        isSelected && tab.id === 'favourites'
                          ? '#00473e'
                          : isSelected && tab.id !== 'discover'
                            ? '#00473e'
                            : 'none'
                      }
                    />
                    <span style={{ fontSize: '10px', fontWeight: isSelected ? '700' : '500' }}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* MODAL 1: CHECKOUT & 10-MIN HOLD (R1-040, R1-041) */}
            {showCheckout && selectedDeal && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  zIndex: 50,
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    width: '100%',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    padding: '20px',
                    maxHeight: '90%',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '14px',
                    }}
                  >
                    <span style={{ fontWeight: '800', fontSize: '16px' }}>
                      Giữ suất Cứu Món (10 phút)
                    </span>
                    <button
                      onClick={() => setShowCheckout(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* 10-Min Timer */}
                  <div
                    style={{
                      backgroundColor: 'rgba(0,71,62,0.1)',
                      color: '#00473e',
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '14px',
                    }}
                  >
                    <Clock size={16} />
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>
                      Thời gian giữ suất còn lại: {Math.floor(holdTimer / 60)}:
                      {(holdTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>
                    {selectedDeal.storeName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                    {selectedDeal.title}
                  </div>

                  {/* Promotion Voucher Section (R1-053) */}
                  <div
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      marginBottom: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#374151',
                        marginBottom: '8px',
                      }}
                    >
                      <Tag size={14} color="#00473e" />
                      <span>Áp dụng mã ưu đãi (R1-053)</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        placeholder="Nhập mã (SAVE15, WELCOME10K)"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      />
                      <button
                        onClick={handleApplyPromo}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: '#00473e',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Áp dụng
                      </button>
                    </div>
                    {promoFeedback && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: appliedPromo ? '#059669' : '#dc2626',
                        }}
                      >
                        {promoFeedback}
                      </div>
                    )}
                  </div>

                  {/* Price Calculation Breakdown */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px',
                      marginBottom: '14px',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#6b7280',
                        marginBottom: '4px',
                      }}
                    >
                      <span>Giá niêm yết:</span>
                      <span style={{ textDecoration: 'line-through' }}>
                        {selectedDeal.originalPrice.toLocaleString('vi-VN')} ₫
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#00473e',
                        fontWeight: '600',
                        marginBottom: '4px',
                      }}
                    >
                      <span>Giá Cứu Món:</span>
                      <span>{selectedDeal.discountPrice.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    {appliedPromo && discountAmount > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: '#059669',
                          fontWeight: '700',
                          marginBottom: '4px',
                        }}
                      >
                        <span>Giảm giá mã {appliedPromo}:</span>
                        <span>-{discountAmount.toLocaleString('vi-VN')} ₫</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '8px',
                        marginTop: '4px',
                        fontSize: '14px',
                        fontWeight: '800',
                      }}
                    >
                      <span>Tổng tiền thanh toán:</span>
                      <span style={{ color: '#00473e' }}>
                        {Math.max(0, selectedDeal.discountPrice - discountAmount).toLocaleString(
                          'vi-VN',
                        )}{' '}
                        ₫
                      </span>
                    </div>
                  </div>

                  {/* VietQR Mock */}
                  <div
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '16px',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#00473e',
                        marginBottom: '8px',
                      }}
                    >
                      MÃ VIETQR THANH TOÁN TỰ ĐỘNG
                    </div>
                    <div
                      style={{
                        width: '130px',
                        height: '130px',
                        margin: '0 auto',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <QrCode size={100} color="#111827" />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '8px' }}>
                      Nội dung CK: SUQ8921
                    </div>
                    <div
                      style={{
                        fontSize: '17px',
                        fontWeight: '800',
                        color: '#00473e',
                        marginTop: '2px',
                      }}
                    >
                      {Math.max(0, selectedDeal.discountPrice - discountAmount).toLocaleString(
                        'vi-VN',
                      )}{' '}
                      ₫
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowCheckout(false);
                      setShowPickupPass(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#00473e',
                      color: '#ffffff',
                      borderRadius: '24px',
                      fontSize: '14px',
                      fontWeight: '700',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Xác nhận đã thanh toán • Nhận Vé QR
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 2: PICKUP PASS SCREEN (R1-057, R1-060) */}
            {showPickupPass && selectedDeal && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#ffffff',
                  zIndex: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px 20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowPickupPass(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '800',
                    color: '#00473e',
                    letterSpacing: '1px',
                    marginTop: '10px',
                  }}
                >
                  VÉ NHẬN HÀNG HỢP LỆ (HMAC TOKEN)
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', margin: '6px 0 20px' }}>
                  {selectedDeal.storeName}
                </div>

                {/* QR Box */}
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    margin: '0 auto 16px',
                    border: '2px solid #00473e',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QrCode size={170} color="#00473e" />
                </div>

                {/* 6-Digit Backup PIN */}
                <div
                  style={{
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    display: 'inline-block',
                    margin: '0 auto 16px',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#111827',
                  }}
                >
                  Mã dự phòng: 7K9X2B
                </div>

                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Khung giờ nhận: {selectedDeal.pickupWindowText}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '24px' }}>
                  Đưa mã này cho nhân viên quầy để xác nhận nhận hàng.
                </div>

                <button
                  onClick={() => alert('Đã gửi thông báo cho tiệm: Khách hàng sắp đến lấy bánh!')}
                  style={{
                    backgroundColor: '#00473e',
                    color: '#ffffff',
                    borderRadius: '24px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  🚶 Báo cho quán là tôi sắp đến
                </button>
              </div>
            )}

            {/* MODAL 3: SAVEBITE AI CHAT (R1-082, R1-083, R1-088) */}
            {showAiSheet && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  zIndex: 70,
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    width: '100%',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    padding: '16px',
                    height: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} color="#00473e" />
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '15px' }}>
                          Trợ Lý Cứu Món SaveBite AI
                        </div>
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                          ● Đã kết nối trạng thái đơn hàng thời gian thực (R1-083)
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAiSheet(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Active Order Status Badge (R1-083, R1-088) */}
                  <div
                    style={{
                      backgroundColor: 'rgba(0,71,62,0.06)',
                      border: '1px solid rgba(0,71,62,0.15)',
                      borderRadius: '12px',
                      padding: '10px',
                      marginBottom: '10px',
                      fontSize: '11px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2px',
                      }}
                    >
                      <span style={{ fontWeight: '800', color: '#00473e' }}>
                        ĐƠN HÀNG HOẠT ĐỘNG #SUQ8921
                      </span>
                      <span
                        style={{
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '10px',
                        }}
                      >
                        ĐÃ THANH TOÁN
                      </span>
                    </div>
                    <div style={{ color: '#374151' }}>
                      Tiệm: <strong>Rincón del Pan</strong> (C. de Castro, 22)
                    </div>
                    <div style={{ color: '#059669', fontWeight: '700', marginTop: '2px' }}>
                      ⏰ Giờ hẹn nhận: 20:30 - 21:00 hôm nay • Quán đã đóng gói sẵn
                    </div>
                  </div>

                  {/* Quick Suggestions */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      overflowX: 'auto',
                      paddingBottom: '6px',
                      marginBottom: '8px',
                    }}
                  >
                    <button
                      onClick={() =>
                        handleSendAiMessage('Đơn hàng của tôi đang ở đâu và khi nào đến lấy được?')
                      }
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      📦 Xem tình trạng đơn
                    </button>
                    <button
                      onClick={() => handleSendAiMessage('Chỉ đường đến quán nhận hàng')}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      📍 Chỉ đường đến tiệm
                    </button>
                    <button
                      onClick={() =>
                        handleSendAiMessage('Bánh này có chứa thành phần dị ứng không?')
                      }
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      ⚠️ Cảnh báo dị ứng
                    </button>
                  </div>

                  {/* Message History */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#f9fafb',
                      borderRadius: '12px',
                      padding: '12px',
                      overflowY: 'auto',
                      fontSize: '12px',
                      lineHeight: '1.5',
                    }}
                  >
                    {aiChatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: '8px',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '85%',
                            backgroundColor: msg.sender === 'user' ? '#00473e' : '#ffffff',
                            color: msg.sender === 'user' ? '#ffffff' : '#111827',
                            border: msg.sender === 'user' ? 'none' : '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          }}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendAiMessage();
                    }}
                    style={{ display: 'flex', gap: '8px', marginTop: '10px' }}
                  >
                    <input
                      value={aiChatInput}
                      onChange={(e) => setAiChatInput(e.target.value)}
                      placeholder="Hỏi về đơn hàng, giờ nhận hoặc gợi ý món..."
                      style={{
                        flex: 1,
                        border: '1px solid #d1d5db',
                        borderRadius: '20px',
                        padding: '8px 14px',
                        fontSize: '12px',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#00473e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Gửi
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STORE OWNER WEB DASHBOARD */
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 20px' }}>
          {/* Header */}
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800' }}>
                  Cổng Quản Trị Cửa Hàng • Artisan Bakery
                </h1>
                <span className="badge badge-emerald">Gói Pro Trial • Đầy Đủ Tính Năng BRD</span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
                Hệ thống dự báo sản xuất AI, định giá động, kiểm soát hao hụt và xử lý đơn tại quầy.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowAiNotificationModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={16} />
                AI Soạn Thông Báo (R2-117)
              </button>
            </div>
          </header>

          {/* Navigation Sub-Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '12px',
              marginBottom: '24px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {[
              { id: 'forecast', label: '🔮 Dự Báo & Quyết Định (R2-037, R2-042)' },
              { id: 'reports', label: '📊 Báo Cáo Thu Hồi & Hao Hụt (R2-062)' },
              { id: 'promotions', label: '🏷️ Ưu Đãi & Hiệu Quả (R2-089, R2-090)' },
              { id: 'simulation', label: '📈 Mô Phỏng Giá (R2-105)' },
              { id: 'customers', label: '👥 Khách No-Show (R2-087)' },
              { id: 'staff', label: '📋 Kiểm Toán Nhân Viên (R2-081)' },
              { id: 'complaints', label: '💬 Phản Hồi Khiếu Nại (R2-118)' },
              { id: 'offers', label: '🏪 Suất Bán Hôm Nay' },
            ].map((tab) => {
              const isActive = merchantTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setMerchantTab(tab.id as any)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#10b981' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#ffffff' : '#9ca3af',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: DỰ BÁO SẢN XUẤT & ĐỘ TIN CẬY (R2-037, R2-042) */}
          {merchantTab === 'forecast' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                    Kế hoạch & Dự báo sản xuất ngày mai (18/10/2026)
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                    Thuật toán kết hợp chuỗi thời gian, yếu tố thời tiết và lịch sử bán thực tế
                    (R2-036..R2-043).
                  </p>
                </div>
                <span className="badge badge-emerald">Cập nhật 15 phút trước</span>
              </div>

              {/* Forecast Items Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: '20px',
                  marginBottom: '24px',
                }}
              >
                {/* Item 1: High Confidence */}
                <div className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800' }}>
                        Bánh Mì Hoa Cúc Brioche
                      </h3>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Danh mục: Bánh ngọt nướng tươi
                      </span>
                    </div>
                    <span
                      style={{
                        backgroundColor: 'rgba(16,185,129,0.15)',
                        color: '#34d399',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}
                    >
                      ĐỘ TIN CẬY: CAO (94%)
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      margin: '14px 0',
                    }}
                  >
                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>
                      45
                    </span>
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                      suất đề xuất sản xuất
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedForecastItem(selectedForecastItem === 'fc-1' ? null : 'fc-1')
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedForecastItem === 'fc-1'
                      ? 'Ẩn giải thích'
                      : '🔍 Xem giải thích dự báo (R2-037)'}
                  </button>

                  {/* Explanation Drawer (R2-037) */}
                  {selectedForecastItem === 'fc-1' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        lineHeight: '1.6',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>
                        📊 Các nhân tố tác động dự báo (R2-037):
                      </div>
                      <div>
                        • <strong>Doanh số cơ sở 7 ngày gần nhất:</strong> 38 suất/ngày.
                      </div>
                      <div>
                        • <strong>Tác động thời tiết:</strong> Dự báo nắng ráo cuối tuần, lưu lượng
                        khách tăng (+15%).
                      </div>
                      <div>
                        • <strong>Sự kiện lân cận:</strong> Phố đi bộ cuối tuần cách tiệm 400m kéo
                        thêm nhu cầu ăn vặt.
                      </div>
                      <div>
                        • <strong>Khuyến nghị:</strong> Chuẩn bị nguyên liệu lúc 6h sáng để mở bán
                        đợt 1 lúc 8h.
                      </div>
                    </div>
                  )}
                </div>

                {/* Item 2: Medium Confidence */}
                <div className="glass-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Croissant Bơ Pháp</h3>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Danh mục: Bánh ngàn lớp
                      </span>
                    </div>
                    <span
                      style={{
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        color: '#60a5fa',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}
                    >
                      ĐỘ TIN CẬY: TRUNG BÌNH (78%)
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      margin: '14px 0',
                    }}
                  >
                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#60a5fa' }}>
                      30
                    </span>
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                      suất đề xuất sản xuất
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedForecastItem(selectedForecastItem === 'fc-2' ? null : 'fc-2')
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    {selectedForecastItem === 'fc-2'
                      ? 'Ẩn giải thích'
                      : '🔍 Xem giải thích dự báo (R2-037)'}
                  </button>

                  {selectedForecastItem === 'fc-2' && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        lineHeight: '1.6',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: '#60a5fa', marginBottom: '4px' }}>
                        📊 Các nhân tố tác động dự báo (R2-037):
                      </div>
                      <div>
                        • <strong>Doanh số cơ sở:</strong> 28 suất. Mức độ ổn định đơn đặt hàng đạt
                        mức khá.
                      </div>
                      <div>
                        • <strong>Độ lệch chuẩn:</strong> ±4 suất. Khoảng an toàn dao động 26 - 34
                        suất.
                      </div>
                    </div>
                  )}
                </div>

                {/* Item 3: LOW CONFIDENCE (R2-042 Focus) */}
                <div className="glass-card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800' }}>
                        Bánh Mì Chuối Hạnh Nhân
                      </h3>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Danh mục: Bánh ngũ cốc
                      </span>
                    </div>
                    <span
                      style={{
                        backgroundColor: 'rgba(239,68,68,0.15)',
                        color: '#f87171',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}
                    >
                      ĐỘ TIN CẬY: THẤP (42%)
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '8px',
                      margin: '14px 0',
                    }}
                  >
                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#f87171' }}>
                      16
                    </span>
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                      suất đề xuất (kèm cảnh báo)
                    </span>
                  </div>

                  {/* Low Confidence Warning & Actionable Fallbacks (R2-042) */}
                  <div
                    style={{
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '10px',
                      padding: '12px',
                      marginBottom: '12px',
                      fontSize: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#f87171',
                        fontWeight: '800',
                        marginBottom: '6px',
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>CẢNH BÁO ĐỘ TIN CẬY KÉM (R2-042)</span>
                    </div>
                    <div style={{ color: '#d1d5db', marginBottom: '10px', lineHeight: '1.4' }}>
                      Doanh số món này 7 ngày qua dao động mạnh (8 - 26 suất) và thiếu dữ liệu ngày
                      tương đương. Vui lòng chọn 1 trong 3 phương án dự phòng an toàn bên dưới:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button
                        onClick={() =>
                          setFallbackChosen(
                            'Phương án 1: Đã chọn áp dụng doanh số thực tế ngày hôm qua (22 suất).',
                          )
                        }
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        👉 [PA 1] Dùng doanh số thực tế hôm qua (22 suất)
                      </button>
                      <button
                        onClick={() =>
                          setFallbackChosen(
                            'Phương án 2: Đã chọn cận dưới an toàn (12 suất) để hạn chế tối đa nguy cơ tồn hủy.',
                          )
                        }
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        👉 [PA 2] Lấy cận dưới an toàn (12 suất) để chống hao hụt
                      </button>
                      <button
                        onClick={() => {
                          const val = prompt('Nhập số lượng bạn muốn sản xuất thủ công:', '15');
                          if (val)
                            setFallbackChosen(
                              `Phương án 3: Chủ quán đã ghi đè số lượng sản xuất thành ${val} suất (R2-041).`,
                            );
                        }}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        👉 [PA 3] Tự nhập số lượng kế hoạch thủ công (Override)
                      </button>
                    </div>

                    {fallbackChosen && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px',
                          backgroundColor: 'rgba(16,185,129,0.2)',
                          color: '#34d399',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '11px',
                        }}
                      >
                        ✓ {fallbackChosen}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BÁO CÁO HAO HỤT VÀ THU HỒI TÁCH BẠCH (R2-062) */}
          {merchantTab === 'reports' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                  Báo Cáo Hao Hụt & Thu Hồi Phân Tách (R2-062)
                </h2>
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                  Số liệu được bóc tách độc lập hoàn toàn giữa thực phẩm giải cứu thành công và thực
                  phẩm hao hụt quá hạn.
                </p>
              </div>

              {/* Two Column Separated Reports */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Column 1: Recovery Report */}
                <div className="glass-card" style={{ borderTop: '4px solid #10b981' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <TrendingUp size={22} color="#10b981" />
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#34d399' }}>
                        BÁO CÁO THU HỒI (RECOVERY)
                      </h3>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Thực phẩm cứu thành công qua SurplusIQ
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Doanh thu thu hồi</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#34d399',
                          marginTop: '4px',
                        }}
                      >
                        4.820.000 ₫
                      </div>
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                        +18.4% so với tháng trước
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Số suất đã giải cứu</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#ffffff',
                          marginTop: '4px',
                        }}
                      >
                        68 suất
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Tỷ lệ bán hết: 91.2%
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Khối lượng thực phẩm</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#60a5fa',
                          marginTop: '4px',
                        }}
                      >
                        124.5 kg
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Giảm 311.2 kg CO2e
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Tỷ lệ thu hồi tổng</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#fbbf24',
                          marginTop: '4px',
                        }}
                      >
                        82.9%
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Vượt mục tiêu 80%
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(16,185,129,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#d1fae5',
                    }}
                  >
                    💡 <strong>Điểm sáng:</strong> Giờ vàng mở bán lúc 20:30 thu hút đông khách
                    nhất. Các suất Túi Bất Ngờ bán hết trung bình chỉ sau 18 phút.
                  </div>
                </div>

                {/* Column 2: Waste Report */}
                <div className="glass-card" style={{ borderTop: '4px solid #ef4444' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <TrendingDown size={22} color="#ef4444" />
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#f87171' }}>
                        BÁO CÁO HAO HỤT (WASTE)
                      </h3>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Thực phẩm quá hạn không tiêu thụ được
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      marginBottom: '16px',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Số suất phải hủy</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#f87171',
                          marginTop: '4px',
                        }}
                      >
                        14 suất
                      </div>
                      <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>
                        17.1% tổng lượng dư
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Chi phí thất thoát (COGS)
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#f87171',
                          marginTop: '4px',
                        }}
                      >
                        420.000 ₫
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Trung bình 30.000 đ/suất
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Khối lượng hao hụt</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#ffffff',
                          marginTop: '4px',
                        }}
                      >
                        8.4 kg
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                        Giảm 3.2 kg so với tuần trước
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        padding: '14px',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Mức giảm hao hụt</div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '800',
                          color: '#34d399',
                          marginTop: '4px',
                        }}
                      >
                        -28.5%
                      </div>
                      <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                        Tiến bộ vượt bậc
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(239,68,68,0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#fee2e2',
                    }}
                  >
                    ⚠️ <strong>Nguyên nhân hao hụt chính:</strong> Món bánh chuối thường còn dư vào
                    tối thứ 4. Khuyến nghị: Giảm 4 suất sản xuất bánh chuối vào các ngày giữa tuần.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: KIỂM TOÁN HOẠT ĐỘNG NHÂN VIÊN (R2-081) */}
          {merchantTab === 'staff' && (
            <div className="glass-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                    Nhật Ký Hoạt Động & Kiểm Toán Nhân Viên (R2-081)
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                    Chủ quán có thể chọn xem riêng hoạt động của từng nhân viên cụ thể theo quy định
                    kiểm toán.
                  </p>
                </div>

                {/* Staff Filter Dropdown (R2-081) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="#9ca3af" />
                  <span style={{ fontSize: '13px', color: '#d1d5db', fontWeight: '600' }}>
                    Lọc theo nhân viên:
                  </span>
                  <select
                    value={staffFilter}
                    onChange={(e) => setStaffFilter(e.target.value as any)}
                    style={{
                      backgroundColor: '#1f2937',
                      color: '#ffffff',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="ALL">-- Tất cả nhân viên (Hiển thị chung) --</option>
                    <option value="AN">Trần Văn An (Chủ quán • Quản lý)</option>
                    <option value="BINH">Lê Thị Bình (Thu ngân ca sáng)</option>
                    <option value="CUONG">Phạm Minh Cường (Nhân viên quầy ca tối)</option>
                  </select>
                </div>
              </div>

              {/* Audit Table */}
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                    >
                      <th style={{ padding: '12px' }}>Thời gian</th>
                      <th style={{ padding: '12px' }}>Nhân viên thực hiện</th>
                      <th style={{ padding: '12px' }}>Hành động</th>
                      <th style={{ padding: '12px' }}>Chi tiết thao tác</th>
                      <th style={{ padding: '12px' }}>Thiết bị / IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        time: '18:12:05 17/10',
                        actor: 'CUONG',
                        actorName: 'Phạm Minh Cường',
                        role: 'Nhân viên quầy',
                        action: 'QUÉT_VÉ_QR',
                        detail: 'Xác thực thành công vé nhận hàng đơn #SUQ8921 (khách đưa mã QR)',
                        ip: '192.168.1.15 (Tablet Quầy)',
                      },
                      {
                        time: '17:45:20 17/10',
                        actor: 'AN',
                        actorName: 'Trần Văn An',
                        role: 'Chủ quán',
                        action: 'CHỈNH_SỬA_ƯU_ĐÃI',
                        detail: 'Cập nhật mã giảm giá SAVE15 từ 10% lên 15% (R2-090)',
                        ip: '113.161.42.10 (Laptop Quản lý)',
                      },
                      {
                        time: '16:30:10 17/10',
                        actor: 'AN',
                        actorName: 'Trần Văn An',
                        role: 'Chủ quán',
                        action: 'MÔ_PHỎNG_GIÁ',
                        detail: 'Chạy thử nghiệm mô phỏng chính sách giá 30 ngày (R2-105)',
                        ip: '113.161.42.10 (Laptop Quản lý)',
                      },
                      {
                        time: '14:20:00 17/10',
                        actor: 'BINH',
                        actorName: 'Lê Thị Bình',
                        role: 'Thu ngân',
                        action: 'CẬP_NHẬT_TỒN_KHO',
                        detail: 'Khai báo mở bán 4 suất Túi Bất Ngờ ca chiều',
                        ip: '192.168.1.12 (Máy POS 01)',
                      },
                      {
                        time: '11:15:30 17/10',
                        actor: 'BINH',
                        actorName: 'Lê Thị Bình',
                        role: 'Thu ngân',
                        action: 'QUÉT_VÉ_QR',
                        detail: 'Xác thực mã PIN 6 số dự phòng đơn #SUQ8740',
                        ip: '192.168.1.12 (Máy POS 01)',
                      },
                      {
                        time: '08:00:15 17/10',
                        actor: 'AN',
                        actorName: 'Trần Văn An',
                        role: 'Chủ quán',
                        action: 'ĐĂNG_NHẬP',
                        detail: 'Đăng nhập cổng quản trị cửa hàng SurplusIQ',
                        ip: '113.161.42.10 (Laptop Quản lý)',
                      },
                    ]
                      .filter((row) => staffFilter === 'ALL' || row.actor === staffFilter)
                      .map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', color: '#9ca3af' }}>{row.time}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '700' }}>{row.actorName}</div>
                            <div style={{ fontSize: '11px', color: '#10b981' }}>{row.role}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                              }}
                            >
                              {row.action}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#d1d5db' }}>{row.detail}</td>
                          <td style={{ padding: '12px', color: '#9ca3af', fontSize: '11px' }}>
                            {row.ip}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: KHÁCH HÀNG THƯỜNG XUYÊN NO-SHOW (R2-087) */}
          {merchantTab === 'customers' && (
            <div className="glass-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                    Danh Sách Khách Hàng Thường Xuyên No-Show (R2-087)
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                    Tách riêng nhóm khách hàng đặt giữ món nhưng không đến nhận (tuân thủ nguyên tắc
                    ẩn danh BR-083 & chế tài khóa 24h BR-020).
                  </p>
                </div>
                <span className="badge badge-amber">3 tài khoản trong danh sách cảnh báo</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af' }}
                    >
                      <th style={{ padding: '12px' }}>Mã Khách Hàng (Ẩn danh BR-083)</th>
                      <th style={{ padding: '12px' }}>Số lần No-Show</th>
                      <th style={{ padding: '12px' }}>Lần vi phạm gần nhất</th>
                      <th style={{ padding: '12px' }}>Thiệt hại tiền hàng</th>
                      <th style={{ padding: '12px' }}>Trạng thái chế tài (BR-020)</th>
                      <th style={{ padding: '12px' }}>Hành động xử lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        code: 'KH-***82',
                        count: 3,
                        lastTime: 'Hôm qua 21:05',
                        lostMoney: '89.700 ₫',
                        status: 'ĐANG KHÓA ĐẶT 24H (BR-020)',
                        badgeColor: '#ef4444',
                      },
                      {
                        code: 'KH-***15',
                        count: 2,
                        lastTime: '15/10/2026',
                        lostMoney: '59.800 ₫',
                        status: 'CẢNH BÁO MỨC 2',
                        badgeColor: '#f59e0b',
                      },
                      {
                        code: 'KH-***94',
                        count: 2,
                        lastTime: '12/10/2026',
                        lostMoney: '74.500 ₫',
                        status: 'CẢNH BÁO MỨC 2',
                        badgeColor: '#f59e0b',
                      },
                    ].map((cust, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: '800', color: '#60a5fa' }}>
                          {cust.code}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '700', color: '#f87171' }}>
                          {cust.count} lần bỏ đơn
                        </td>
                        <td style={{ padding: '12px', color: '#9ca3af' }}>{cust.lastTime}</td>
                        <td style={{ padding: '12px', fontWeight: '700' }}>{cust.lostMoney}</td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              color: cust.badgeColor,
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '800',
                            }}
                          >
                            {cust.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() =>
                                alert(`Đã gửi thông báo nhắc nhở qua App đến ${cust.code}!`)
                              }
                              style={{
                                padding: '6px 10px',
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              Nhắc nhở
                            </button>
                            <button
                              onClick={() =>
                                alert(`Đã xem xét lý do và gỡ chế tài khóa đặt cho ${cust.code}.`)
                              }
                              style={{
                                padding: '6px 10px',
                                backgroundColor: '#00473e',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              Gỡ khóa sớm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ƯU ĐÃI, HIỆU QUẢ & AI SOẠN PUSH (R2-089, R2-090, R2-117) */}
          {merchantTab === 'promotions' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                    Chương Trình Khuyến Mãi & Hiệu Quả Doanh Thu (R2-089, R2-090)
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                    Theo dõi số lượt dùng, doanh thu phát sinh và tỷ lệ chuyển đổi của từng chương
                    trình ưu đãi.
                  </p>
                </div>
                <button
                  onClick={() => setShowAiNotificationModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={16} />
                  AI Soạn Nội Dung Thông Báo (R2-117)
                </button>
              </div>

              {/* Promotions Cards Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '20px',
                }}
              >
                {promotionsList.map((promo) => (
                  <div key={promo.id} className="glass-card">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '800' }}>{promo.name}</span>
                          <span
                            style={{
                              backgroundColor: 'rgba(16,185,129,0.15)',
                              color: '#34d399',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                            }}
                          >
                            {promo.code}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          Hạn dùng đến: {promo.expiresAt}
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor:
                            promo.status === 'ACTIVE'
                              ? 'rgba(16,185,129,0.2)'
                              : 'rgba(156,163,175,0.2)',
                          color: promo.status === 'ACTIVE' ? '#34d399' : '#9ca3af',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '800',
                        }}
                      >
                        {promo.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'TẠM DỪNG'}
                      </span>
                    </div>

                    {/* Effectiveness Analytics Block (R2-089) */}
                    <div
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#10b981',
                          marginBottom: '8px',
                        }}
                      >
                        📊 SỐ LIỆU HIỆU QUẢ KINH DOANH (R2-089):
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <div style={{ color: '#9ca3af' }}>Số đơn áp dụng:</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                            {promo.usedCount} đơn
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Doanh thu tạo ra:</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24' }}>
                            {promo.revenueGenerated.toLocaleString('vi-VN')} ₫
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Tiền giảm đã chi:</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#f87171' }}>
                            -{promo.totalDiscountGiven.toLocaleString('vi-VN')} ₫
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#9ca3af' }}>Tỷ lệ chuyển đổi:</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399' }}>
                            {promo.conversionRate}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Edit Content (R2-090) & Toggle */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setEditingPromo(promo)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '10px',
                          backgroundColor: '#00473e',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        <Edit3 size={14} />
                        Sửa nội dung (R2-090)
                      </button>
                      <button
                        onClick={() => {
                          setPromotionsList((prev) =>
                            prev.map((p) =>
                              p.id === promo.id
                                ? { ...p, status: p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
                                : p,
                            ),
                          );
                        }}
                        style={{
                          padding: '10px 14px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        {promo.status === 'ACTIVE' ? 'Tạm dừng' : 'Kích hoạt'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* MODAL EDIT PROMOTION (R2-090) */}
              {editingPromo && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 90,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '24px',
                      width: '100%',
                      maxWidth: '480px',
                      color: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                        Chỉnh Sửa Ưu Đãi (R2-090)
                      </h3>
                      <button
                        onClick={() => setEditingPromo(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#9ca3af',
                          marginBottom: '4px',
                        }}
                      >
                        Tên chương trình:
                      </label>
                      <input
                        value={editingPromo.name}
                        onChange={(e) => setEditingPromo({ ...editingPromo, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            color: '#9ca3af',
                            marginBottom: '4px',
                          }}
                        >
                          Mã Voucher:
                        </label>
                        <input
                          value={editingPromo.code}
                          onChange={(e) =>
                            setEditingPromo({ ...editingPromo, code: e.target.value.toUpperCase() })
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '700',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '12px',
                            color: '#9ca3af',
                            marginBottom: '4px',
                          }}
                        >
                          Mức giảm (%):
                        </label>
                        <input
                          type="number"
                          value={editingPromo.discountPercent}
                          onChange={(e) =>
                            setEditingPromo({
                              ...editingPromo,
                              discountPercent: Number(e.target.value),
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '13px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#9ca3af',
                          marginBottom: '4px',
                        }}
                      >
                        Ngày hết hạn:
                      </label>
                      <input
                        type="date"
                        value={editingPromo.expiresAt}
                        onChange={(e) =>
                          setEditingPromo({ ...editingPromo, expiresAt: e.target.value })
                        }
                        style={{
                          width: '100%',
                          padding: '10px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setEditingPromo(null)}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: 'transparent',
                          border: '1px solid #4b5563',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => {
                          setPromotionsList((prev) =>
                            prev.map((p) => (p.id === editingPromo.id ? editingPromo : p)),
                          );
                          setEditingPromo(null);
                          alert(
                            'Đã cập nhật nội dung chương trình khuyến mãi thành công (R2-090)!',
                          );
                        }}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#10b981',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL AI NOTIFICATION DRAFTER (R2-117) */}
              {showAiNotificationModal && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 90,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '24px',
                      width: '100%',
                      maxWidth: '520px',
                      color: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#10b981" />
                        <h3 style={{ fontSize: '17px', fontWeight: '800' }}>
                          AI Soạn Nội Dung Thông Báo Push (R2-117)
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowAiNotificationModal(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>
                      Nhập ý tưởng khuyến mãi hoặc món muốn đẩy bán, AI sẽ tự động tạo tiêu đề giật
                      tít và lời nhắn kích cầu gửi đến khách hàng gần quán.
                    </div>

                    <input
                      value={aiDraftPrompt}
                      onChange={(e) => setAiDraftPrompt(e.target.value)}
                      placeholder="Ví dụ: Giảm 30% bánh sừng bò sau 20h30..."
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '13px',
                        marginBottom: '12px',
                      }}
                    />

                    <button
                      onClick={() => {
                        setAiDraftResult(
                          `🥐 [SurplusIQ x Artisan Bakery]: Chỉ còn 4 suất Bánh Sừng Bò Kem Bơ giòn rụm tối nay! Giảm sốc 30% khi đặt giữ chỗ ngay trên app. Khung giờ nhận: 20:30 - 21:00. Đừng để lãng phí món ngon bạn nhé!`,
                        );
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        marginBottom: '16px',
                      }}
                    >
                      ✨ Tạo bản thảo thông báo
                    </button>

                    {aiDraftResult && (
                      <div
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          borderRadius: '10px',
                          padding: '14px',
                          border: '1px solid rgba(16,185,129,0.3)',
                          marginBottom: '16px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#34d399',
                            marginBottom: '6px',
                          }}
                        >
                          NỘI DUNG AI ĐÃ SOẠN SẴN:
                        </div>
                        <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#e5e7eb' }}>
                          {aiDraftResult}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setShowAiNotificationModal(false)}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: 'transparent',
                          border: '1px solid #4b5563',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Đóng
                      </button>
                      {aiDraftResult && (
                        <button
                          onClick={() => {
                            alert(
                              'Đã lên lịch gửi thông báo push thành công đến 142 khách hàng trong bán kính 1.5km!',
                            );
                            setShowAiNotificationModal(false);
                          }}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#00473e',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                        >
                          🚀 Lên lịch gửi chiến dịch
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: MÔ PHỎNG GIÁ & SO SÁNH PHƯƠNG ÁN (R2-105) */}
          {merchantTab === 'simulation' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                    Công Cụ Thử Nghiệm Chính Sách Giá & Lưu Trữ So Sánh (R2-105)
                  </h2>
                  <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                    Cho phép chủ quán chạy thử nghiệm nhiều phương án chiết khấu, lưu lại từng lần
                    thử và đối chiếu so sánh side-by-side.
                  </p>
                </div>
                <button
                  onClick={() => setShowSimCompare(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <BarChart3 size={16} />
                  So Sánh Đối Chiếu Các Lần Thử (R2-105)
                </button>
              </div>

              {/* Simulation Playground Card */}
              <div className="glass-card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px' }}>
                  ⚙️ Thiết lập thông số mô phỏng mới
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    gap: '16px',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginBottom: '4px',
                      }}
                    >
                      Dữ liệu quá khứ:
                    </label>
                    <select
                      value={simPeriodDays}
                      onChange={(e) => setSimPeriodDays(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '13px',
                      }}
                    >
                      <option value={14}>14 ngày gần nhất</option>
                      <option value={30}>30 ngày gần nhất (Khuyên dùng)</option>
                      <option value={60}>60 ngày gần nhất</option>
                      <option value={90}>90 ngày gần nhất</option>
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginBottom: '4px',
                      }}
                    >
                      Chiết khấu giả định:{' '}
                      <strong style={{ color: '#10b981' }}>{simDiscount}%</strong>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={70}
                      value={simDiscount}
                      onChange={(e) => setSimDiscount(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#10b981' }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginBottom: '4px',
                      }}
                    >
                      Cơ chế định giá động:
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={simDynamicPricing}
                        onChange={(e) => setSimDynamicPricing(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                      />
                      <span>Tự động giảm dần theo giờ</span>
                    </label>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        const newRun = {
                          id: `sim-${Date.now()}`,
                          title: `Thử nghiệm C (${simPeriodDays} ngày, Giảm ${simDiscount}%, Định giá động: ${simDynamicPricing ? 'BẬT' : 'TẮT'})`,
                          days: simPeriodDays,
                          discount: simDiscount,
                          dynamicPricing: simDynamicPricing,
                          simulatedRevenue: Math.round(
                            3500000 * (1 + (simDynamicPricing ? 0.25 : 0.14)),
                          ),
                          revenueGainPercent: simDynamicPricing ? 25 : 14,
                          salvagedPortions: Math.round(50 * (1 + simDiscount / 100)),
                          createdAt: 'Vừa xong',
                        };
                        setSimRuns([newRun, ...simRuns]);
                        alert(
                          `Đã hoàn tất mô phỏng và lưu vào lịch sử: +${newRun.revenueGainPercent}% doanh thu!`,
                        );
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      ▶ Chạy & Lưu kết quả
                    </button>
                  </div>
                </div>
              </div>

              {/* Saved Simulation Runs History List (R2-105) */}
              <div className="glass-card">
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '14px' }}>
                  📋 Lịch sử các lần thử nghiệm đã lưu (R2-105)
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {simRuns.map((run) => (
                    <div
                      key={run.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '14px 18px',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '14px' }}>{run.title}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                          Thời gian chạy: {run.createdAt} • Chiết khấu {run.discount}% •{' '}
                          {run.dynamicPricing ? 'Có định giá động' : 'Giá cố định'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399' }}>
                          {run.simulatedRevenue.toLocaleString('vi-VN')} ₫
                        </div>
                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: '700' }}>
                          +{run.revenueGainPercent}% doanh thu • {run.salvagedPortions} suất cứu
                          được
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MODAL COMPARE SIMULATION RUNS (R2-105) */}
              {showSimCompare && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 90,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      padding: '24px',
                      width: '100%',
                      maxWidth: '720px',
                      color: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart3 size={20} color="#3b82f6" />
                        <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                          Bảng So Sánh Đối Chiếu 2 Lần Thử Giá (R2-105)
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowSimCompare(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '20px',
                      }}
                    >
                      {/* Option A */}
                      <div
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.04)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                          }}
                        >
                          PHƯƠNG ÁN A
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '8px 0 12px' }}>
                          {simRuns[0].title}
                        </h4>
                        <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                          <div>
                            • Doanh thu ước tính:{' '}
                            <strong>{simRuns[0].simulatedRevenue.toLocaleString('vi-VN')} ₫</strong>
                          </div>
                          <div>
                            • Tăng trưởng doanh thu:{' '}
                            <strong style={{ color: '#fbbf24' }}>
                              +{simRuns[0].revenueGainPercent}%
                            </strong>
                          </div>
                          <div>
                            • Số suất cứu thêm: <strong>{simRuns[0].salvagedPortions} suất</strong>
                          </div>
                          <div>
                            • Định giá động:{' '}
                            <strong>{simRuns[0].dynamicPricing ? 'BẬT' : 'TẮT'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Option B */}
                      <div
                        style={{
                          backgroundColor: 'rgba(16,185,129,0.08)',
                          borderRadius: '12px',
                          padding: '16px',
                          border: '2px solid #10b981',
                        }}
                      >
                        <span
                          style={{
                            backgroundColor: '#10b981',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          PHƯƠNG ÁN B (TỐI ƯU NHẤT)
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '8px 0 12px' }}>
                          {simRuns[1].title}
                        </h4>
                        <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                          <div>
                            • Doanh thu ước tính:{' '}
                            <strong style={{ color: '#34d399' }}>
                              {simRuns[1].simulatedRevenue.toLocaleString('vi-VN')} ₫
                            </strong>
                          </div>
                          <div>
                            • Tăng trưởng doanh thu:{' '}
                            <strong style={{ color: '#34d399' }}>
                              +{simRuns[1].revenueGainPercent}%
                            </strong>
                          </div>
                          <div>
                            • Số suất cứu thêm: <strong>{simRuns[1].salvagedPortions} suất</strong>
                          </div>
                          <div>
                            • Định giá động:{' '}
                            <strong>{simRuns[1].dynamicPricing ? 'BẬT' : 'TẮT'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation Card */}
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.2)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        color: '#bfdbfe',
                        marginBottom: '16px',
                      }}
                    >
                      🏆 <strong>Kết luận so sánh:</strong> Phương án B với mức chiết khấu 45% kết
                      hợp Định giá động mang lại doanh thu thu hồi vượt trội hơn (+12% chênh lệch so
                      với Phương án A), đồng thời giải cứu thêm 24 suất bánh tươi khỏi bị tiêu hủy.
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setShowSimCompare(false)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#3b82f6',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '13px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Đã hiểu kết quả
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PHẢN HỒI KHIẾU NẠI & AI DRAFTING (R2-118) */}
          {merchantTab === 'complaints' && (
            <div className="glass-card">
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
                  Chăm Sóc Khách Hàng & AI Gợi Ý Phản Hồi Khiếu Nại (R2-118)
                </h2>
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                  AI hỗ trợ soạn sẵn phản hồi lịch sự, đưa ra các phương án giải quyết (hoàn tiền
                  BR-054, từ chối theo điều khoản BR-056, hoặc tặng voucher).
                </p>
              </div>

              {selectedComplaint && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Left: Customer Complaint Detail */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      padding: '18px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>
                        Khiếu nại đơn hàng #{selectedComplaint.orderCode}
                      </span>
                      <span
                        style={{
                          backgroundColor: 'rgba(245,158,11,0.2)',
                          color: '#fbbf24',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                        }}
                      >
                        CHỜ XỬ LÝ
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                      Người gửi: <strong>{selectedComplaint.customerName}</strong>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#f87171',
                        fontWeight: '700',
                        marginBottom: '8px',
                      }}
                    >
                      Lý do: {selectedComplaint.reason}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        color: '#d1d5db',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        padding: '12px',
                        borderRadius: '8px',
                        lineHeight: '1.5',
                      }}
                    >
                      "{selectedComplaint.detail}"
                    </div>
                  </div>

                  {/* Right: AI Reply Generator (R2-118) */}
                  <div
                    style={{
                      backgroundColor: 'rgba(16,185,129,0.05)',
                      borderRadius: '12px',
                      padding: '18px',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}
                    >
                      <Sparkles size={18} color="#10b981" />
                      <span style={{ fontSize: '15px', fontWeight: '800' }}>
                        AI Gợi Ý Soạn Phản Hồi (R2-118)
                      </span>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#9ca3af',
                          marginBottom: '6px',
                        }}
                      >
                        Chọn phương án giải quyết:
                      </label>
                      <div
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}
                      >
                        {[
                          { id: 'REFUND', label: '1. Hoàn tiền ví (BR-054)' },
                          { id: 'REJECT', label: '2. Từ chối theo quy định (BR-056)' },
                          { id: 'APOLOGY', label: '3. Xin lỗi & Tặng voucher' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              setAiReplyOption(opt.id as any);
                              if (opt.id === 'REFUND') {
                                setAiGeneratedReply(
                                  `Chào bạn, Artisan Bakery chân thành xin lỗi vì suất bánh chưa đạt độ giòn ưng ý lúc nhận hàng. Để bạn có trải nghiệm tốt hơn, tiệm đã hoàn 100% tiền đơn hàng (${(29900).toLocaleString('vi-VN')} ₫) vào ví SurplusIQ của bạn, kèm mã ưu đãi "SORRY10K" giảm 10k cho lần đặt tới. Cảm ơn bạn đã đồng hành cứu thực phẩm cùng tiệm!`,
                                );
                              } else if (opt.id === 'REJECT') {
                                setAiGeneratedReply(
                                  `Chào bạn, Artisan Bakery rất tiếc về cảm nhận của bạn. Theo quy chế bán hàng Cứu Món cuối ngày (BR-056), bánh được nướng tươi trong ngày và bán giảm giá sâu vào khung giờ chót, nên độ giòn có thể giảm nhẹ sau 20h. Tiệm rất mong bạn thông cảm và xin gửi tặng bạn mẹo hâm nóng lại bánh giòn tan trong 3 phút bằng nồi chiên không dầu nhé!`,
                                );
                              } else {
                                setAiGeneratedReply(
                                  `Chào bạn, tiệm đã ghi nhận phản hồi và nhắc nhở nhân viên quầy ca tối bảo quản bánh cẩn thận hơn. Tiệm xin gửi tặng bạn voucher GIAM15K cho lần ghé tiếp theo. Rất mong tiếp tục được phục vụ bạn!`,
                                );
                              }
                            }}
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              backgroundColor:
                                aiReplyOption === opt.id ? '#10b981' : 'rgba(255,255,255,0.08)',
                              color: '#ffffff',
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Draft Textarea */}
                    <textarea
                      rows={5}
                      value={
                        aiGeneratedReply ||
                        'Bấm chọn 1 trong 3 phương án ở trên để AI tự động soạn thảo phản hồi lịch sự...'
                      }
                      onChange={(e) => setAiGeneratedReply(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        padding: '12px',
                        color: '#ffffff',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        marginBottom: '12px',
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => {
                          alert(
                            'Đã gửi phản hồi chính thức cho khách hàng qua ứng dụng SurplusIQ!',
                          );
                          setSelectedComplaint(null);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: '#10b981',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        <Send size={14} />
                        Gửi phản hồi cho khách
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SUẤT BÁN HÔM NAY (OFFERS) */}
          {merchantTab === 'offers' && (
            <div className="glass-card">
              <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                Các suất đang mở bán hôm nay
              </h2>
              <div style={{ display: 'grid', gap: '14px' }}>
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{deal.title}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        {deal.pickupWindowText}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399' }}>
                        {deal.discountPrice.toLocaleString('vi-VN')} ₫
                      </div>
                      <span className="badge badge-amber">Còn {deal.remainingStock} suất</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
