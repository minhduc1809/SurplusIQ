import { ForecastingEngine, DynamicPricingEngine, HistoricalSalesRecord, DayContext, WeatherType } from '@surplusiq/core';

interface SimulationMetrics {
  totalWastedUnits: number;
  totalSalvagedRevenue: number;
  stockoutIncidents: number;
}

export function runStoreSimulation(numStores = 50, days = 30) {
  console.log(`\n======================================================`);
  console.log(`  SURPLUSIQ BENCHMARK: MÔ PHỎNG ${numStores} CỬA HÀNG TRONG ${days} NGÀY`);
  console.log(`======================================================\n`);

  const modes: Record<'A' | 'B' | 'C' | 'D', SimulationMetrics> = {
    A: { totalWastedUnits: 0, totalSalvagedRevenue: 0, stockoutIncidents: 0 },
    B: { totalWastedUnits: 0, totalSalvagedRevenue: 0, stockoutIncidents: 0 },
    C: { totalWastedUnits: 0, totalSalvagedRevenue: 0, stockoutIncidents: 0 },
    D: { totalWastedUnits: 0, totalSalvagedRevenue: 0, stockoutIncidents: 0 },
  };

  const weatherTypes: WeatherType[] = ['SUNNY', 'CLOUDY', 'RAINY', 'STORMY'];
  const unitPrice = 50000;

  for (let s = 1; s <= numStores; s++) {
    // Mỗi cửa hàng có mức bán cơ sở từ 30 đến 70 sản phẩm/ngày
    const baselineDemand = 30 + Math.floor(Math.random() * 40);

    for (let d = 1; d <= days; d++) {
      const dayOfWeek = d % 7;
      const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      const isHoliday = d % 14 === 0;

      // Nhu cầu thực tế có biến động ngẫu nhiên +/- 20%
      const noise = (Math.random() * 0.4 - 0.2);
      const actualDemand = Math.max(10, Math.round(baselineDemand * (1 + noise)));

      // Tạo lịch sử mẫu cho cửa hàng
      const history: HistoricalSalesRecord[] = Array.from({ length: 14 }).map((_, idx) => ({
        date: `2026-09-${idx + 1}`,
        dayOfWeek: idx % 7,
        weather: 'CLOUDY',
        isHoliday: false,
        quantityProduced: baselineDemand + 5,
        quantitySold: baselineDemand,
        quantityWasted: 5,
      }));

      const dayContext: DayContext = {
        dayOfWeek,
        weather,
        isHoliday,
        isSpecialEvent: false,
      };

      // 1. Chế độ A: Nấu cố định theo hôm qua, không giảm giá
      const prodA = baselineDemand + 8;
      const soldA = Math.min(prodA, actualDemand);
      const wasteA = prodA - soldA;
      modes.A.totalWastedUnits += wasteA;

      // 2. Chế độ B: Nấu cố định, giảm cứng 30% cuối ngày (bán thêm được 40% phần dư)
      const prodB = baselineDemand + 8;
      const unsoldInitialB = prodB - Math.min(prodB, actualDemand);
      const salvagedB = Math.round(unsoldInitialB * 0.4);
      modes.B.totalWastedUnits += (unsoldInitialB - salvagedB);
      modes.B.totalSalvagedRevenue += salvagedB * (unitPrice * 0.7);

      // 3. Chế độ C: Có dự báo từ SurplusIQ, không định giá động
      const forecastC = ForecastingEngine.calculateForecast('item-1', history, dayContext);
      const prodC = forecastC.recommendedProduction;
      const soldC = Math.min(prodC, actualDemand);
      const wasteC = prodC - soldC;
      modes.C.totalWastedUnits += wasteC;
      if (prodC < actualDemand) modes.C.stockoutIncidents++;

      // 4. Chế độ D: SurplusIQ Đầy Đủ (Dự báo + Định giá động thích ứng)
      const prodD = forecastC.recommendedProduction;
      const soldD_regular = Math.min(prodD, actualDemand);
      const surplusD = prodD - soldD_regular;

      // Áp dụng định giá động cho phần surplus
      let salvagedRevenueD = 0;
      let remainingSurplusD = surplusD;
      if (surplusD > 0) {
        const pricing = DynamicPricingEngine.calculateDynamicPrice({
          productId: 'item-1',
          originalPrice: unitPrice,
          remainingStock: surplusD,
          initialStock: prodD,
          currentTime: new Date(2026, 9, d, 20, 0),
          closingTime: new Date(2026, 9, d, 21, 30),
          expiryTime: new Date(2026, 9, d, 21, 30),
        });
        // Xác suất thanh lý dựa trên độ sâu giảm giá
        const salvageCount = Math.round(surplusD * pricing.estimatedSellOutProbability);
        remainingSurplusD = surplusD - salvageCount;
        salvagedRevenueD = salvageCount * pricing.recommendedPrice;
      }

      modes.D.totalWastedUnits += remainingSurplusD;
      modes.D.totalSalvagedRevenue += salvagedRevenueD;
      if (prodD < actualDemand) modes.D.stockoutIncidents++;
    }
  }

  // In bảng so sánh
  console.table({
    'Chế độ A (Nấu như cũ, không giảm)': {
      'Hàng hủy bỏ (đơn vị)': modes.A.totalWastedUnits,
      'Tiền thu hồi': '0 ₫',
      'Giảm hao hụt': '0%',
    },
    'Chế độ B (Cố định giảm 30%)': {
      'Hàng hủy bỏ (đơn vị)': modes.B.totalWastedUnits,
      'Tiền thu hồi': `${modes.B.totalSalvagedRevenue.toLocaleString('vi-VN')} ₫`,
      'Giảm hao hụt': `${Math.round((1 - modes.B.totalWastedUnits / modes.A.totalWastedUnits) * 100)}%`,
    },
    'Chế độ C (Có dự báo, không đổi giá)': {
      'Hàng hủy bỏ (đơn vị)': modes.C.totalWastedUnits,
      'Tiền thu hồi': '0 ₫',
      'Giảm hao hụt': `${Math.round((1 - modes.C.totalWastedUnits / modes.A.totalWastedUnits) * 100)}%`,
    },
    'Chế độ D (SurplusIQ Full Engine)': {
      'Hàng hủy bỏ (đơn vị)': modes.D.totalWastedUnits,
      'Tiền thu hồi': `${modes.D.totalSalvagedRevenue.toLocaleString('vi-VN')} ₫`,
      'Giảm hao hụt': `${Math.round((1 - modes.D.totalWastedUnits / modes.A.totalWastedUnits) * 100)}%`,
    },
  });
}

// Chạy trực tiếp nếu execute file
if (require.main === module) {
  runStoreSimulation(50, 30);
}
