import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OtpPurpose {
  VERIFY = 'VERIFY',
  RESET = 'RESET',
  TWO_FA = 'TWO_FA',
  CHANGE_ID = 'CHANGE_ID',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
}

@Entity('otp_codes')
@Index(['target', 'purpose'])
export class OtpCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  target: string; // phone or email

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'device_id' })
  deviceId: string | null;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
  })
  purpose: OtpPurpose;

  @Column({ type: 'varchar', length: 255, name: 'code_hash' })
  codeHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'wrong_count' })
  wrongCount: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
