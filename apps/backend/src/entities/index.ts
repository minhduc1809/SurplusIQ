import { PickupIncidentEntity, OrderMessageEntity, OrderGiftEntity } from './order-support';
import {
  UserEntity,
  CustomerProfileEntity,
  DietaryProfileEntity,
  ConsentEntity,
  RefreshTokenEntity,
  OtpCodeEntity,
  TrustedDeviceEntity,
  SavedPlaceEntity,
  SavedFilterEntity,
  DealAlertEntity,
  SavedDealEntity,
  ViewHistoryEntity,
  FcmTokenEntity,
  FavoriteStoreEntity,
} from './auth';

import {
  StoreEntity,
  StoreSettingsEntity,
  StoreSettingsHistoryEntity,
  StoreMemberEntity,
  StaffInviteEntity,
  StoreClosureEntity,
  CustomerSegmentEntity,
  CustomerNoteEntity,
  AuditLogEntity,
  StoreLegalProfileEntity,
  StoreContractEntity,
} from './stores';

import {
  SubscriptionEntity,
  SubscriptionInvoiceEntity,
  PlanQuotaEntity,
  UsageLogEntity,
} from './subscriptions';

import {
  ItemEntity,
  OfferEntity,
  OfferEventEntity,
  SurpriseBagItemEntity,
  TrustpassHistoryEntity,
} from './catalog';

import { RewardAccountEntity, RewardLedgerEntryEntity } from './rewards';

import { RescueRiskSnapshotEntity } from './rescue-timeline';

import { RescuePoolEntity, RescuePoolRegistrationEntity } from './rescue-pool';

import { RecipientOrganizationEntity, RescueBridgeTransferEntity } from './rescue-bridge';
import { RescueLabScenarioEntity, RescueLabScenarioVersionEntity } from './rescue-lab';

import {
  OrderEntity,
  IdempotencyKeyEntity,
  PaymentTransactionEntity,
  PickupTokenEntity,
  ProxyPickupCodeEntity,
  NoshowRecordEntity,
  OrderLockEntity,
} from './orders';

import {
  ComplaintEntity,
  ComplaintAttachmentEntity,
  ReviewEntity,
  ViolationReportEntity,
  SupportTicketEntity,
  SupportMessageEntity,
} from './complaints';

import {
  DailyActualEntity,
  SpecialEventEntity,
  ForecastEntity,
  PriceProposalEntity,
  WeeklyStatementEntity,
  StatementLineEntity,
} from './reconciliation';

import {
  PromotionEntity,
  PromotionWalletEntity,
  CampaignEntity,
  CampaignDeliveryEntity,
} from './marketing';

import {
  AnomalyEntity,
  ActionCardEntity,
  DonationRecordEntity,
  AiConversationEntity,
  AiMessageEntity,
  AiLogEntity,
  AiFeedbackEntity,
} from './ai';

import { PlatformSettingEntity } from './settings';
import { NotificationEntity } from './notifications';

export * from './auth';
export * from './stores';
export * from './subscriptions';
export * from './catalog';
export * from './orders';
export * from './complaints';
export * from './reconciliation';
export * from './marketing';
export * from './ai';
export * from './settings';
export * from './notifications';
export * from './rewards';
export * from './rescue-timeline';
export * from './rescue-pool';
export * from './rescue-bridge';
export * from './rescue-lab';

export const ALL_ENTITIES = [
  // Hỗ trợ đơn hàng: sự cố khi nhận, trò chuyện, tặng suất
  PickupIncidentEntity,
  OrderMessageEntity,
  OrderGiftEntity,

  // Auth & Identity (13)
  UserEntity,
  CustomerProfileEntity,
  DietaryProfileEntity,
  ConsentEntity,
  RefreshTokenEntity,
  OtpCodeEntity,
  TrustedDeviceEntity,
  SavedPlaceEntity,
  SavedFilterEntity,
  DealAlertEntity,
  SavedDealEntity,
  ViewHistoryEntity,
  FcmTokenEntity,
  FavoriteStoreEntity,

  // Stores (8)
  StoreEntity,
  StoreSettingsEntity,
  StoreSettingsHistoryEntity,
  StoreMemberEntity,
  StaffInviteEntity,
  StoreClosureEntity,
  CustomerSegmentEntity,
  CustomerNoteEntity,
  AuditLogEntity,

  // Subscriptions (4)
  SubscriptionEntity,
  SubscriptionInvoiceEntity,
  PlanQuotaEntity,
  UsageLogEntity,

  // Catalog (5)
  ItemEntity,
  OfferEntity,
  OfferEventEntity,
  SurpriseBagItemEntity,
  TrustpassHistoryEntity,

  // Orders (7)
  OrderEntity,
  IdempotencyKeyEntity,
  PaymentTransactionEntity,
  PickupTokenEntity,
  ProxyPickupCodeEntity,
  NoshowRecordEntity,
  OrderLockEntity,

  // Complaints (6)
  ComplaintEntity,
  ComplaintAttachmentEntity,
  ReviewEntity,
  ViolationReportEntity,
  SupportTicketEntity,
  SupportMessageEntity,

  // Reconciliation (6)
  DailyActualEntity,
  SpecialEventEntity,
  ForecastEntity,
  PriceProposalEntity,
  WeeklyStatementEntity,
  StatementLineEntity,

  // Marketing (4)
  PromotionEntity,
  PromotionWalletEntity,
  CampaignEntity,
  CampaignDeliveryEntity,

  // AI & Insights (7)
  AnomalyEntity,
  ActionCardEntity,
  DonationRecordEntity,
  AiConversationEntity,
  AiMessageEntity,
  AiLogEntity,
  AiFeedbackEntity,

  // Settings (1)
  PlatformSettingEntity,

  // Notifications (1)
  NotificationEntity,

  // Rewards (2)
  RewardAccountEntity,
  RewardLedgerEntryEntity,

  // Rescue Timeline (1)
  RescueRiskSnapshotEntity,

  // Rescue Pool (2)
  RescuePoolEntity,
  RescuePoolRegistrationEntity,

  // Rescue Bridge (2)
  RecipientOrganizationEntity,
  RescueBridgeTransferEntity,

  // Rescue Lab (2)
  RescueLabScenarioEntity,
  RescueLabScenarioVersionEntity,

  // Hồ sơ pháp lý & hợp đồng cửa hàng (2)
  StoreLegalProfileEntity,
  StoreContractEntity,
];
