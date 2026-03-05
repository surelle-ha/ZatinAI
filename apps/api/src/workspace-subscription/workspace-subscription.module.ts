import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { workspaceSubscriptionProviders } from './workspace-subscription.provider';
import { WorkspaceSubscriptionService } from './workspace-subscription.service';

@Module({
    imports: [DatabaseModule],
    providers: [...workspaceSubscriptionProviders, WorkspaceSubscriptionService],
    exports: [WorkspaceSubscriptionService],
})
export class WorkspaceSubscriptionModule {}
