import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDecisionDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @MaxLength(300)
  title: string;

  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  description: string;

  @IsNotEmpty({ message: 'Channel ID is required' })
  @IsUUID('4')
  channelId: string;
}
