import { DataSource } from 'typeorm';
import {ScriptFile} from "./script-file.entity";

export const scriptFileProviders = [
  {
    provide: 'SCRIPT_FILE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(ScriptFile),
    inject: ['DATA_SOURCE'],
  },
];
