import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Workspace } from './workspace.entity';

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject('WORKSPACE_REPOSITORY')
    private workspaceRepository: Repository<Workspace>,
  ) {}

  create(workspace: Partial<Workspace>): Promise<Workspace> {
    const newWorkspace = this.workspaceRepository.create(workspace);
    return this.workspaceRepository.save(newWorkspace);
  }

  /**
   * Find all workspaces.
   * @returns An array of Workspace entities.
   */
  async findAll(): Promise<Workspace[]> {
    return this.workspaceRepository.find();
  }

  /**
   * Find a workspace by its ID.
   * @param id The ID of the workspace to find.
   * @returns The Workspace entity with the specified ID.
   * @throws NotFoundException if the workspace with the given ID does not exist.
   */
  async findOne(id: number): Promise<Workspace> {
    const workspace = await this.workspaceRepository.findOneBy({ id });
    if (!workspace) {
      throw new NotFoundException(`Workspace with id ${id} not found`);
    }
    return workspace;
  }
}
