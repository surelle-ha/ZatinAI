import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import {
    CreateLessonSuiteDto,
    UpdateLessonSuiteDto,
    CreateLessonFileDto,
    UpdateLessonFileDto,
    ReorderLessonFilesDto,
} from './lesson.dto';
import {LessonSuite} from "../lesson-suite/lesson-suite.entity";
import {LessonFile} from "../lesson-file/lesson-file.entity";

@Injectable()
export class LessonService {
    constructor(
        @Inject('LESSON_SUITE_REPOSITORY')
        private readonly suiteRepo: Repository<LessonSuite>,

        @Inject('LESSON_FILE_REPOSITORY')
        private readonly fileRepo: Repository<LessonFile>,
    ) {}

    // ─── Guards ────────────────────────────────────────────────────────────────

    private async resolveSuite(suiteId: number, workspaceId: number): Promise<LessonSuite> {
        const suite = await this.suiteRepo.findOne({
            where: { id: suiteId, workspaceId, isEnabled: true },
        });
        if (!suite) throw new NotFoundException(`LessonSuite ${suiteId} not found`);
        return suite;
    }

    private async resolveFile(
        fileId: number,
        suiteId: number,
        workspaceId: number,
    ): Promise<LessonFile> {
        const file = await this.fileRepo.findOne({
            where: { id: fileId, suiteId, workspaceId, isEnabled: true },
        });
        if (!file) throw new NotFoundException(`LessonFile ${fileId} not found`);
        return file;
    }

    // ─── Suite: Read ──────────────────────────────────────────────────────────

    /** All suites for a workspace, ordered newest first, with files included */
    async findAllSuites(workspaceId: number): Promise<LessonSuite[]> {
        return this.suiteRepo.find({
            where: { workspaceId, isEnabled: true },
            relations: ['files'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOneSuite(suiteId: number, workspaceId: number): Promise<LessonSuite> {
        const suite = await this.suiteRepo.findOne({
            where: { id: suiteId, workspaceId, isEnabled: true },
            relations: ['files'],
        });
        if (!suite) throw new NotFoundException(`LessonSuite ${suiteId} not found`);
        // Sort files by sort_order
        suite.files = suite.files
            .filter((f) => f.isEnabled)
            .sort((a, b) => a.sortOrder - b.sortOrder);
        return suite;
    }

    // ─── Suite: Create ────────────────────────────────────────────────────────

    async createSuite(
        workspaceId: number,
        userId: number,
        dto: CreateLessonSuiteDto,
    ): Promise<LessonSuite> {
        const suite = this.suiteRepo.create({
            workspaceId,
            createdBy: userId,
            title: dto.title.trim(),
            description: dto.description ?? '',
            subject: dto.subject ?? '',
            level: dto.level,
            coverEmoji: dto.coverEmoji ?? '📚',
            assignedAgentId: dto.assignedAgentId ?? null,
            isPublished: false,
            isEnabled: true,
        });
        return this.suiteRepo.save(suite);
    }

    // ─── Suite: Update ────────────────────────────────────────────────────────

    async updateSuite(
        suiteId: number,
        workspaceId: number,
        dto: UpdateLessonSuiteDto,
    ): Promise<LessonSuite> {
        await this.resolveSuite(suiteId, workspaceId);

        await this.suiteRepo
            .createQueryBuilder()
            .update(LessonSuite)
            .set({
                ...(dto.title !== undefined && { title: dto.title.trim() }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.subject !== undefined && { subject: dto.subject }),
                ...(dto.level !== undefined && { level: dto.level }),
                ...(dto.coverEmoji !== undefined && { coverEmoji: dto.coverEmoji }),
                ...(dto.assignedAgentId !== undefined && { assignedAgentId: dto.assignedAgentId }),
                ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
                updatedAt: () => 'NOW()',
            })
            .where('id = :suiteId AND workspace_id = :workspaceId', { suiteId, workspaceId })
            .execute();

        return this.findOneSuite(suiteId, workspaceId);
    }

    // ─── Suite: Delete ────────────────────────────────────────────────────────

    async removeSuite(suiteId: number, workspaceId: number): Promise<void> {
        await this.resolveSuite(suiteId, workspaceId);
        await this.suiteRepo
            .createQueryBuilder()
            .update(LessonSuite)
            .set({ isEnabled: false, updatedAt: () => 'NOW()' })
            .where('id = :suiteId AND workspace_id = :workspaceId', { suiteId, workspaceId })
            .execute();
    }

    // ─── Files: Read ──────────────────────────────────────────────────────────

    async findAllFiles(suiteId: number, workspaceId: number): Promise<LessonFile[]> {
        await this.resolveSuite(suiteId, workspaceId);
        return this.fileRepo.find({
            where: { suiteId, workspaceId, isEnabled: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    async findOneFile(
        fileId: number,
        suiteId: number,
        workspaceId: number,
    ): Promise<LessonFile> {
        await this.resolveSuite(suiteId, workspaceId);
        return this.resolveFile(fileId, suiteId, workspaceId);
    }

    // ─── Files: Create ────────────────────────────────────────────────────────

    async createFile(
        suiteId: number,
        workspaceId: number,
        userId: number,
        dto: CreateLessonFileDto,
    ): Promise<LessonFile> {
        await this.resolveSuite(suiteId, workspaceId);

        // Auto-increment sortOrder if not provided
        let sortOrder = dto.sortOrder;
        if (sortOrder === undefined || sortOrder === null) {
            const count = await this.fileRepo.count({ where: { suiteId, workspaceId, isEnabled: true } });
            sortOrder = count;
        }

        const file = this.fileRepo.create({
            suiteId,
            workspaceId,
            createdBy: userId,
            title: dto.title.trim(),
            content: dto.content ?? `# ${dto.title.trim()}\n\nStart writing your lesson here...`,
            sortOrder,
            estimatedMinutes: dto.estimatedMinutes ?? 15,
            isEnabled: true,
        });

        return this.fileRepo.save(file);
    }

    // ─── Files: Update ────────────────────────────────────────────────────────

    async updateFile(
        fileId: number,
        suiteId: number,
        workspaceId: number,
        dto: UpdateLessonFileDto,
    ): Promise<LessonFile> {
        await this.resolveSuite(suiteId, workspaceId);
        await this.resolveFile(fileId, suiteId, workspaceId);

        await this.fileRepo
            .createQueryBuilder()
            .update(LessonFile)
            .set({
                ...(dto.title !== undefined && { title: dto.title.trim() }),
                ...(dto.content !== undefined && { content: dto.content }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.estimatedMinutes !== undefined && { estimatedMinutes: dto.estimatedMinutes }),
                updatedAt: () => 'NOW()',
            })
            .where('id = :fileId AND suite_id = :suiteId AND workspace_id = :workspaceId', {
                fileId,
                suiteId,
                workspaceId,
            })
            .execute();

        return this.resolveFile(fileId, suiteId, workspaceId);
    }

    // ─── Files: Reorder ───────────────────────────────────────────────────────

    async reorderFiles(
        suiteId: number,
        workspaceId: number,
        dto: ReorderLessonFilesDto,
    ): Promise<LessonFile[]> {
        await this.resolveSuite(suiteId, workspaceId);

        await Promise.all(
            dto.files.map(({ id, sortOrder }) =>
                this.fileRepo
                    .createQueryBuilder()
                    .update(LessonFile)
                    .set({ sortOrder, updatedAt: () => 'NOW()' })
                    .where(
                        'id = :id AND suite_id = :suiteId AND workspace_id = :workspaceId AND is_enabled = true',
                        { id, suiteId, workspaceId },
                    )
                    .execute(),
            ),
        );

        return this.findAllFiles(suiteId, workspaceId);
    }

    // ─── Files: Delete ────────────────────────────────────────────────────────

    async removeFile(
        fileId: number,
        suiteId: number,
        workspaceId: number,
    ): Promise<void> {
        await this.resolveSuite(suiteId, workspaceId);
        await this.resolveFile(fileId, suiteId, workspaceId);

        await this.fileRepo
            .createQueryBuilder()
            .update(LessonFile)
            .set({ isEnabled: false, updatedAt: () => 'NOW()' })
            .where('id = :fileId AND suite_id = :suiteId AND workspace_id = :workspaceId', {
                fileId,
                suiteId,
                workspaceId,
            })
            .execute();
    }
}