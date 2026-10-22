import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiGatewayService, AiFeatureKey } from './ai-gateway.service';

export const AI_FEATURE_KEY = 'aiFeature';
/** Gắn cho route AI để cửa hàng có thể tắt từng nhóm tính năng (R2-122). */
export const AiFeature = (feature: AiFeatureKey) => SetMetadata(AI_FEATURE_KEY, feature);

@Injectable()
export class AiFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly aiService: AiGatewayService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<AiFeatureKey>(AI_FEATURE_KEY, context.getHandler());
    if (!feature) return true;
    const request = context.switchToHttp().getRequest();
    await this.aiService.assertFeatureAllowed(
      request.user?.storeId,
      feature,
      request.storeMember?.permission,
    );
    return true;
  }
}
