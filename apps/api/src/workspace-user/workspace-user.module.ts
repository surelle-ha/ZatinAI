import { Module } from '@nestjs/common';
import {DatabaseModule} from "../database/database.module";
import {WorkspaceUserService} from "./workspace-user.service";
import {workspaceUserProviders} from "./workspace-user.provider";
import {WorkspaceController} from "../workspace/workspace.controller";
@Module({
    imports: [DatabaseModule],
    providers: [...workspaceUserProviders, WorkspaceUserService],
    exports: [WorkspaceUserService],
})
export class WorkspaceUserModule {}
