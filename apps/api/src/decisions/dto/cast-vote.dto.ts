import { Allow, IsEnum, IsOptional, IsString } from 'class-validator';
import { VoteValue } from '../entities/vote.entity';

export class CastVoteDto {
  @Allow()
  decisionId?: string;

  @IsEnum(VoteValue, { message: 'Value must be APPROVE, REJECT, or ABSTAIN' })
  value: VoteValue;

  @IsOptional()
  @IsString()
  comment?: string;
}
