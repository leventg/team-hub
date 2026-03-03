import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaskCommentDto {
  @IsNotEmpty({ message: 'Comment content is required' })
  @IsString()
  content: string;
}
