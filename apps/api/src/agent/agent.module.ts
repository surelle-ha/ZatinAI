import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { agentProviders } from './agent.provider';
import { AgentService } from './agent.service';
import {AgentController} from "./agent.controller";
import {workspaceProviders} from "../workspace/workspace.provider";
import {ScriptFileModule} from "../script-file/script-file.module";
import {scriptFileProviders} from "../script-file/script-file.provider";

@Module({
    imports: [
        DatabaseModule,
    ],
    providers: [
        ...agentProviders,
        ...workspaceProviders,
        ...scriptFileProviders,
        AgentService
    ],
    controllers: [AgentController],
    exports: [AgentService],
})
export class AgentModule {}
