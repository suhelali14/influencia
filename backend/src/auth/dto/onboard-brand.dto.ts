import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OnboardBrandDto {
  @ApiProperty({ example: 'admin@brandco.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'BrandCo Inc.' })
  @IsString()
  @MaxLength(200)
  company_name: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  first_name: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  last_name: string;
}
