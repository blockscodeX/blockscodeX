import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsEnum(Role)
    @IsOptional()
    role?: Role;

    @IsOptional()
    @IsString()
    rollNumber?: string;

    @IsOptional()
    @IsString()
    department?: string;
}
