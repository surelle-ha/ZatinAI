import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class BasicSignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class BasicSignUpDto {
  @IsString()
  @IsNotEmpty()
  workspaceName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}