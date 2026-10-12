import React, { useState } from 'react';
import {
  Sparkles,
  TrendingDown,
  Leaf,
  DollarSign,
  Clock,
  RefreshCw,
  QrCode,
  Play,
} from 'lucide-react';

interface MockOffer {
  id: string;
  name: string;
  originalPrice: number;
  currentDiscount: number;
  discountPrice: number;
  remainingStock: number;
  initialStock: number;
  rationale: string;
}

export default function App() {
  const [simulatedTime, setSimulatedTime] = useState('19:45');
  const [offers, setOffers] = useState<MockOffer[]>([
    {
      id: '1',
      name: 'Croissant Bơ Pháp (Set 3 cái)',
      originalPrice: 90000,
      currentDiscount: 35,
      discountPrice: 58500,
      remainingStock: 5,
      initialStock: 20,
      rationale: 'Còn 1h45 trước khi đóng cửa, còn 5 suất. Giảm 35% để bán hết trước 21h15.',
    },
    {
      id: '2',
      name: 'Bánh Mì Sourdough Men Tự Nhiên',
      originalPrice: 65000,
      currentDiscount: 45,
      discountPrice: 35750,
      remainingStock: 3,
      initialStock: 15,
      rationale:
        'Hạn dùng trong ngày, tốc độ bán đang chậm (-20%). Tăng chiết khấu lên 45% để kích cầu.',
    },
    {
      id: '3',
      name: 'Bánh Kem Bắp Mini',
      originalPrice: 55000,
      currentDiscount: 20,
      discountPrice: 44000,
      remainingStock: 2,
      initialStock: 12,
      rationale: 'Chỉ còn 2 suất, xác suất bán hết tự nhiên cao (85%). Giữ chiết khấu nhẹ 20%.',
    },
  ]);

  const runDynamicPricing = () => {
    setOffers((prev) =>
      prev.map((item) => {
        const newDiscount = Math.min(60, item.currentDiscount + 10);
        const newPrice = Math.round((item.originalPrice * (1 - newDiscount / 100)) / 1000) * 1000;
        return {
          ...item,
          currentDiscount: newDiscount,
          discountPrice: newPrice,
          rationale: `[Cập nhật ${simulatedTime}]: Tồn ${item.remainingStock} suất. Đề xuất tăng giảm giá lên ${newDiscount}% để dọn kho trước giờ đóng cửa.`,
        };
      }),
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>
              SurplusIQ
            </h1>
            <span className="badge badge-emerald">Vừa Đủ • Tiệm Bánh Artisan Bakery</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            “Cook just enough. Sell out the day. Waste nothing.”
          </p>
        </div>

        {/* Time Simulator Control */}
        <div
          className="glass-card"
          style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}
        >
          <Clock size={18} color="var(--accent-amber)" />
          <span style={{ fontSize: '13px', fontWeight: '600' }}>Giờ mô phỏng: {simulatedTime}</span>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => setSimulatedTime('20:30')}
          >
            <Play size={12} /> Tua đến 20:30
          </button>
        </div>
      </header>

      {/* Impact Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px' }}>Hàng dư giảm</span>
            <TrendingDown size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399' }}>-28.5%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tiết kiệm ~1.200.000 đ/tuần
          </div>
        </div>

        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px' }}>Doanh thu thu hồi</span>
            <DollarSign size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#fbbf24' }}>4.820.000 ₫</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Qua 68 suất Cứu Món tháng này
          </div>
        </div>

        <div className="glass-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px' }}>Thực phẩm cứu được</span>
            <Leaf size={18} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#60a5fa' }}>124.5 kg</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tương đương giảm 310 kg CO2e phát thải
          </div>
        </div>
      </div>

      {/* Main Section: Dynamic Pricing & Offers */}
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>
              Suất Cứu Món Đang Mở Bán Hôm Nay
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Định giá tự động giảm dần theo giờ để đảm bảo dọn sạch tồn kho trước giờ đóng cửa
              (21:30)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={runDynamicPricing}>
              <RefreshCw size={14} /> Chạy tính toán lại giá
            </button>
            <button className="btn btn-primary">
              <Sparkles size={14} /> AI Thêm suất từ ảnh chụp
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {offers.map((offer) => (
            <div
              key={offer.id}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ flex: '1', minWidth: '280px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '6px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{offer.name}</h3>
                  <span className="badge badge-amber">
                    Còn {offer.remainingStock}/{offer.initialStock} suất
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  💡 <strong style={{ color: '#e5e7eb' }}>Lý do định giá:</strong> {offer.rationale}
                </p>
              </div>

              <div
                style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '20px' }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {offer.originalPrice.toLocaleString('vi-VN')} ₫
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }}>
                    {offer.discountPrice.toLocaleString('vi-VN')} ₫
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        marginLeft: '6px',
                        color: '#f87171',
                      }}
                    >
                      -{offer.currentDiscount}%
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  title="Quét mã QR của khách"
                >
                  <QrCode size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
