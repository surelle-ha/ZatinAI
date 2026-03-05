import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { WorkspaceSubscription, WorkspaceSubscriptionStatus } from './workspace-subscription.entity';

@Injectable()
export class WorkspaceSubscriptionService {
    constructor(
        @Inject('WORKSPACE_SUBSCRIPTION_REPOSITORY')
        private workspaceSubscriptionRepository: Repository<WorkspaceSubscription>,
    ) {}

    async create(data: Partial<WorkspaceSubscription>): Promise<WorkspaceSubscription> {
        const record = this.workspaceSubscriptionRepository.create(data);
        return this.workspaceSubscriptionRepository.save(record);
    }

    async findByWorkspace(workspaceId: number): Promise<WorkspaceSubscription[]> {
        return this.workspaceSubscriptionRepository.find({
            where: { workspaceId },
            relations: ['subscription'],
        });
    }
}