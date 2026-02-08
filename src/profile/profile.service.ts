import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import {User} from "../user/user.entity";

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private userService: UserService) {}

  async getProfile(id: number): Promise<User | null> {
    this.logger.debug(`Fetching profile for user ID: ${id}`);
    try {
      const user = await this.userService.findOne(id);
      if (!user) {
        this.logger.warn(`User with ID ${id} not found`);
        return null;
      }
      this.logger.debug(`Profile fetched successfully for user ID: ${id}`);
      return user;
    } catch (error) {
      this.logger.error(`Error fetching profile for user ID: ${id}`, error.stack);
      throw error;
    }
  }
}
