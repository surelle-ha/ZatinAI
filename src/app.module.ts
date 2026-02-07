import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import schema from './config/schema';
import { WorkspaceModule } from './workspace/workspace.module';
import { CqrsModule } from '@nestjs/cqrs';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    /**
     * DOMAIN MODULES
     */
    UserModule,
    WorkspaceModule,
    /**
     * INFRASTRUCTURE MODULES
     */
    CqrsModule.forRoot(),
    ConfigModule.forRoot({
      load: [schema],
      isGlobal: true,
    }),
    DatabaseModule,
    // TODO: Set up Redis Module
    // TODO: Set up Migration Module (Preferred: Umzug)
    // TODO: Set up CQRS Module (Preferred: NestJS CQRS)
    // TODO: Set up gRPC Module (Preferred: NestJS gRPC)
    // TODO: Set up Websocket Module (Preferred: NestJS Websockets)
  ],
})
export class AppModule {}
