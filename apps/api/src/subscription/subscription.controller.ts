import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    ParseIntPipe,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './subscription.entity';

@Controller({ path: 'subscriptions', version: '1' })
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) {}

    /**
     * Create a new Subscription plan.
     * POST /subscriptions
     */
    @Post()
    create(@Body() body: Partial<Subscription>): Promise<Subscription> {
        return this.subscriptionService.create(body);
    }

    /**
     * Get all Subscription plans.
     * GET /subscriptions
     */
    @Get()
    findAll(): Promise<Subscription[]> {
        return this.subscriptionService.findAll();
    }

    /**
     * Get a single Subscription plan by ID.
     * GET /subscriptions/:id
     */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number): Promise<Subscription> {
        return this.subscriptionService.findOne(id);
    }
}