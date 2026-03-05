import {IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength} from 'class-validator';

export class CreateAgentDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    model: string;
}

export class UpdateAgentDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    model?: string;

    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}