import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email must be valid' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @IsOptional()
  @IsNotEmpty({ message: 'First name cannot be empty' })
  firstName?: string;

  @IsOptional()
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  lastName?: string;
}
