import { DataSource } from 'typeorm';
import {WorkspaceSubscription} from "./workspace-subscription.entity";

export const workspaceSubscriptionProviders = [
  {
    provide: 'WORKSPACE_SUBSCRIPTION_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(WorkspaceSubscription),
    inject: ['DATA_SOURCE'],
  },
];
