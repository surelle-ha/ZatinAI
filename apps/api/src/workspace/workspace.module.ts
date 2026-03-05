import {Module} from '@nestjs/common';
import {DatabaseModule} from '../database/database.module';
import {workspaceProviders} from './workspace.provider';
import {WorkspaceService} from './workspace.service';
import {workspaceUserProviders} from "../workspace-user/workspace-user.provider";
import {WorkspaceUserService} from "../workspace-user/workspace-user.service";
import {WorkspaceController} from "./workspace.controller";

@Module({
    imports: [DatabaseModule],
    providers: [
        ...workspaceProviders,
        ...workspaceUserProviders,
        WorkspaceService
    ],
    controllers: [WorkspaceController],
    exports: [WorkspaceService],
})
export class WorkspaceModule {
}
