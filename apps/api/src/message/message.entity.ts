import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

// ─── Part types (mirror the frontend interfaces) ──────────────────────────────

export type MessagePartType = 'text' | 'thinking' | 'system-notice';

export interface MessagePart {
    type: MessagePartType;
    text: string;
}

export type MessageRole = 'user' | 'assistant' | 'system-notice';

// ─── Entity ───────────────────────────────────────────────────────────────────

@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'session_id', type: 'int', nullable: false })
    sessionId: number;

    @Column({ name: 'role', type: 'varchar', length: 20, nullable: false })
    role: MessageRole;

    /**
     * JSON array of MessagePart objects.
     * e.g. [{ type: 'text', text: 'Hello' }, { type: 'thinking', text: '...' }]
     *
     * simple-json works across Postgres and SQLite out of the box.
     * Swap to `jsonb` in a Postgres-only migration if you need to query inside parts.
     */
    @Column({ name: 'parts', type: 'simple-json', nullable: false })
    parts: MessagePart[];

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;
}