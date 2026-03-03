import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty({ message: 'Channel ID is required' })
  @IsUUID('4', { message: 'Channel ID must be a valid UUID' })
  channelId: string;

  @IsNotEmpty({ message: 'Message content is required' })
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID('4', { message: 'Parent ID must be a valid UUID' })
  parentId?: string;
}
