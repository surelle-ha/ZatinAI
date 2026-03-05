import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Agent } from './agent.entity';
import { ScriptFile } from '../script-file/script-file.entity';
import { Workspace } from '../workspace/workspace.entity';
import { CreateAgentDto, UpdateAgentDto } from './agent.dto';

@Injectable()
export class AgentService {
    constructor(
        @Inject('AGENT_REPOSITORY')
        private readonly agentRepo: Repository<Agent>,

        @Inject('WORKSPACE_REPOSITORY')
        private readonly workspaceRepo: Repository<Workspace>,

        @Inject('SCRIPT_FILE_REPOSITORY')
        private readonly fileRepo: Repository<ScriptFile>,
    ) {}

    // ─── Guards ───────────────────────────────────────────────────────────────

    private async resolveWorkspace(workspaceId: number): Promise<Workspace> {
        const workspace = await this.workspaceRepo.findOne({
            where: { id: workspaceId, isEnabled: true },
        });
        if (!workspace) throw new NotFoundException(`Workspace ${workspaceId} not found`);
        return workspace;
    }

    private async resolveAgent(agentId: number, workspaceId: number): Promise<Agent> {
        const agent = await this.agentRepo.findOne({
            where: { id: agentId, workspaceId, isEnabled: true },
        });
        if (!agent) throw new NotFoundException(`Agent ${agentId} not found`);
        return agent;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Attach the agent's script files (ordered by sort_order) to the agent object.
     */
    private async withFiles(agent: Agent): Promise<Agent & { files: ScriptFile[] }> {
        const files = await this.fileRepo.find({
            where: { agentId: agent.id, workspaceId: agent.workspaceId, isEnabled: true },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
        return { ...agent, files };
    }

    /**
     * Seed the three default files (bootstrap, rules, context) for a new agent.
     */
    private async seedDefaultFiles(
        agentId: number,
        workspaceId: number,
        userId: number,
        agentName: string,
    ): Promise<ScriptFile[]> {
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
            this.fileRepo.create({ agentId, workspaceId, createdBy: userId, isEnabled: true, ...d }),
        );

        return this.fileRepo.save(entities);
    }

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    async findAll(workspaceId: number): Promise<(Agent & { files: ScriptFile[] })[]> {
        await this.resolveWorkspace(workspaceId);
        const agents = await this.agentRepo.find({
            where: { workspaceId, isEnabled: true },
            order: { createdAt: 'ASC' },
        });
        return Promise.all(agents.map(a => this.withFiles(a)));
    }

    async findOne(agentId: number, workspaceId: number): Promise<Agent & { files: ScriptFile[] }> {
        await this.resolveWorkspace(workspaceId);
        const agent = await this.resolveAgent(agentId, workspaceId);
        return this.withFiles(agent);
    }

    async create(
        workspaceId: number,
        userId: number,
        dto: CreateAgentDto,
    ): Promise<Agent & { files: ScriptFile[] }> {
        await this.resolveWorkspace(workspaceId);

        const agent = await this.agentRepo.save(
            this.agentRepo.create({
                workspaceId,
                createdBy: userId,
                name: dto.name,
                model: dto.model,
                isEnabled: true,
            }),
        );

        // Seed default instruction files immediately after creation
        const files = await this.seedDefaultFiles(agent.id, workspaceId, userId, dto.name);
        return { ...agent, files };
    }

    async update(
        agentId: number,
        workspaceId: number,
        dto: UpdateAgentDto,
    ): Promise<Agent & { files: ScriptFile[] }> {
        await this.resolveWorkspace(workspaceId);
        await this.resolveAgent(agentId, workspaceId);

        await this.agentRepo
            .createQueryBuilder()
            .update(Agent)
            .set({
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.model !== undefined && { model: dto.model }),
                ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
                updatedAt: () => 'NOW()',
            })
            .where('id = :id AND workspace_id = :workspaceId', { id: agentId, workspaceId })
            .execute();

        return this.findOne(agentId, workspaceId);
    }

    async remove(agentId: number, workspaceId: number): Promise<void> {
        await this.resolveWorkspace(workspaceId);
        await this.resolveAgent(agentId, workspaceId);

        // Soft-delete agent
        await this.agentRepo
            .createQueryBuilder()
            .update(Agent)
            .set({ isEnabled: false, updatedAt: () => 'NOW()' })
            .where('id = :id AND workspace_id = :workspaceId', { id: agentId, workspaceId })
            .execute();

        // Cascade soft-delete all files belonging to this agent
        await this.fileRepo
            .createQueryBuilder()
            .update(ScriptFile)
            .set({ isEnabled: false, updatedAt: () => 'NOW()' })
            .where('agent_id = :agentId AND workspace_id = :workspaceId', { agentId, workspaceId })
            .execute();
    }
}