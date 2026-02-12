import { User } from '../user/user.entity';
import { FastifyRequest } from 'fastify';

export interface Configuration {
  server: {
    name: string;
    port: number;
    key: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
}

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: number;
  email: string;
  username: string;
}

export interface RefreshTokenPayload {
  sub: number;
  type: 'refresh';
}

export interface UserToken extends User {
  sub: number;
}

export interface UserRequest extends FastifyRequest {
  user: UserToken;
}
