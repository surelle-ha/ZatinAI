import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { UserModule } from '../user/user.module';
import {WorkspaceModule} from "../workspace/workspace.module";
import {WorkspaceUserModule} from "../workspace-user/workspace-user.module";
import {WorkspaceSubscriptionModule} from "../workspace-subscription/workspace-subscription.module";

@Module({
  imports: [
    UserModule,
      WorkspaceModule,
      WorkspaceUserModule,
      WorkspaceSubscriptionModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('server.key'),
      }),
    }),
  ],
  providers: [AuthenticationService],
  controllers: [AuthenticationController],
})
export class AuthenticationModule {}
