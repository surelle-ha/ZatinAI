import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Agent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
    name: string;

    /**
     * Ollama model string, e.g. "minimax-m2:cloud".
     * Stored as-is so the frontend can pass it directly to Ollama.
     */
    @Column({ name: 'model', type: 'varchar', length: 100, nullable: false })
    model: string;

    @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: true })
    isEnabled: boolean;

    @Column({ name: 'created_by', type: 'int', nullable: false })
    createdBy: number;

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}