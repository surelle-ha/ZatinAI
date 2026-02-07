import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { workspaceProviders } from './workspace.provider';
import { WorkspaceService } from './workspace.service';

@Module({
  imports: [DatabaseModule],
  providers: [...workspaceProviders, WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
