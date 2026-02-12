import { DataSource } from 'typeorm';
import { Workspace } from './workspace.entity';

export const workspaceProviders = [
  {
    provide: 'WORKSPACE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Workspace),
    inject: ['DATA_SOURCE'],
  },
];
