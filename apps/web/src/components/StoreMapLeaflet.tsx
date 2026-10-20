import React, { useEffect, useRef, useState } from 'react';

// Khai báo kiểu cho Leaflet toàn cục
declare global {
  interface Window {
    L: any;
  }
}

export interface MapStoreItem {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  activeDealsCount: number;
}

interface StoreMapLeafletProps {
  stores?: MapStoreItem[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

export const StoreMapLeaflet: React.FC<StoreMapLeafletProps> = ({
  stores = [
    {
      id: 'store-1',
      name: 'Tiệm Bánh Mì Hoa Cúc 365',
      address: '120 Nguyễn Thị Minh Khai, Q.1, TP.HCM',
      latitude: 10.7769,
      longitude: 106.7009,
      activeDealsCount: 5,
    },
    {
      id: 'store-2',
      name: 'Cơm Trưa Văn Phòng Cô Ba',
      address: '45 Lê Duẩn, Bến Nghé, Q.1, TP.HCM',
      latitude: 10.7825,
      longitude: 106.6985,
      activeDealsCount: 2,
    },
    {
      id: 'store-3',
      name: 'Nông Sản Xanh Farm',
      address: '88 Hai Bà Trưng, Q.1, TP.HCM',
      latitude: 10.7745,
      longitude: 106.7035,
      activeDealsCount: 8,
    },
  ],
  center = [10.7769, 106.7009],
  zoom = 14,
  height = '420px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [realtimeNotice, setRealtimeNotice] = useState<string | null>(null);

  // Khởi tạo Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !window.L) return;

    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current).setView(center, zoom);

      // Tile layer từ OpenStreetMap chuẩn 100% miễn phí
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Xóa marker cũ
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Thêm markers cửa hàng
    stores.forEach((store) => {
      const isUrgent = store.activeDealsCount <= 2;
      const markerColor = isUrgent ? '#E65100' : '#2E7D32';

      const customIcon = window.L.divIcon({
        className: 'custom-osm-marker',
        html: `
          <div style="
            background-color: ${markerColor};
            color: white;
            font-weight: bold;
            font-size: 11px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
            border: 2px solid white;
          ">
            ${store.activeDealsCount}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = window.L.marker([store.latitude, store.longitude], { icon: customIcon }).addTo(
        map,
      ).bindPopup(`
          <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
            <b style="color: #2E7D32; font-size: 14px;">${store.name}</b><br/>
            <span style="color: #666; font-size: 11px;">${store.address}</span><br/>
            <div style="margin-top: 6px; padding: 3px 6px; background: #e8f5e9; border-radius: 4px; display: inline-block; color: #2E7D32; font-weight: 600; font-size: 12px;">
              ⚡ ${store.activeDealsCount} suất cứu đang mở
            </div>
          </div>
        `);

      markersRef.current.push(marker);
    });
  }, [stores, center, zoom]);

  // Kết nối Realtime WebSocket tới Backend (/ws)
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:4000/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Web Dashboard] Connected to SurplusIQ Realtime Engine');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'deal.flash_rescue') {
              setRealtimeNotice(
                `⚡ CẢNH BÁO GIỜ VÀNG: ${data.data?.storeName} vừa tung deal giảm ${data.data?.discountPercent}%!`,
              );
              setTimeout(() => setRealtimeNotice(null), 8000);
            } else if (data.type === 'deal.stock_updated') {
              console.log('[Web Dashboard] Deal stock updated:', data.data);
            }
          } catch (err) {
            console.error('Error parsing realtime message', err);
          }
        };

        ws.onerror = () => {
          // Reconnect sau 5s
          reconnectTimeout = setTimeout(connectWs, 5000);
        };
      } catch {
        reconnectTimeout = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {/* Realtime Alert Banner */}
      {realtimeNotice && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#FF6F00',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {realtimeNotice}
        </div>
      )}

      {/* Container Leaflet */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      />
    </div>
  );
};
