import { Controller } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller({ path: 'profile', version: '1' })
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}
}
