import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {LessonService} from "./lesson.service";
import {lessonFileProviders} from "../lesson-file/lesson-file.provider";
import {lessonSuiteProviders} from "../lesson-suite/lesson-suite.provider";
import {LessonController} from "./lesson.controller";

@Module({
    imports: [DatabaseModule],
    providers: [
        ...lessonSuiteProviders,
        ...lessonFileProviders,
        LessonService
    ],
    controllers: [LessonController],
    exports: [LessonService],
})
export class LessonModule {}
