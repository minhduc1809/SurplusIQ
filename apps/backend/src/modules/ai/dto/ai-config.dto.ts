import { IsBoolean, IsIn } from 'class-validator';

export class UpdateAiConfigDto {
  @IsBoolean() chat: boolean;
  @IsBoolean() weeklySummary: boolean;
  @IsBoolean() drafts: boolean;
  @IsBoolean() managerCanUse: boolean;
  @IsIn(['FRIENDLY', 'FORMAL', 'APOLOGETIC']) defaultTone: 'FRIENDLY' | 'FORMAL' | 'APOLOGETIC';
}
