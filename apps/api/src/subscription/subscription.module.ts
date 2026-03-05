import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { subscriptionProviders } from './subscription.provider';
import { SubscriptionService } from './subscription.service';
import {SubscriptionController} from "./subscription.controller";

@Module({
    imports: [DatabaseModule],
    providers: [...subscriptionProviders, SubscriptionService],
    controllers: [SubscriptionController],
    exports: [SubscriptionService],
})
export class SubscriptionModule {}
