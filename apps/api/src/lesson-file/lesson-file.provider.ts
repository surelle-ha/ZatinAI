import { DataSource } from 'typeorm';;
import {LessonFile} from "./lesson-file.entity";

export const lessonFileProviders = [
  {
    provide: 'LESSON_FILE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(LessonFile),
    inject: ['DATA_SOURCE'],
  },
];
