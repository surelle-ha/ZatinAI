import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  // --- Identity ---

  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string | null;

  // --- Pricing ---

  @Column({
    name: 'price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0.0,
  })
  price: number;

  @Column({
    name: 'currency',
    type: 'varchar',
    length: 3,
    nullable: false,
    default: 'USD',
  })
  currency: string;

  // --- Features / Limits ---

  @Column({
    name: 'max_users',
    type: 'int',
    nullable: true,
    default: 1,
    comment: 'null means unlimited',
  })
  maxUsers: number | null;

  @Column({
    name: 'features',
    type: 'jsonb',
    nullable: true,
    comment: 'JSON list of feature flags included in this plan',
  })
  features: Record<string, boolean> | null;

  // --- Availability ---

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
    comment: 'Whether this plan is currently available for new subscriptions',
  })
  isActive: boolean;

  @Column({
    name: 'is_public',
    type: 'boolean',
    nullable: false,
    default: true,
    comment: 'Whether this plan is visible to users (false = internal/custom plans)',
  })
  isPublic: boolean;

  @Column({
    name: 'trial_days',
    type: 'int',
    nullable: false,
    default: 0,
    comment: 'Number of free trial days offered for this plan',
  })
  trialDays: number;

  // --- Timestamps ---

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}