import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    IsIn,
} from 'class-validator';

// ─── Suite DTOs ───────────────────────────────────────────────────────────────

export class CreateLessonSuiteDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    subject?: string;

    @IsString()
    @IsIn(['beginner', 'intermediate', 'advanced'])
    level: string;

    @IsString()
    @IsOptional()
    @MaxLength(10)
    coverEmoji?: string;

    @IsInt()
    @IsOptional()
    assignedAgentId?: number | null;
}

export class UpdateLessonSuiteDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    subject?: string;

    @IsString()
    @IsOptional()
    @IsIn(['beginner', 'intermediate', 'advanced'])
    level?: string;

    @IsString()
    @IsOptional()
    @MaxLength(10)
    coverEmoji?: string;

    @IsInt()
    @IsOptional()
    assignedAgentId?: number | null;

    @IsBoolean()
    @IsOptional()
    isPublished?: boolean;
}

// ─── Lesson file DTOs ─────────────────────────────────────────────────────────

export class CreateLessonFileDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsString()
    @IsOptional()
    content?: string;

    @IsInt()
    @Min(0)
    sortOrder: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    estimatedMinutes?: number;
}

export class UpdateLessonFileDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;

    @IsString()
    @IsOptional()
    content?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    sortOrder?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    estimatedMinutes?: number;
}

export class ReorderLessonFilesDto {
    files: { id: number; sortOrder: number }[];
}