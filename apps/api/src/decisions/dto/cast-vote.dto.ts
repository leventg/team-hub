import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { VoteValue } from '../entities/vote.entity';

export class CastVoteDto {
  @IsNotEmpty()
  @IsUUID('4')
  decisionId: string;

  @IsEnum(VoteValue, { message: 'Value must be APPROVE, REJECT, or ABSTAIN' })
  value: VoteValue;

  @IsOptional()
  @IsString()
  comment?: string;
}
