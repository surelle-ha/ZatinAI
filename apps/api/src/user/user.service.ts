import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { WorkspaceService } from '../workspace/workspace.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
    private workspaceService: WorkspaceService,
  ) {}

  /**
   * Generates a unique username based on the provided email or a timestamp if email is not valid.
   * It ensures that the generated username does not already exist in the database by appending a numeric suffix if necessary.
   * @param email The email address to base the username on. If not provided or invalid, a timestamp-based username will be used.
   * @returns A unique username string.
   * @throws Error if there is an issue accessing the database to check for existing usernames.
   */
  private async generateUniqueUsername(email?: string): Promise<string> {
    const rawEmail = (email ?? '').trim();
    let base = `user${Date.now()}`;

    if (rawEmail && rawEmail.includes('@')) {
      let local = rawEmail.split('@')[0].trim().toLowerCase();
      local = local.split('+')[0];
      local = local.replace(/[^a-z0-9._-]/g, '');
      if (local.length > 0) base = local;
    }

    let candidate = base;
    let suffix = 1;
    while (true) {
      const existing = await this.userRepository.findOneBy({ username: candidate });
      if (!existing) return candidate;
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
  }

  /**
   * Find all users.
   * @returns An array of User entities.
   * @throws Error if there is an issue accessing the database to retrieve users.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * Find a user by its ID.
   * @returns The User entity with the specified ID.
   * @throws NotFoundException if the user with the given ID does not exist.
   * @throws Error if there is an issue accessing the database to retrieve the user.
   */
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  /**
   * Find a user by its email address.
   * @returns The User entity with the specified email, or null if no user is found.
   * @throws Error if there is an issue accessing the database to retrieve the user.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ email });
  }

  /**
   * Create a new user and automatically create a default workspace for them.
   * The username is generated based on the email or a timestamp to ensure uniqueness.
   * @returns The newly created User entity.
   * @throws Error if there is an issue accessing the database to create the user or workspace.
   */
  async create(user: Partial<User>): Promise<User> {
    this.logger.debug('Creating user: ' + JSON.stringify({ ...user, password: '[REDACTED]' }));
    const username = await this.generateUniqueUsername(user.email);

    const processedUser: Partial<User> = {
      ...user,
      username,
    };

    const newUserEntity = this.userRepository.create(processedUser);
    return this.userRepository.save(newUserEntity);  // ← just save and return
  }

  /**
   * Update an existing user by its ID.
   * @returns The updated User entity.
   * @throws NotFoundException if the user with the given ID does not exist.
   * @throws Error if there is an issue accessing the database to update the user.
   */
  async update(id: number, user: Partial<User>): Promise<User> {
    await this.userRepository.update(id, user);
    return this.findOne(id);
  }

  /**
   * Delete a user by its ID. Supports both soft and hard deletion based on the specified type.
   * @returns void
   * @throws NotFoundException if the user with the given ID does not exist.
   * @throws Error if there is an issue accessing the database to delete the user.
   */
  async delete(id: number, type: 'soft' | 'hard'): Promise<User> {
    const user = await this.findOne(id);
    const result = type === 'soft' ? await this.userRepository.softDelete(id) : await this.userRepository.delete(id);
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}
