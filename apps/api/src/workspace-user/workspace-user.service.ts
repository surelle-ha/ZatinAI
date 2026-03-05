import {
    Injectable,
    Inject,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { WorkspaceUser, WorkspaceUserRole } from './workspace-user.entity';

@Injectable()
export class WorkspaceUserService {
    constructor(
        @Inject('WORKSPACE_USER_REPOSITORY')
        private workspaceUserRepository: Repository<WorkspaceUser>,
    ) {}

    /**
     * Add a user to a workspace.
     */
    async create(data: Partial<WorkspaceUser>): Promise<WorkspaceUser> {
        const existing = await this.workspaceUserRepository.findOneBy({
            workspaceId: data.workspaceId,
            userId: data.userId,
        });

        if (existing) {
            throw new ConflictException(
                `User ${data.userId} is already a member of workspace ${data.workspaceId}`,
            );
        }

        const workspaceUser = this.workspaceUserRepository.create(data);
        return this.workspaceUserRepository.save(workspaceUser);
    }

    /**
     * Get all members of a workspace.
     */
    async findAllByWorkspace(workspaceId: number): Promise<WorkspaceUser[]> {
        return this.workspaceUserRepository.find({
            where: { workspaceId },
            relations: ['user'],
        });
    }

    /**
     * Get a single workspace-user record.
     */
    async findOne(id: number): Promise<WorkspaceUser> {
        const record = await this.workspaceUserRepository.findOne({
            where: { id },
            relations: ['user', 'workspace'],
        });

        if (!record) {
            throw new NotFoundException(`WorkspaceUser with id ${id} not found`);
        }

        return record;
    }

    /**
     * Update a user's role in a workspace.
     */
    async updateRole(id: number, role: WorkspaceUserRole): Promise<WorkspaceUser> {
        const record = await this.findOne(id);
        record.role = role;
        return this.workspaceUserRepository.save(record);
    }

    /**
     * Remove a user from a workspace (soft delete).
     */
    async remove(id: number): Promise<void> {
        const record = await this.findOne(id);
        await this.workspaceUserRepository.softRemove(record);
    }
}