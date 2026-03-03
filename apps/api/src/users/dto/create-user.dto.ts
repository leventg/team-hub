import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole, UserType } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Display name is required' })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  keycloakId?: string;

  @IsEnum(UserType, { message: 'User type must be HUMAN or AI_AGENT' })
  userType: UserType;

  @IsEnum(UserRole, { message: 'Role must be ADMIN, ARCHITECT, ENGINEER, or JUNIOR' })
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}
