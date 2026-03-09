import {Module} from '@nestjs/common';
import {DatabaseModule} from './database/database.module';
import {ConfigModule} from '@nestjs/config';
import schema from './config/schema';
import {WorkspaceModule} from './workspace/workspace.module';
import {CqrsModule} from '@nestjs/cqrs';
import {UserModule} from './user/user.module';
import {AuthenticationModule} from './authentication/authentication.module';
import {ProfileModule} from './profile/profile.module';
import {APP_FILTER} from '@nestjs/core';
import {DatabaseExceptionFilter} from './database/database.filter';
import {SubscriptionModule} from "./subscription/subscription.module";
import {AgentModule} from "./agent/agent.module";
import {ScriptFileModule} from "./script-file/script-file.module";
import {ModelModule} from "./model/model.module";
import {LessonModule} from "./lesson/lesson.module";

@Module({
    imports: [
        AuthenticationModule,
        /**
         * DOMAIN MODULES
         */
        ProfileModule,
        UserModule,
        WorkspaceModule,
        SubscriptionModule,
        AgentModule,
        ModelModule,
        ScriptFileModule,
        LessonModule,
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
    providers: [
        {
            provide: APP_FILTER,
            useClass: DatabaseExceptionFilter,
        },
    ],
})
export class AppModule {
}
