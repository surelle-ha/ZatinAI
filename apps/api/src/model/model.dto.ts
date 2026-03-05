import {
    IsBoolean,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateModelDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    label: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    value: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    provider?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    contextWindow?: string;

    @IsOptional()
    @IsIn(['enterprise', 'third-party'])
    platform?: 'enterprise' | 'third-party';

    @IsOptional()
    @IsString()
    @MaxLength(500)
    hostUrl?: string;

    @IsOptional()
    @IsString()
    apiToken?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateModelDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    label?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    value?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    provider?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    contextWindow?: string;

    @IsOptional()
    @IsIn(['enterprise', 'third-party'])
    platform?: 'enterprise' | 'third-party';

    @IsOptional()
    @IsString()
    @MaxLength(500)
    hostUrl?: string;

    @IsOptional()
    @IsString()
    apiToken?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}