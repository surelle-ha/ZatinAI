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
import { ScriptFileService } from './script-file.service';
import {CreateScriptFileDto, ReorderScriptFilesDto, UpdateScriptFileDto} from './script-file.dto';
import {AuthenticationGuard} from "../authentication/authentication.guard";

/**
 * All routes are nested under agents/:agentId so workspace + agent scoping
 * is enforced on every request without repeating the logic in each handler.
 *
 * Base path (registered in AgentModule): /agents/:agentId/files
 */
@UseGuards(AuthenticationGuard)
@Controller({path: 'agents/:agentId/files', version: '1'})
export class ScriptFileController {
    constructor(private readonly fileService: ScriptFileService) {}

    private workspaceId(raw: string): number {
        return parseInt(raw, 10);
    }

    /**
     * GET /agents/:agentId/files
     * List all files for an agent, ordered by sort_order.
     */
    @Get()
    findAll(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('agentId', ParseIntPipe) agentId: number,
    ) {
        return this.fileService.findAll(agentId, this.workspaceId(rawWsId));
    }

    /**
     * GET /agents/:agentId/files/:id
     */
    @Get(':id')
    findOne(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('agentId', ParseIntPipe) agentId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.fileService.findOne(id, agentId, this.workspaceId(rawWsId));
    }

    /**
     * POST /agents/:agentId/files
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('agentId', ParseIntPipe) agentId: number,
        @Body() dto: CreateScriptFileDto,
        @Req() req: { user: { sub: number } },
    ) {
        return this.fileService.create(
            agentId,
            this.workspaceId(rawWsId),
            req.user.sub,
            dto,
        );
    }

    /**
     * PATCH /agents/:agentId/files/:id
     */
    @Patch(':id')
    update(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('agentId', ParseIntPipe) agentId: number,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateScriptFileDto,
    ) {
        return this.fileService.update(id, agentId, this.workspaceId(rawWsId), dto);
    }

    /**
     * PUT /agents/:agentId/files/reorder
     * Bulk-update sort_order for all files in one request.
     * Use PUT (idempotent full replacement of ordering).
     */
    @Put('reorder')
    reorder(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('agentId', ParseIntPipe) agentId: number,
        @Body() dto: ReorderScriptFilesDto,
    ) {
        return this.fileService.reorder(agentId, this.workspaceId(rawWsId), dto);
    }

    /**
     * DELETE /agents/:agentId/files/:id
     * Soft-delete. Bootstrap files and last-remaining files are rejected.
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('agentId', ParseIntPipe) agentId: number,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.fileService.remove(id, agentId, this.workspaceId(rawWsId));
    }
}