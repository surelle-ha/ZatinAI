import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {ScriptFileService} from "./script-file.service";
import {ScriptFileController} from "./script-file.controller";
import {scriptFileProviders} from "./script-file.provider";
import {agentProviders} from "../agent/agent.provider";

@Module({
    imports: [DatabaseModule],
    providers: [
        ...scriptFileProviders,
        ...agentProviders,
        ScriptFileService
    ],
    controllers: [ScriptFileController],
    exports: [ScriptFileService],
})
export class ScriptFileModule {}
