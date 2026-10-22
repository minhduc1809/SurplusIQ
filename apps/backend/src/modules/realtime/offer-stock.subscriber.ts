import { Injectable } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, UpdateEvent } from 'typeorm';
import { OfferEntity, OfferStatus } from '../../entities/catalog/offer.entity';
import { RealtimeService } from './realtime.service';

/**
 * Phát deal.stock_updated mỗi khi tồn hoặc trạng thái suất đổi, từ mọi nguồn (khách giữ/hủy, cửa hàng sửa, hết hạn giữ),
 * để app khách không hiện tồn cũ.
 * shortcut: phát ngay sau câu UPDATE, nếu giao dịch rollback thì khách nhận một sự kiện thừa; sự kiện sau sẽ sửa lại.
 */
@Injectable()
export class OfferStockSubscriber implements EntitySubscriberInterface<OfferEntity> {
  constructor(
    dataSource: DataSource,
    private readonly realtime: RealtimeService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return OfferEntity;
  }

  afterUpdate(event: UpdateEvent<OfferEntity>) {
    const offer = event.entity as OfferEntity | undefined;
    if (
      !offer?.id ||
      !event.updatedColumns.some((c) => ['remainingQuantity', 'status'].includes(c.propertyName))
    )
      return;
    const remaining = offer.status === OfferStatus.OPEN ? Math.max(0, offer.remainingQuantity) : 0;
    this.realtime.notifyStockUpdated({
      dealId: offer.id,
      storeId: offer.storeId,
      remainingQuantity: remaining,
      status: remaining === 0 ? 'SOLD_OUT' : remaining < 3 ? 'LOW_STOCK' : 'AVAILABLE',
    });
  }
}
