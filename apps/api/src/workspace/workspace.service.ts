import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Workspace } from './workspace.entity';
import { WorkspaceUser } from '../workspace-user/workspace-user.entity';

@Injectable()
export class WorkspaceService {
  constructor(
      @Inject('WORKSPACE_REPOSITORY')
      private workspaceRepository: Repository<Workspace>,

      @Inject('WORKSPACE_USER_REPOSITORY')
      private workspaceUserRepository: Repository<WorkspaceUser>,
  ) {}

  create(workspace: Partial<Workspace>): Promise<Workspace> {
    const newWorkspace = this.workspaceRepository.create(workspace);
    return this.workspaceRepository.save(newWorkspace);
  }

  async findAll(): Promise<Workspace[]> {
    return this.workspaceRepository.find();
  }

  async findOneByPublicName(publicName: string): Promise<Workspace | null> {
    return await this.workspaceRepository.findOneBy({ publicName });
  }

  async findOne(id: number): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOneBy({ id });
    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${id} not found`);
    }
    return workspace;
  }

  /**
   * Returns all workspaces the given user is a member of.
   * Joins through workspace_user to find memberships, then loads workspace details.
   * Only returns enabled workspaces.
   */
  async findAllByUserId(userId: number): Promise<Workspace[]> {
    const memberships = await this.workspaceUserRepository.find({
      where: { userId, isActive: true },
    });

    if (!memberships.length) return [];

    const workspaceIds = memberships.map(m => m.workspaceId);

    return this.workspaceRepository
        .createQueryBuilder('w')
        .where('w.id IN (:...ids)', { ids: workspaceIds })
        .andWhere('w.is_enabled = true')
        .orderBy('w.id', 'ASC')
        .getMany();
  }
}