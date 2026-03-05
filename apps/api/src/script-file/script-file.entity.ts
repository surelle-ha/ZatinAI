import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('script_files')
export class ScriptFile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'agent_id', type: 'int', nullable: false })
    agentId: number;

    /**
     * Denormalised workspace_id so we can scope queries without joining agents.
     */
    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
    name: string;

    /**
     * Markdown instruction content. Using `text` — prompts can be long.
     */
    @Column({ name: 'content', type: 'text', nullable: false, default: '' })
    content: string;

    /**
     * Injection order into the system prompt.
     * bootstrap.md should always be sort_order = 0.
     */
    @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
    sortOrder: number;

    /**
     * Explicit flag — avoids relying on filename matching server-side.
     */
    @Column({ name: 'is_bootstrap', type: 'boolean', nullable: false, default: false })
    isBootstrap: boolean;

    /**
     * Soft-delete flag. Deleted files are excluded from queries.
     */
    @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: true })
    isEnabled: boolean;

    @Column({ name: 'created_by', type: 'int', nullable: false })
    createdBy: number;

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}