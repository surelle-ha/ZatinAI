import { DataSource } from 'typeorm';
import {WorkspaceUser} from "./workspace-user.entity";

export const workspaceUserProviders = [
  {
    provide: 'WORKSPACE_USER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(WorkspaceUser),
    inject: ['DATA_SOURCE'],
  },
];
