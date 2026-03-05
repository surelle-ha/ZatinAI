import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject('SUBSCRIPTION_REPOSITORY')
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  create(subscription: Partial<Subscription>): Promise<Subscription> {
    const newSubscription = this.subscriptionRepository.create(subscription);
    return this.subscriptionRepository.save(newSubscription);
  }

  /**
   * Find all Subscriptions.
   * @returns An array of Subscription entities.
   */
  async findAll(): Promise<Subscription[]> {
    return this.subscriptionRepository.find();
  }

  /**
   * Find a Subscription by its ID.
   * @param id The ID of the Subscription to find.
   * @returns The Subscription entity with the specified ID.
   * @throws NotFoundException if the Subscription with the given ID does not exist.
   */
  async findOne(id: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOneBy({ id });
    if (!subscription) {
      throw new NotFoundException(`Subscription with id ${id} not found`);
    }
    return subscription;
  }
}
