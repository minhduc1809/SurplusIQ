import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferEntity } from './offer.entity';
import { DynamicPricingEngine } from '@surplusiq/core';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(OfferEntity)
    private readonly offerRepo: Repository<OfferEntity>
  ) {}

  async findAllActive() {
    return this.offerRepo.find({
      where: { status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
  }

  async findByStore(storeId: string) {
    return this.offerRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPricingRecommendation(offerId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException('Suất cứu món không tồn tại');
    }

    const recommendation = DynamicPricingEngine.calculateDynamicPrice({
      productId: offer.id,
      originalPrice: offer.originalPrice,
      remainingStock: offer.remainingQuantity,
      initialStock: offer.initialQuantity,
      currentTime: new Date(),
      closingTime: new Date(offer.pickupEndTime),
      expiryTime: new Date(offer.pickupEndTime),
    });

    return {
      offerId: offer.id,
      currentDiscountPercent: offer.discountPercentage,
      currentPrice: offer.discountPrice,
      recommendation,
    };
  }

  async applyPricingRecommendation(offerId: string) {
    const recommendationData = await this.getPricingRecommendation(offerId);
    const rec = recommendationData.recommendation;

    await this.offerRepo.update(offerId, {
      discountPercentage: rec.recommendedDiscountPercent,
      discountPrice: rec.recommendedPrice,
      pricingRationale: rec.explanation,
    });

    return this.offerRepo.findOne({ where: { id: offerId } });
  }
}
