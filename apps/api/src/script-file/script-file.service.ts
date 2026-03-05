import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import {Repository} from 'typeorm';
import {ScriptFile} from './script-file.entity';
import {Agent} from '../agent/agent.entity';
import {CreateScriptFileDto, ReorderScriptFilesDto, UpdateScriptFileDto} from './script-file.dto';

@Injectable()
export class ScriptFileService {
    constructor(
        @Inject('SCRIPT_FILE_REPOSITORY')
        private readonly fileRepo: Repository<ScriptFile>,
        @Inject('AGENT_REPOSITORY')
        private readonly agentRepo: Repository<Agent>,
    ) {
    }

    // ─── Guards ────────────────────────────────────────────────────────────────

    private async resolveAgent(agentId: number, workspaceId: number): Promise<Agent> {
        const agent = await this.agentRepo.findOne({
            where: {id: agentId, workspaceId, isEnabled: true},
        });
        if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
        return agent;
    }

    private async resolveFile(
        fileId: number,
        agentId: number,
        workspaceId: number,
    ): Promise<ScriptFile> {
        const file = await this.fileRepo.findOne({
            where: {id: fileId, agentId, workspaceId, isEnabled: true},
        });
        if (!file) throw new NotFoundException(`ScriptFile ${fileId} not found`);
        return file;
    }

    // ─── Read ──────────────────────────────────────────────────────────────────

    /**
     * Return all enabled files for an agent, ordered by sort_order ASC.
     */
    async findAll(agentId: number, workspaceId: number): Promise<ScriptFile[]> {
        await this.resolveAgent(agentId, workspaceId);
        return this.fileRepo.find({
            where: {agentId, workspaceId, isEnabled: true},
            order: {sortOrder: 'ASC', createdAt: 'ASC'},
        });
    }

    async findOne(
        fileId: number,
        agentId: number,
        workspaceId: number,
    ): Promise<ScriptFile> {
        await this.resolveAgent(agentId, workspaceId);
        return this.resolveFile(fileId, agentId, workspaceId);
    }

    // ─── Create ────────────────────────────────────────────────────────────────

    async create(
        agentId: number,
        workspaceId: number,
        userId: number,
        dto: CreateScriptFileDto,
    ): Promise<ScriptFile> {
        await this.resolveAgent(agentId, workspaceId);

        // Prevent duplicate names within the same agent
        const existing = await this.fileRepo.findOne({
            where: {agentId, workspaceId, name: dto.name, isEnabled: true},
        });
        if (existing) {
            throw new BadRequestException(
                `A file named "${dto.name}" already exists for this agent`,
            );
        }

        // If this is a bootstrap file, unset any existing bootstrap flag
        if (dto.isBootstrap) {
            await this.fileRepo
                .createQueryBuilder()
                .update(ScriptFile)
                .set({isBootstrap: false, updatedAt: () => 'NOW()'})
                .where('agent_id = :agentId AND workspace_id = :workspaceId AND is_bootstrap = true', {
                    agentId,
                    workspaceId,
                })
                .execute();
        }

        const file = this.fileRepo.create({
            agentId,
            workspaceId,
            createdBy: userId,
            name: dto.name,
            content: dto.content,
            sortOrder: dto.sortOrder,
            isBootstrap: dto.isBootstrap,
            isEnabled: true,
        });

        return this.fileRepo.save(file);
    }

    // ─── Update ────────────────────────────────────────────────────────────────

    async update(
        fileId: number,
        agentId: number,
        workspaceId: number,
        dto: UpdateScriptFileDto,
    ): Promise<ScriptFile> {
        await this.resolveAgent(agentId, workspaceId);
        await this.resolveFile(fileId, agentId, workspaceId);

        // Prevent duplicate names on rename
        if (dto.name) {
            const conflict = await this.fileRepo.findOne({
                where: {agentId, workspaceId, name: dto.name, isEnabled: true},
            });
            if (conflict && conflict.id !== fileId) {
                throw new BadRequestException(
                    `A file named "${dto.name}" already exists for this agent`,
                );
            }
        }

        // If promoting to bootstrap, demote the current bootstrap first
        if (dto.isBootstrap === true) {
            await this.fileRepo
                .createQueryBuilder()
                .update(ScriptFile)
                .set({isBootstrap: false, updatedAt: () => 'NOW()'})
                .where(
                    'agent_id = :agentId AND workspace_id = :workspaceId AND is_bootstrap = true AND id != :fileId',
                    {agentId, workspaceId, fileId},
                )
                .execute();
        }

        await this.fileRepo
            .createQueryBuilder()
            .update(ScriptFile)
            .set({
                ...(dto.name !== undefined && {name: dto.name}),
                ...(dto.content !== undefined && {content: dto.content}),
                ...(dto.sortOrder !== undefined && {sortOrder: dto.sortOrder}),
                ...(dto.isBootstrap !== undefined && {isBootstrap: dto.isBootstrap}),
                updatedAt: () => 'NOW()',
            })
            .where('id = :fileId AND agent_id = :agentId AND workspace_id = :workspaceId', {
                fileId,
                agentId,
                workspaceId,
            })
            .execute();

        return this.resolveFile(fileId, agentId, workspaceId);
    }

    // ─── Bulk reorder ──────────────────────────────────────────────────────────

    /**
     * Update sort_order for multiple files in one round-trip.
     * Frontend sends the new order after drag-and-drop.
     */
    async reorder(
        agentId: number,
        workspaceId: number,
        dto: ReorderScriptFilesDto,
    ): Promise<ScriptFile[]> {
        await this.resolveAgent(agentId, workspaceId);

        // Update each file's sort_order individually via query builder
        await Promise.all(
            dto.files.map(({id, sortOrder}) =>
                this.fileRepo
                    .createQueryBuilder()
                    .update(ScriptFile)
                    .set({sortOrder, updatedAt: () => 'NOW()'})
                    .where(
                        'id = :id AND agent_id = :agentId AND workspace_id = :workspaceId AND is_enabled = true',
                        {id, agentId, workspaceId},
                    )
                    .execute(),
            ),
        );

        return this.findAll(agentId, workspaceId);
    }

    // ─── Delete ────────────────────────────────────────────────────────────────

    /**
     * Soft-delete. Bootstrap files cannot be deleted — rename/replace them instead.
     */
    async remove(
        fileId: number,
        agentId: number,
        workspaceId: number,
    ): Promise<void> {
        await this.resolveAgent(agentId, workspaceId);
        const file = await this.resolveFile(fileId, agentId, workspaceId);

        if (file.isBootstrap) {
            throw new BadRequestException('The bootstrap file cannot be deleted');
        }

        // Ensure at least one file remains
        const count = await this.fileRepo.count({
            where: {agentId, workspaceId, isEnabled: true},
        });
        if (count <= 1) {
            throw new BadRequestException('An agent must have at least one instruction file');
        }

        await this.fileRepo
            .createQueryBuilder()
            .update(ScriptFile)
            .set({isEnabled: false, updatedAt: () => 'NOW()'})
            .where('id = :fileId AND agent_id = :agentId AND workspace_id = :workspaceId', {
                fileId,
                agentId,
                workspaceId,
            })
            .execute();
    }

    // ─── Bulk upsert (used on initial agent load to seed defaults) ─────────────

    /**
     * Called when a new agent is created — seeds the default bootstrap + rules + context files.
     * Skips silently if files already exist for this agent.
     */
    async seedDefaults(
        agentId: number,
        workspaceId: number,
        userId: number,
        agentName: string,
    ): Promise<ScriptFile[]> {
        const existing = await this.fileRepo.count({
            where: {agentId, workspaceId, isEnabled: true},
        });
        if (existing > 0) return this.findAll(agentId, workspaceId);

        const defaults = [
            {
                name: 'bootstrap.md',
                content: `# ${agentName} — Bootstrap\n\nYou are **${agentName}**.\n\nBefore responding to any message, read and internalize the following instruction files (provided below in order):\n\n- \`rules.md\`\n- \`context.md\`\n\nEach file defines a specific aspect of your behavior. Follow all instructions across all files consistently.`,
                sortOrder: 0,
                isBootstrap: true,
            },
            {
                name: 'rules.md',
                content: `# Rules\n\n- Be concise and clear\n- Use bullet points for lists\n- Always be polite and professional`,
                sortOrder: 1,
                isBootstrap: false,
            },
            {
                name: 'context.md',
                content: `# Context\n\nAdd background knowledge or domain context here.`,
                sortOrder: 2,
                isBootstrap: false,
            },
        ];

        const entities = defaults.map(d =>
            this.fileRepo.create({
                agentId,
                workspaceId,
                createdBy: userId,
                isEnabled: true,
                ...d,
            }),
        );

        return this.fileRepo.save(entities);
    }
}