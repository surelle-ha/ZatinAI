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
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {ModelService} from './model.service';
import {CreateModelDto, UpdateModelDto} from './model.dto';
import {AuthenticationGuard} from "../authentication/authentication.guard";

@UseGuards(AuthenticationGuard)
@Controller({path: 'models', version: '1'})
export class ModelController {
    constructor(private readonly modelService: ModelService) {
    }

    private wsId(raw: string): number {
        return parseInt(raw, 10);
    }

    /**
     * GET /models
     * Returns all models (active + inactive) for the /models config page.
     *
     * GET /models?active=true
     * Returns only active models — used by Studio to populate the model picker.
     */
    @Get()
    findAll(
        @Headers('x-workspace-id') rawWsId: string,
        @Query('active') active?: string,
    ) {
        const workspaceId = this.wsId(rawWsId);
        return active === 'true'
            ? this.modelService.findActive(workspaceId)
            : this.modelService.findAll(workspaceId);
    }

    /**
     * GET /models/:id
     */
    @Get(':id')
    findOne(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.modelService.findOne(id, this.wsId(rawWsId));
    }

    /**
     * POST /models
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(
        @Headers('x-workspace-id') rawWsId: string,
        @Body() dto: CreateModelDto,
        @Req() req: { user: { sub: number } },
    ) {
        return this.modelService.create(this.wsId(rawWsId), req.user.sub, dto);
    }

    /**
     * PATCH /models/:id
     */
    @Patch(':id')
    update(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateModelDto,
    ) {
        return this.modelService.update(id, this.wsId(rawWsId), dto);
    }

    /**
     * DELETE /models/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
        @Headers('x-workspace-id') rawWsId: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.modelService.remove(id, this.wsId(rawWsId));
    }
}