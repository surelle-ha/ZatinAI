import { DataSource } from 'typeorm';
import {LessonSuite} from "./lesson-suite.entity";

export const lessonSuiteProviders = [
  {
    provide: 'LESSON_SUITE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(LessonSuite),
    inject: ['DATA_SOURCE'],
  },
];
