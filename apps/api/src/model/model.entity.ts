import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export type ModelPlatform = 'enterprise' | 'third-party';

@Entity('models')
export class Model {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'label', type: 'varchar', length: 100, nullable: false })
    label: string;

    /**
     * The exact model string passed to the inference host, e.g. "minimax-m2:cloud"
     */
    @Column({ name: 'value', type: 'varchar', length: 150, nullable: false })
    value: string;

    @Column({ name: 'provider', type: 'varchar', length: 100, nullable: false, default: '' })
    provider: string;

    @Column({ name: 'description', type: 'text', nullable: false, default: '' })
    description: string;

    @Column({ name: 'context_window', type: 'varchar', length: 20, nullable: false, default: '' })
    contextWindow: string;

    /**
     * 'enterprise'  → hosted enterprise inference endpoint, defaults to http://localhost:11434
     * 'third-party'  → external API (OpenAI-compatible, custom, etc.)
     */
    @Column({ name: 'platform', type: 'varchar', length: 30, nullable: false, default: 'enterprise' })
    platform: ModelPlatform;

    /**
     * Base URL of the inference host.
     * Enterprise default: http://localhost:11434
     * Third-party: whatever the user provides
     */
    @Column({ name: 'host_url', type: 'varchar', length: 500, nullable: false, default: 'http://localhost:11434' })
    hostUrl: string;

    /**
     * API token / key for third-party providers. Stored as-is (encrypt at rest if needed).
     * Empty string for enterprise (no auth required by default).
     */
    @Column({ name: 'api_token', type: 'text', nullable: false, default: '' })
    apiToken: string;

    @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
    sortOrder: number;

    @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
    isActive: boolean;

    @Column({ name: 'created_by', type: 'int', nullable: false })
    createdBy: number;

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}