import React, { useState, useEffect } from 'react';
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
  Share2,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Filter,
  Play,
  TrendingDown,
  DollarSign,
  Leaf,
  ChevronDown,
  CheckCircle2,
  Calendar,
  AlertCircle
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
    storeLogoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=160&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    title: 'Túi Bất Ngờ • Magic Bag',
    whatYouCouldGet: 'Salva Comida en Rincón del Pan y tu Pack Sorpresa podrá contener variedad de bollería y otros productos tanto dulces como salados nướng tươi trong ngày.',
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
    storeLogoUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=160&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&auto=format&fit=crop&q=80',
    title: 'Magic Bag • Bánh Sừng Bò & Tart',
    whatYouCouldGet: 'Gồm 2-3 phần bánh sừng bò kem bơ Pháp giòn rụm và bánh tart trái cây ngọt ngào.',
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
    storeLogoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=160&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
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
    storeLogoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=160&auto=format&fit=crop&q=80',
    coverImageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
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
  const [activeTab, setActiveTab] = useState<'discover' | 'browse' | 'favourites' | 'me'>('discover');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showPickupPass, setShowPickupPass] = useState(false);
  const [showFavoriteToast, setShowFavoriteToast] = useState(false);
  const [showAiSheet, setShowAiSheet] = useState(false);

  // Preferences State (Matching Image 2 Screen 2)
  const [filterMatchingOnly, setFilterMatchingOnly] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Meals', 'Baked goods', 'Groceries', 'Other']);
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
      })
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1d', color: '#f9fafb', fontFamily: 'sans-serif' }}>
      {/* Top Switcher Navigation */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        backgroundColor: '#111827',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>SurplusIQ</span>
          <span className="badge badge-emerald">Vừa Đủ • Bán Hết Trong Ngày</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
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
              color: '#ffffff'
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
              color: '#ffffff'
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
          <div style={{
            width: '390px',
            minHeight: '844px',
            backgroundColor: '#ffffff',
            color: '#111827',
            borderRadius: '44px',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.7), 0 0 0 10px #1f2937',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}>
            {/* Phone Top Notch */}
            <div style={{
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
              borderTopRightRadius: '44px'
            }}>
              <span>12:15</span>
              <div style={{ width: '120px', height: '20px', backgroundColor: '#000000', borderRadius: '10px' }} />
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px' }}>5G</span>
                <span>●</span>
              </div>
            </div>

            {/* SCREEN 1: DEAL DETAIL SCREEN (Matching Image 2 Screen 1) */}
            {selectedDeal ? (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Hero Cover Image */}
                <div style={{ position: 'relative', width: '100%', height: '240px' }}>
                  <img
                    src={selectedDeal.coverImageUrl}
                    alt={selectedDeal.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Top Floating Buttons */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
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
                        cursor: 'pointer'
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
                        cursor: 'pointer'
                      }}
                    >
                      <Heart size={18} fill={selectedDeal.isFavorite ? '#ef4444' : 'none'} />
                    </button>
                  </div>

                  {/* Toast: "Great! This store was added to your list of favourites" (Image 2 Screen 1) */}
                  {showFavoriteToast && (
                    <div style={{
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
                      zIndex: 10
                    }}>
                      <Heart size={16} fill="#ef4444" color="#ef4444" />
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#111827' }}>
                        Great! This store was added to your list of favourites
                      </span>
                    </div>
                  )}

                  {/* Badge: "2 left" */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '16px',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    {selectedDeal.remainingStock} left
                  </div>
                </div>

                {/* Content Details */}
                <div style={{ padding: '16px', flex: 1 }}>
                  {/* Store Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <img
                      src={selectedDeal.storeLogoUrl}
                      alt={selectedDeal.storeName}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '15px' }}>{selectedDeal.storeName}</span>
                  </div>

                  {/* Title & Price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>{selectedDeal.title}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', textDecoration: 'line-through', color: '#9ca3af' }}>
                        {selectedDeal.originalPrice.toLocaleString('vi-VN')} ₫
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#00473e' }}>
                        {selectedDeal.discountPrice.toLocaleString('vi-VN')} ₫
                      </div>
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#00473e', fontWeight: '700', marginBottom: '12px' }}>
                    <Star size={15} fill="#00473e" />
                    <span>{selectedDeal.rating} ({selectedDeal.reviewCount})</span>
                  </div>

                  {/* Highlighted Red Box: Collection Time (Image 2 Screen 1) */}
                  <div style={{
                    border: '1.5px solid #ef4444',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgba(239,68,68,0.03)',
                    marginBottom: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} color="#ef4444" />
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                        {selectedDeal.pickupWindowText}
                      </span>
                    </div>
                    <span style={{ backgroundColor: '#00473e', color: '#ffffff', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px' }}>
                      Today
                    </span>
                  </div>

                  {/* Address */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4b5563', marginBottom: '14px' }}>
                    <MapPin size={16} color="#00473e" />
                    <div style={{ flex: 1 }}>
                      <div>{selectedDeal.storeAddress}</div>
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>More information about the store &gt;</span>
                    </div>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

                  {/* WHAT YOU COULD GET */}
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#6b7280', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    WHAT YOU COULD GET
                  </div>
                  <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.4', marginBottom: '10px' }}>
                    {selectedDeal.whatYouCouldGet}
                  </p>
                  <span style={{ display: 'inline-block', backgroundColor: 'rgba(0,71,62,0.1)', color: '#00473e', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    {selectedDeal.category}
                  </span>

                  <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '14px 0' }} />

                  {/* Ingredients & allergens */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700' }}>Ingredients & allergens</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{selectedDeal.allergens.join(', ')}</div>
                    </div>
                    <ChevronRight size={16} color="#9ca3af" />
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '14px 0' }} />

                  {/* WHAT OTHER PEOPLE ARE SAYING */}
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#6b7280', letterSpacing: '0.5px', marginBottom: '6px' }}>
                    WHAT OTHER PEOPLE ARE SAYING
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>
                    <Star size={18} fill="#00473e" color="#00473e" />
                    <span>{selectedDeal.rating} / 5.0</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#00473e', fontWeight: '700' }}>
                    TOP 3 HIGHLIGHTS: Bánh tươi ngon • Tiệm nhiệt tình • Tiết kiệm sâu
                  </div>
                </div>

                {/* Sticky Reserve CTA Button */}
                <div style={{
                  position: 'sticky',
                  bottom: 0,
                  backgroundColor: '#ffffff',
                  padding: '12px 16px',
                  boxShadow: '0 -4px 16px rgba(0,0,0,0.06)'
                }}>
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
                      cursor: 'pointer'
                    }}
                  >
                    Reserve
                  </button>
                </div>
              </div>
            ) : showPreferences ? (
              /* SCREEN 2: PREFERENCES SCREEN (Matching Image 2 Screen 2) */
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
                  <button onClick={() => setShowPreferences(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    <ArrowLeft size={20} />
                  </button>
                  <span style={{ fontSize: '16px', fontWeight: '700' }}>Preferences</span>
                </div>

                <div style={{ padding: '16px', flex: 1 }}>
                  {/* Switch */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Show Magic Bags matching your preferences</span>
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
                  <div style={{
                    border: '1.5px solid #059669',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '20px'
                  }}>
                    {[
                      { name: 'Meals', bg: '#fef9c3', icon: '🍲' },
                      { name: 'Baked goods', bg: '#ffedd5', icon: '🥐' },
                      { name: 'Groceries', bg: '#dcfce7', icon: '🥦' },
                      { name: 'Other', bg: '#e0f2fe', icon: '🛍️' }
                    ].map((cat) => {
                      const isChecked = selectedCategories.includes(cat.name);
                      return (
                        <div
                          key={cat.name}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedCategories(selectedCategories.filter((c) => c !== cat.name));
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
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '700' }}>{cat.name}</span>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isChecked ? '#00473e' : '#ffffff',
                            border: '1px solid #00473e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}>
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
                          cursor: 'pointer'
                        }}
                      >
                        {diet}
                      </button>
                    ))}
                  </div>

                  {/* Section 3: Preferred collection times (Red highlighted box in screenshot) */}
                  <div style={{ border: '1.5px solid #ef4444', borderRadius: '10px', padding: '10px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>
                      Preferred collection times
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[
                        { id: 'Morning', title: 'Morning', time: '05:00 - 10:00' },
                        { id: 'Noon', title: 'Noon', time: '10:00 - 14:00' }
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
                              cursor: 'pointer'
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
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => {
                      setSelectedCategories(['Meals', 'Baked goods', 'Groceries', 'Other']);
                      setSelectedDietary('None');
                      setSelectedTimes(['Morning', 'Noon']);
                    }}
                    style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: '600', color: '#6b7280', cursor: 'pointer' }}
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
                      cursor: 'pointer'
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
                    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700' }}>
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
                          cursor: 'pointer'
                        }}
                      >
                        <Sparkles size={16} />
                      </button>
                    </div>

                    {/* Search & Filter Bar */}
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px' }}>
                      <div style={{
                        flex: 1,
                        backgroundColor: '#f3f4f6',
                        borderRadius: '24px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#9ca3af'
                      }}>
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
                          cursor: 'pointer'
                        }}
                      >
                        <Filter size={16} color="#111827" />
                      </button>
                    </div>

                    {/* Section 1: Recommended for you (Carousel) */}
                    <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800' }}>Recommended for you</span>
                        <span onClick={() => setActiveTab('browse')} style={{ fontSize: '12px', color: '#00473e', fontWeight: '600', cursor: 'pointer' }}>
                          See all &gt;
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
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
                              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                          >
                            <div style={{ position: 'relative', height: '110px' }}>
                              <img src={deal.coverImageUrl} alt={deal.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.75)', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>
                                {deal.remainingStock} left
                              </div>
                            </div>
                            <div style={{ padding: '10px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {deal.storeName}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{deal.title}</div>
                              <div style={{ border: '1px solid #ef4444', borderRadius: '4px', padding: '3px 6px', margin: '6px 0', fontSize: '10px', fontWeight: '600' }}>
                                {deal.pickupWindowText}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                <span style={{ color: '#00473e', fontWeight: '700' }}>★ {deal.rating}</span>
                                <span style={{ fontWeight: '800' }}>{deal.discountPrice.toLocaleString('vi-VN')} ₫</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Section 2: Save before it's too late */}
                    <div style={{ padding: '0 16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: '800' }}>Save before it's too late</span>
                        <span onClick={() => setActiveTab('browse')} style={{ fontSize: '12px', color: '#00473e', fontWeight: '600', cursor: 'pointer' }}>
                          See all &gt;
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {deals.filter((d) => d.isUrgent).map((deal) => (
                          <div
                            key={deal.id}
                            onClick={() => setSelectedDeal(deal)}
                            style={{
                              minWidth: '220px',
                              backgroundColor: '#ffffff',
                              borderRadius: '16px',
                              border: '1px solid #e5e7eb',
                              overflow: 'hidden',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ position: 'relative', height: '110px' }}>
                              <img src={deal.coverImageUrl} alt={deal.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#ef4444', color: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: '700' }}>
                                Sắp hết giờ
                              </div>
                            </div>
                            <div style={{ padding: '10px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '700' }}>{deal.storeName}</div>
                              <div style={{ border: '1px solid #ef4444', borderRadius: '4px', padding: '3px 6px', margin: '6px 0', fontSize: '10px', fontWeight: '600' }}>
                                {deal.pickupWindowText}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#00473e', fontSize: '11px', fontWeight: '700' }}>★ {deal.rating}</span>
                                <span style={{ fontWeight: '800', fontSize: '12px' }}>{deal.discountPrice.toLocaleString('vi-VN')} ₫</span>
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
                    <div style={{
                      border: '1px solid rgba(0,71,62,0.3)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '16px'
                    }}>
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
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ position: 'relative', height: '140px' }}>
                            <img src={deal.coverImageUrl} alt={deal.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.8)', color: '#ffffff', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
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
                                cursor: 'pointer'
                              }}
                            >
                              <Heart size={16} fill={deal.isFavorite ? '#ef4444' : 'none'} />
                            </button>
                          </div>
                          <div style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px' }}>{deal.storeName}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 6px' }}>{deal.title}</div>
                            {/* Red highlight box */}
                            <div style={{ border: '1px solid #ef4444', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                              {deal.pickupWindowText}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                                <span style={{ color: '#00473e', fontWeight: '700' }}>★ {deal.rating}</span>
                                <span style={{ color: '#6b7280' }}>{deal.distanceText}</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', textDecoration: 'line-through', color: '#9ca3af' }}>{deal.originalPrice.toLocaleString('vi-VN')} ₫</div>
                                <div style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>{deal.discountPrice.toLocaleString('vi-VN')} ₫</div>
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
                    <div style={{ fontSize: '17px', fontWeight: '800', marginBottom: '14px' }}>Favourites</div>
                    {deals.filter((d) => d.isFavorite).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
                        <Heart size={48} color="#ef4444" style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>Chưa có tiệm yêu thích</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Hãy nhấn hình trái tim để lưu lại các tiệm bánh bạn ưng ý nhất!</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {deals.filter((d) => d.isFavorite).map((deal) => (
                          <div
                            key={deal.id}
                            onClick={() => setSelectedDeal(deal)}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '12px',
                              display: 'flex',
                              gap: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <img src={deal.coverImageUrl} alt={deal.title} style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: '700', fontSize: '13px' }}>{deal.storeName}</div>
                              <div style={{ fontSize: '11px', color: '#6b7280' }}>{deal.title}</div>
                              <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: '700', marginTop: '4px' }}>{deal.pickupWindowText}</div>
                              <div style={{ fontWeight: '800', fontSize: '13px', marginTop: '4px' }}>{deal.discountPrice.toLocaleString('vi-VN')} ₫</div>
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
                    <div style={{ fontSize: '17px', fontWeight: '800', marginBottom: '16px' }}>Me</div>
                    {/* User Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(0,71,62,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00473e' }}>
                        <User size={28} />
                      </div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '16px' }}>Nguyễn Văn An</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>an.nguyen@example.com</div>
                        <span style={{ fontSize: '10px', backgroundColor: '#e6f3ee', color: '#00473e', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                          Khách hàng thân thiết
                        </span>
                      </div>
                    </div>

                    {/* Impact Card */}
                    <div style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                      <div style={{ fontWeight: '800', fontSize: '14px', marginBottom: '12px' }}>🌱 Thành tích Cứu Món</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#00473e' }}>18.5 kg</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>Thực phẩm cứu</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#3b82f6' }}>46.2 kg</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>Giảm CO2e</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b' }}>4.82 tr ₫</div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>Tiền tiết kiệm</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>📦 Đơn hàng của tôi</span>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                      <div style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>🥗 Hồ sơ ăn uống & dị ứng</span>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                      <div onClick={() => setShowAiSheet(true)} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>✨ Trợ lý Cứu Món AI (SaveBite)</span>
                        <ChevronRight size={16} color="#9ca3af" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMAGE 1: BOTTOM NAVIGATION BAR (Discover, Browse, Favourites, Me) */}
            <div style={{
              height: '60px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 8px'
            }}>
              {[
                { id: 'discover', label: 'Discover', icon: Compass },
                { id: 'browse', label: 'Browse', icon: ShoppingBag },
                { id: 'favourites', label: 'Favourites', icon: Heart },
                { id: 'me', label: 'Me', icon: User }
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
                      color: isSelected ? '#00473e' : '#9ca3af'
                    }}
                  >
                    <IconComponent
                      size={22}
                      strokeWidth={isSelected ? 2.5 : 1.8}
                      fill={isSelected && tab.id === 'favourites' ? '#00473e' : isSelected && tab.id !== 'discover' ? '#00473e' : 'none'}
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
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 50,
                display: 'flex',
                alignItems: 'flex-end'
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  width: '100%',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px',
                  padding: '20px',
                  maxHeight: '90%',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontWeight: '800', fontSize: '16px' }}>Giữ suất Cứu Món (10 phút)</span>
                    <button onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* 10-Min Timer */}
                  <div style={{ backgroundColor: 'rgba(0,71,62,0.1)', color: '#00473e', borderRadius: '10px', padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <Clock size={16} />
                    <span style={{ fontSize: '13px', fontWeight: '700' }}>
                      Thời gian giữ suất còn lại: {Math.floor(holdTimer / 60)}:{(holdTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{selectedDeal.storeName}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>{selectedDeal.title}</div>

                  {/* VietQR Mock */}
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#00473e', marginBottom: '8px' }}>MÃ VIETQR THANH TOÁN TỰ ĐỘNG</div>
                    <div style={{ width: '130px', height: '130px', margin: '0 auto', backgroundColor: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <QrCode size={100} color="#111827" />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginTop: '8px' }}>Nội dung CK: SUQ8921</div>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: '#00473e', marginTop: '2px' }}>
                      {selectedDeal.discountPrice.toLocaleString('vi-VN')} ₫
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
                      cursor: 'pointer'
                    }}
                  >
                    Xác nhận đã thanh toán • Nhận Vé QR
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 2: PICKUP PASS SCREEN (R1-057, R1-060) */}
            {showPickupPass && selectedDeal && (
              <div style={{
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
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowPickupPass(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={24} />
                  </button>
                </div>

                <div style={{ fontSize: '13px', fontWeight: '800', color: '#00473e', letterSpacing: '1px', marginTop: '10px' }}>
                  VÉ NHẬN HÀNG HỢP LỆ (HMAC TOKEN)
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', margin: '6px 0 20px' }}>
                  {selectedDeal.storeName}
                </div>

                {/* QR Box */}
                <div style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto 16px',
                  border: '2px solid #00473e',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <QrCode size={170} color="#00473e" />
                </div>

                {/* 6-Digit Backup PIN */}
                <div style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  display: 'inline-block',
                  margin: '0 auto 16px',
                  fontSize: '14px',
                  fontWeight: '800',
                  color: '#111827'
                }}>
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
                    cursor: 'pointer'
                  }}
                >
                  🚶 Báo cho quán là tôi sắp đến
                </button>
              </div>
            )}

            {/* MODAL 3: SAVEBITE AI CHAT (R1-082, R1-083) */}
            {showAiSheet && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                zIndex: 70,
                display: 'flex',
                alignItems: 'flex-end'
              }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  width: '100%',
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px',
                  padding: '16px',
                  height: '75%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} color="#00473e" />
                      <span style={{ fontWeight: '800', fontSize: '15px' }}>Trợ Lý Cứu Món SaveBite AI</span>
                    </div>
                    <button onClick={() => setShowAiSheet(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ flex: 1, backgroundColor: '#f9fafb', borderRadius: '12px', padding: '12px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.5' }}>
                    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>
                      👋 Chào bạn! Tôi là trợ lý AI SurplusIQ. Hãy nói cho tôi nhu cầu ẩm thực của bạn (ví dụ: <em>"Tìm bánh mì hoặc croissant dưới 35k gần đây sau 20h"</em>).
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <input
                      placeholder="Nhập câu hỏi tự nhiên..."
                      style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '20px', padding: '8px 14px', fontSize: '12px' }}
                    />
                    <button style={{ backgroundColor: '#00473e', color: '#ffffff', border: 'none', borderRadius: '20px', padding: '8px 14px', fontSize: '12px', fontWeight: '700' }}>
                      Gửi
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STORE OWNER WEB DASHBOARD */
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '800' }}>Bảng Điều Khiển Cửa Hàng</h1>
                <span className="badge badge-emerald">Artisan Bakery • Pro Trial</span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>
                Định giá động theo thời gian thực và quản lý đơn hàng nhận tại quầy.
              </p>
            </div>
          </header>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '8px', fontSize: '13px' }}>
                <span>Hàng dư giảm</span>
                <TrendingDown size={18} color="#34d399" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399' }}>-28.5%</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Tiết kiệm ~1.200.000 đ/tuần</div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '8px', fontSize: '13px' }}>
                <span>Doanh thu thu hồi</span>
                <DollarSign size={18} color="#fbbf24" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24' }}>4.820.000 ₫</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Qua 68 suất Cứu Món tháng này</div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: '8px', fontSize: '13px' }}>
                <span>Thực phẩm cứu được</span>
                <Leaf size={18} color="#60a5fa" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#60a5fa' }}>124.5 kg</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Giảm 310 kg CO2e phát thải</div>
            </div>
          </div>

          {/* Offers Table */}
          <div className="glass-card">
            <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Các suất đang mở bán hôm nay</h2>
            <div style={{ display: 'grid', gap: '14px' }}>
              {deals.map((deal) => (
                <div key={deal.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{deal.title}</div>
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>{deal.pickupWindowText}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399' }}>{deal.discountPrice.toLocaleString('vi-VN')} ₫</div>
                    <span className="badge badge-amber">Còn {deal.remainingStock} suất</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
