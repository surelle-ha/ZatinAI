import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToMany,
} from 'typeorm';
import { LessonFile } from '../lesson-file/lesson-file.entity';

@Entity('lesson_suites')
export class LessonSuite {
    @PrimaryGeneratedColumn()
    id: number;

    /** Workspace scoping — all queries filter by this */
    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'title', type: 'varchar', length: 200, nullable: false })
    title: string;

    @Column({ name: 'description', type: 'text', nullable: false, default: '' })
    description: string;

    @Column({ name: 'subject', type: 'varchar', length: 100, nullable: false, default: '' })
    subject: string;

    @Column({
        name: 'level',
        type: 'varchar',
        length: 20,
        nullable: false,
        default: 'beginner',
    })
    level: string; // 'beginner' | 'intermediate' | 'advanced'

    @Column({ name: 'cover_emoji', type: 'varchar', length: 10, nullable: false, default: '📚' })
    coverEmoji: string;

    /**
     * Optional FK to agents table — the AI tutor assigned to this suite.
     * Nullable: a suite can exist without an assigned agent.
     */
    @Column({ name: 'assigned_agent_id', type: 'int', nullable: true, default: null })
    assignedAgentId: number | null;

    /** Published suites are visible to learners */
    @Column({ name: 'is_published', type: 'boolean', nullable: false, default: false })
    isPublished: boolean;

    @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: true })
    isEnabled: boolean;

    @Column({ name: 'created_by', type: 'int', nullable: false })
    createdBy: number;

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @OneToMany(() => LessonFile, (f) => f.suite, { cascade: true, eager: false })
    files: LessonFile[];
}