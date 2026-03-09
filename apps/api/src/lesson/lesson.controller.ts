import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import {
    CreateLessonSuiteDto,
    UpdateLessonSuiteDto,
    CreateLessonFileDto,
    UpdateLessonFileDto,
    ReorderLessonFilesDto,
} from './lesson.dto';
import {AuthenticationGuard} from "../authentication/authentication.guard";

@UseGuards(AuthenticationGuard)
@Controller({path:'lessons', version: '1'})
export class LessonController {
    constructor(private readonly lessonService: LessonService) {}

    private wsId(raw: string): number {
        return parseInt(raw, 10);
    }

    // ─── Suites ───────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/lessons
     * All suites for the workspace, with files nested.
     */
    @Get()
    findAllSuites(@Headers('x-workspace-id') wsId: string) {
        return this.lessonService.findAllSuites(this.wsId(wsId));
    }

    /**
     * GET /api/v1/lessons/:suiteId
     */
    @Get(':suiteId')
    findOneSuite(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
    ) {
        return this.lessonService.findOneSuite(suiteId, this.wsId(wsId));
    }

    /**
     * POST /api/v1/lessons
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    createSuite(
        @Headers('x-workspace-id') wsId: string,
        @Body() dto: CreateLessonSuiteDto,
        @Req() req: { user: { sub: number } },
    ) {
        return this.lessonService.createSuite(this.wsId(wsId), req.user.sub, dto);
    }

    /**
     * PATCH /api/v1/lessons/:suiteId
     */
    @Patch(':suiteId')
    updateSuite(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
        @Body() dto: UpdateLessonSuiteDto,
    ) {
        return this.lessonService.updateSuite(suiteId, this.wsId(wsId), dto);
    }

    /**
     * DELETE /api/v1/lessons/:suiteId
     */
    @Delete(':suiteId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeSuite(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
    ) {
        return this.lessonService.removeSuite(suiteId, this.wsId(wsId));
    }

    // ─── Files ────────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/lessons/:suiteId/files
     */
    @Get(':suiteId/files')
    findAllFiles(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
    ) {
        return this.lessonService.findAllFiles(suiteId, this.wsId(wsId));
    }

    /**
     * GET /api/v1/lessons/:suiteId/files/:fileId
     */
    @Get(':suiteId/files/:fileId')
    findOneFile(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
        @Param('fileId', ParseIntPipe) fileId: number,
    ) {
        return this.lessonService.findOneFile(fileId, suiteId, this.wsId(wsId));
    }

    /**
     * POST /api/v1/lessons/:suiteId/files
     */
    @Post(':suiteId/files')
    @HttpCode(HttpStatus.CREATED)
    createFile(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
        @Body() dto: CreateLessonFileDto,
        @Req() req: { user: { sub: number } },
    ) {
        return this.lessonService.createFile(suiteId, this.wsId(wsId), req.user.sub, dto);
    }

    /**
     * PATCH /api/v1/lessons/:suiteId/files/:fileId
     */
    @Patch(':suiteId/files/:fileId')
    updateFile(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
        @Param('fileId', ParseIntPipe) fileId: number,
        @Body() dto: UpdateLessonFileDto,
    ) {
        return this.lessonService.updateFile(fileId, suiteId, this.wsId(wsId), dto);
    }

    /**
     * PUT /api/v1/lessons/:suiteId/files/reorder
     */
    @Put(':suiteId/files/reorder')
    reorderFiles(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
        @Body() dto: ReorderLessonFilesDto,
    ) {
        return this.lessonService.reorderFiles(suiteId, this.wsId(wsId), dto);
    }

    /**
     * DELETE /api/v1/lessons/:suiteId/files/:fileId
     */
    @Delete(':suiteId/files/:fileId')
    @HttpCode(HttpStatus.NO_CONTENT)
    removeFile(
        @Headers('x-workspace-id') wsId: string,
        @Param('suiteId', ParseIntPipe) suiteId: number,
        @Param('fileId', ParseIntPipe) fileId: number,
    ) {
        return this.lessonService.removeFile(fileId, suiteId, this.wsId(wsId));
    }
}