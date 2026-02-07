import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { BasicSignInDto, BasicSignUpDto } from './authentication.dto';
import { AuthenticationService, SignInResponse } from './authentication.service';
import { AuthenticationGuard } from './authentication.guard';

@Controller({ path: 'auth', version: '1' })
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('sign-in/basic')
  async signInByBasic(@Body() loginData: BasicSignInDto): Promise<SignInResponse> {
    return await this.authenticationService.signInByBasic(loginData.email, loginData.password);
  }

  @Post('sign-up/basic')
  async signUpByBasic(@Body() signupData: BasicSignUpDto): Promise<SignInResponse> {
    return await this.authenticationService.signUpByBasic(signupData);
  }

  @Post('refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<SignInResponse> {
    return await this.authenticationService.refreshToken(refreshToken);
  }

  @Get('profile')
  @UseGuards(AuthenticationGuard)
  getProfile(@Request() req): any {
    return req.user;
  }
}
