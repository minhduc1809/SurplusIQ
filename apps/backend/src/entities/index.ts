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
} from './stores';

import {
  SubscriptionEntity,
  SubscriptionInvoiceEntity,
  PlanQuotaEntity,
  UsageLogEntity,
} from './subscriptions';

import { ItemEntity, OfferEntity, OfferEventEntity, SurpriseBagItemEntity } from './catalog';

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

export const ALL_ENTITIES = [
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

  // Catalog (4)
  ItemEntity,
  OfferEntity,
  OfferEventEntity,
  SurpriseBagItemEntity,

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
];
