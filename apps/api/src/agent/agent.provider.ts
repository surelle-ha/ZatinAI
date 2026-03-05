import { DataSource } from 'typeorm';
import { Agent } from './agent.entity';
import {Workspace} from "../workspace/workspace.entity";

export const agentProviders = [
  {
    provide: 'AGENT_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Agent),
    inject: ['DATA_SOURCE'],
  }
];
