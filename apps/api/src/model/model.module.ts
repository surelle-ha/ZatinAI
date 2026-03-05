import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {ModelService} from "./model.service";
import {ModelController} from "./model.controller";
import {modelProviders} from "./model.provider";

@Module({
    imports: [DatabaseModule],
    providers: [
        ...modelProviders,
        ModelService
    ],
    controllers: [ModelController],
    exports: [ModelService],
})
export class ModelModule {}
