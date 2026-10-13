import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_notes')
export class CustomerNoteEntity {
  @PrimaryColumn('uuid', { name: 'store_id' })
  storeId: string;

  @PrimaryColumn('uuid', { name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 200 })
  note: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
