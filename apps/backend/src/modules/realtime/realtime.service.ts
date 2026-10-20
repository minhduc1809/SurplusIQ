import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

export interface DealStockUpdatedPayload {
  dealId: string;
  storeId: string;
  remainingQuantity: number;
  status: 'AVAILABLE' | 'LOW_STOCK' | 'SOLD_OUT';
}

export interface DealFlashRescuePayload {
  dealId: string;
  storeId: string;
  title: string;
  storeName: string;
  discountPercent: number;
  discountedPrice: number;
  originalPrice: number;
  latitude: number;
  longitude: number;
  expiresAt: string;
}

export interface OrderHoldReservedPayload {
  orderId: string;
  dealId: string;
  storeId: string;
  reservedQuantity: number;
  holdExpiresAt: string;
}

export type RealtimeEvent =
  | { type: 'deal.stock_updated'; data: DealStockUpdatedPayload }
  | { type: 'deal.flash_rescue'; data: DealFlashRescuePayload }
  | { type: 'order.hold_reserved'; data: OrderHoldReservedPayload }
  | { type: 'system.ping'; timestamp: string };

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.logger.log('SurplusIQ WebSocket Realtime Gateway initialized at path: /ws');

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);
      const ip = req.socket.remoteAddress;
      this.logger.log(`Client connected: ${ip} (Total active: ${this.clients.size})`);

      // Gửi tin nhắn chào mừng và trạng thái kết nối
      ws.send(
        JSON.stringify({
          type: 'system.connected',
          message: 'Connected to SurplusIQ Realtime Engine',
          timestamp: new Date().toISOString(),
        }),
      );

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          this.logger.debug(`Received message from client: ${JSON.stringify(parsed)}`);
          if (parsed.action === 'ping') {
            ws.send(JSON.stringify({ type: 'system.pong', timestamp: new Date().toISOString() }));
          }
        } catch {
          // Bỏ qua tin nhắn không đúng định dạng
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.logger.log(`Client disconnected (Remaining: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        this.logger.error(`WebSocket client error: ${err.message}`);
        this.clients.delete(ws);
      });
    });
  }

  onModuleInit() {
    // Sẽ được kích hoạt khi server HTTP sẵn sàng
  }

  onModuleDestroy() {
    if (this.wss) {
      this.wss.close();
      this.logger.log('WebSocket Gateway closed');
    }
  }

  /**
   * Phát broadcast sự kiện tới toàn bộ client (App Android & Web Dashboard)
   */
  broadcast(event: RealtimeEvent) {
    const payload = JSON.stringify(event);
    let sentCount = 0;
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
        sentCount++;
      }
    }
    this.logger.log(`Broadcast event [${event.type}] to ${sentCount} clients`);
  }

  /**
   * Cập nhật số suất tồn kho còn lại của Deal (R1-021)
   */
  notifyStockUpdated(payload: DealStockUpdatedPayload) {
    this.broadcast({
      type: 'deal.stock_updated',
      data: payload,
    });
  }

  /**
   * Cảnh báo deal xả hàng khẩn cấp cận giờ (Flash Rescue)
   */
  notifyFlashRescue(payload: DealFlashRescuePayload) {
    this.broadcast({
      type: 'deal.flash_rescue',
      data: payload,
    });
  }

  /**
   * Đổi trạng thái suất khi có khách đặt giữ hàng 10 phút
   */
  notifyOrderHoldReserved(payload: OrderHoldReservedPayload) {
    this.broadcast({
      type: 'order.hold_reserved',
      data: payload,
    });
  }
}
