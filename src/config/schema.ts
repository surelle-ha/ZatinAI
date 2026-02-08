import { Configuration } from './interfaces';

export default (): Configuration => ({
  server: {
    name: process.env.SERVER_NAME || 'My NestJS',
    port: parseInt(process.env.SERVER_PORT || '3000'),
    key: process.env.SERVER_KEY || 'default',
  },
  database: {
    host: process.env.PG_HOST!,
    port: parseInt(process.env.PG_PORT || '5432'),
    username: process.env.PG_USERNAME!,
    password: process.env.PG_PASSWORD!,
    name: process.env.PG_NAME!,
  },
});
