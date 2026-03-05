import { DataSource } from 'typeorm';;
import {Model} from "./model.entity";

export const modelProviders = [
  {
    provide: 'MODEL_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Model),
    inject: ['DATA_SOURCE'],
  },
];
