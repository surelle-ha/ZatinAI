import {
    Controller,
    Get,
    Req,
    UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { AuthenticationGuard } from '../authentication/authentication.guard';

@UseGuards(AuthenticationGuard)
@Controller({path: 'workspaces', version: '1' })
export class WorkspaceController {
    constructor(private readonly workspaceService: WorkspaceService) {}

    /**
     * GET /workspaces/mine
     * Returns all workspaces the authenticated user is a member of.
     * Used by the client on login to populate the workspace switcher.
     */
    @Get('mine')
    findMine(@Req() req: { user: { sub: number } }) {
        return this.workspaceService.findAllByUserId(req.user.sub);
    }
}