import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthenticationGuard } from '../authentication/authentication.guard';
import { User } from '../user/user.entity';
import type { UserRequest } from '../config/interfaces';

@Controller({ path: ['profile', 'me'], version: '1' })
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @UseGuards(AuthenticationGuard)
  async getProfile(@Request() req: UserRequest): Promise<User | null> {
    return await this.profileService.getProfile(req.user.sub);
  }
}
