import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateMessageDto {
  @IsNotEmpty({ message: 'Message content is required' })
  @IsString()
  content: string;
}
