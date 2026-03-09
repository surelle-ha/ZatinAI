import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { LessonSuite } from '../lesson-suite/lesson-suite.entity';

@Entity('lesson_files')
export class LessonFile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'suite_id', type: 'int', nullable: false })
    suiteId: number;

    /** Denormalised for direct workspace scoping without joining */
    @Column({ name: 'workspace_id', type: 'int', nullable: false })
    workspaceId: number;

    @Column({ name: 'title', type: 'varchar', length: 200, nullable: false })
    title: string;

    /** Full markdown lesson content */
    @Column({ name: 'content', type: 'text', nullable: false, default: '' })
    content: string;

    @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
    sortOrder: number;

    @Column({ name: 'estimated_minutes', type: 'int', nullable: false, default: 15 })
    estimatedMinutes: number;

    @Column({ name: 'is_enabled', type: 'boolean', nullable: false, default: true })
    isEnabled: boolean;

    @Column({ name: 'created_by', type: 'int', nullable: false })
    createdBy: number;

    @Column({ name: 'created_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @ManyToOne(() => LessonSuite, (s) => s.files, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'suite_id' })
    suite: LessonSuite;
}