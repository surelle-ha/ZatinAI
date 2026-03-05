import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from 'typeorm';
import { Workspace } from '../workspace/workspace.entity';
import { Subscription } from '../subscription/subscription.entity';

export enum WorkspaceSubscriptionStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired',
    TRIAL = 'trial',
    PAST_DUE = 'past_due',
}

export enum BillingCycle {
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly',
}

@Entity('workspace_subscriptions')
export class WorkspaceSubscription {
    @PrimaryGeneratedColumn()
    id: number;

    // --- Foreign Keys ---

    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'subscription_id', type: 'int', nullable: false })
    subscriptionId: number;

    // --- Relations ---

    @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'workspace_id' })
    workspace: Workspace;

    @ManyToOne(() => Subscription, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'subscription_id' })
    subscription: Subscription;

    // --- Status ---

    @Column({
        name: 'status',
        type: 'enum',
        enum: WorkspaceSubscriptionStatus,
        default: WorkspaceSubscriptionStatus.TRIAL,
        nullable: false,
    })
    status: WorkspaceSubscriptionStatus;

    @Column({
        name: 'billing_cycle',
        type: 'enum',
        enum: BillingCycle,
        default: BillingCycle.MONTHLY,
        nullable: false,
    })
    billingCycle: BillingCycle;

    // --- Dates ---

    @Column({ name: 'start_date', type: 'timestamp', nullable: false })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamp', nullable: true })
    endDate: Date | null;

    @Column({ name: 'trial_end_date', type: 'timestamp', nullable: true })
    trialEndDate: Date | null;

    @Column({ name: 'next_billing_date', type: 'timestamp', nullable: true })
    nextBillingDate: Date | null;

    @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
    cancelledAt: Date | null;

    // --- Payment ---

    @Column({ name: 'payment_method', type: 'varchar', length: 100, nullable: true })
    paymentMethod: string | null;

    @Column({
        name: 'external_subscription_id',
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: 'Stripe subscription ID or equivalent',
    })
    externalSubscriptionId: string | null;

    // --- Timestamps ---

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;
}