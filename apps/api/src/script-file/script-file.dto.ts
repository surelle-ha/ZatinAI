import {
    IsArray,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min, ValidateNested,
} from 'class-validator';
import {Type} from "class-transformer";

export class CreateScriptFileDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    content: string;

    @IsInt()
    @Min(0)
    sortOrder: number;

    @IsBoolean()
    isBootstrap: boolean;
}

export class UpdateScriptFileDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;

    @IsOptional()
    @IsBoolean()
    isBootstrap?: boolean;
}

class ReorderItem {
    @IsInt()
    id: number;

    @IsInt()
    @Min(0)
    sortOrder: number;
}

export class ReorderScriptFilesDto {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => ReorderItem)
    files: ReorderItem[];
}