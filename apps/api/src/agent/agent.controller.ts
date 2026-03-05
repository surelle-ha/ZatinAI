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
    Req,
    UseGuards,
} from '@nestjs/common';
import {AgentService} from './agent.service';
import {CreateAgentDto, UpdateAgentDto} from './agent.dto';
import {AuthenticationGuard} from "../authentication/authentication.guard";

@UseGuards(AuthenticationGuard)
@Controller({path: 'agents', version: '1'})
export class AgentController {
    constructor(private readonly agentService: AgentService) {
    }

    /**
     * GET /agents
     * List all enabled agents in the workspace.
     */
    @Get()
    findAll(
        @Headers('x-workspace-id') rawWorkspaceId: string,
    ) {
        const workspaceId = parseInt(rawWorkspaceId, 10);
        return this.agentService.findAll(workspaceId);
    }

    /**
     * GET /agents/:id
     */
    @Get(':id')
    findOne(
        @Headers('x-workspace-id') rawWorkspaceId: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const workspaceId = parseInt(rawWorkspaceId, 10);
        return this.agentService.findOne(id, workspaceId);
    }

    /**
     * POST /agents
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @Headers('x-workspace-id') rawWorkspaceId: string,
        @Body() dto: CreateAgentDto,
        @Req() req: { user: { sub: number } },
    ) {
        const workspaceId = parseInt(rawWorkspaceId, 10);
        return this.agentService.create(workspaceId, req.user.sub, dto);
    }

    /**
     * PATCH /agents/:id
     */
    @Patch(':id')
    update(
        @Headers('x-workspace-id') rawWorkspaceId: string,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateAgentDto,
    ) {
        const workspaceId = parseInt(rawWorkspaceId, 10);
        return this.agentService.update(id, workspaceId, dto);
    }

    /**
     * DELETE /agents/:id
     * Soft-deletes (isEnabled = false).
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
        @Headers('x-workspace-id') rawWorkspaceId: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const workspaceId = parseInt(rawWorkspaceId, 10);
        return this.agentService.remove(id, workspaceId);
    }
}