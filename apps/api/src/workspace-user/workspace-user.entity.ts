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
import { User } from '../user/user.entity';

export enum WorkspaceUserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
}

@Entity('workspace_users')
export class WorkspaceUser {
    @PrimaryGeneratedColumn()
    id: number;

    // --- Foreign Keys ---

    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'user_id', type: 'int', nullable: false })
    userId: number;

    // --- Relations ---

    @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'workspace_id' })
    workspace: Workspace;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    // --- Role ---

    @Column({
        name: 'role',
        type: 'enum',
        enum: WorkspaceUserRole,
        default: WorkspaceUserRole.MEMBER,
        nullable: false,
    })
    role: WorkspaceUserRole;

    // --- Status ---

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
        nullable: false,
    })
    isActive: boolean;

    @Column({
        name: 'joined_at',
        type: 'timestamp',
        nullable: true,
        comment: 'When the user accepted the invitation',
    })
    joinedAt: Date | null;

    @Column({
        name: 'invited_by',
        type: 'int',
        nullable: true,
        comment: 'User ID of who invited this member',
    })
    invitedBy: number | null;

    // --- Timestamps ---

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt?: Date;
}