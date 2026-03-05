import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Model } from './model.entity';
import { CreateModelDto, UpdateModelDto } from './model.dto';

@Injectable()
export class ModelService {
    constructor(
        @Inject('MODEL_REPOSITORY')
        private readonly modelRepo: Repository<Model>,
    ) {}

    // ─── Read ──────────────────────────────────────────────────────────────────

    /**
     * All models for a workspace, ordered by sort_order.
     * Used by the /models page — returns active AND inactive.
     */
    async findAll(workspaceId: number): Promise<Model[]> {
        return this.modelRepo.find({
            where: { workspaceId },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    /**
     * Only active models — used by Studio to populate the model picker.
     */
    async findActive(workspaceId: number): Promise<Model[]> {
        return this.modelRepo.find({
            where: { workspaceId, isActive: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    async findOne(id: number, workspaceId: number): Promise<Model> {
        const model = await this.modelRepo.findOne({ where: { id, workspaceId } });
        if (!model) throw new NotFoundException(`Model ${id} not found`);
        return model;
    }

    // ─── Create ────────────────────────────────────────────────────────────────

    async create(workspaceId: number, userId: number, dto: CreateModelDto): Promise<Model> {
        // Prevent duplicate model values within the same workspace
        const existing = await this.modelRepo.findOne({ where: { workspaceId, value: dto.value } });
        if (existing) {
            throw new BadRequestException(`A model with value "${dto.value}" already exists`);
        }

        const model = this.modelRepo.create({
            workspaceId,
            createdBy: userId,
            label: dto.label,
            value: dto.value,
            provider: dto.provider ?? '',
            description: dto.description ?? '',
            contextWindow: dto.contextWindow ?? '',
            sortOrder: dto.sortOrder ?? 0,
            isActive: dto.isActive ?? true,
        });

        return this.modelRepo.save(model);
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    async update(id: number, workspaceId: number, dto: UpdateModelDto): Promise<Model> {
        await this.findOne(id, workspaceId);

        // Prevent duplicate value on rename
        if (dto.value) {
            const conflict = await this.modelRepo.findOne({ where: { workspaceId, value: dto.value } });
            if (conflict && conflict.id !== id) {
                throw new BadRequestException(`A model with value "${dto.value}" already exists`);
            }
        }

        await this.modelRepo
            .createQueryBuilder()
            .update(Model)
            .set({
                ...(dto.label !== undefined && { label: dto.label }),
                ...(dto.value !== undefined && { value: dto.value }),
                ...(dto.provider !== undefined && { provider: dto.provider }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.contextWindow !== undefined && { contextWindow: dto.contextWindow }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                updatedAt: () => 'NOW()',
            })
            .where('id = :id AND workspace_id = :workspaceId', { id, workspaceId })
            .execute();

        return this.findOne(id, workspaceId);
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    async remove(id: number, workspaceId: number): Promise<void> {
        await this.findOne(id, workspaceId);
        await this.modelRepo.delete({ id, workspaceId });
    }

    // ─── Seed defaults ─────────────────────────────────────────────────────────

    /**
     * Called when a workspace is first created — seeds the two default models.
     * Skips silently if models already exist.
     */
    async seedDefaults(workspaceId: number, userId: number): Promise<Model[]> {
        const existing = await this.modelRepo.count({ where: { workspaceId } });
        if (existing > 0) return this.findAll(workspaceId);

        const defaults = [
            {
                label: 'MiniMax M2',
                value: 'minimax-m2:cloud',
                provider: 'MiniMax',
                description: 'High-performance mixture-of-experts model optimized for multi-turn conversation, instruction following, and creative tasks.',
                contextWindow: '1M',
                sortOrder: 0,
                isActive: true,
            },
            {
                label: 'GLM-5',
                value: 'glm-5:cloud',
                provider: 'Zhipu AI',
                description: 'Next-generation bilingual language model with strong reasoning, coding, and long-context understanding.',
                contextWindow: '128K',
                sortOrder: 1,
                isActive: true,
            },
        ];

        const entities = defaults.map(d =>
            this.modelRepo.create({ workspaceId, createdBy: userId, ...d }),
        );

        return this.modelRepo.save(entities);
    }
}