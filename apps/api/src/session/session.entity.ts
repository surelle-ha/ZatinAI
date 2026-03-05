import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Session {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'agent_id', type: 'int', nullable: false })
    agentId: number;

    /**
     * Auto-set from the first user message (first 30 chars).
     * Can be manually renamed by the user later.
     */
    @Column({ name: 'title', type: 'varchar', length: 100, nullable: false, default: 'New Chat' })
    title: string;

    @Column({ name: 'created_by', type: 'int', nullable: false })
    createdBy: number;

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}