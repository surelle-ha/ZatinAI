import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AccessTokenPayload, RefreshTokenPayload, SignInResponse } from '../config/interfaces';

@Injectable()
export class AuthenticationService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signInByBasic(email: string, pass: string): Promise<SignInResponse> {
    const data = await this.userService.findOneByEmail(email);

    if (!data) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const isPasswordValid = await bcrypt.compare(pass, data.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    if (!data.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (!data.isEmailVerified) {
      throw new UnauthorizedException('Email is not verified');
    }

    if (!data.isPhoneVerified) {
      throw new UnauthorizedException('Phone number is incorrect');
    }

    const accessTokenPayload: AccessTokenPayload = {
      sub: data.id,
      email: data.email,
      username: data.username,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: data.id,
      type: 'refresh',
    };

    return {
      accessToken: await this.jwtService.signAsync(accessTokenPayload, { expiresIn: '15m' }),
      refreshToken: await this.jwtService.signAsync(refreshTokenPayload, { expiresIn: '7d' }),
    };
  }

  async signUpByBasic(signupData: { email: string, password: string }): Promise<SignInResponse> {
    const existingUser = await this.userService.findOneByEmail(signupData.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(signupData.password, 10);
    const newUser = await this.userService.create({
      email: signupData.email,
      password: hashedPassword,
    });

    const accessTokenPayload: AccessTokenPayload = {
      sub: newUser.id,
      email: newUser.email,
      username: newUser.username,
    };

    const refreshTokenPayload: RefreshTokenPayload = {
      sub: newUser.id,
      type: 'refresh',
    };

    return {
      accessToken: await this.jwtService.signAsync(accessTokenPayload, { expiresIn: '15m' }),
      refreshToken: await this.jwtService.signAsync(refreshTokenPayload, { expiresIn: '7d' }),
    };
  }

  async refreshToken(refreshToken: string): Promise<SignInResponse> {
    try {
      const payload: RefreshTokenPayload = await this.jwtService.verifyAsync(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const newAccessTokenPayload: AccessTokenPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
      };

      const newRefreshTokenPayload: RefreshTokenPayload = {
        sub: user.id,
        type: 'refresh',
      };

      return {
        accessToken: await this.jwtService.signAsync(newAccessTokenPayload, { expiresIn: '15m' }),
        refreshToken: await this.jwtService.signAsync(newRefreshTokenPayload, { expiresIn: '7d' }),
      };
    } catch (error) {
      void error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
