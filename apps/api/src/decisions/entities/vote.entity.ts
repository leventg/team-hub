import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Decision } from './decision.entity';
import { User } from '../../users/entities/user.entity';

export enum VoteValue {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  ABSTAIN = 'ABSTAIN',
}

@Entity({ name: 'votes', schema: 'team_hub' })
@Unique('unq_votes_decision_voter', ['decision', 'voter'])
export class Vote extends BaseEntity {
  @Column({ name: 'decision_id', type: 'uuid' })
  decisionId: string;

  @Column({ name: 'voter_id', type: 'uuid' })
  voterId: string;

  @Column({ type: 'enum', enum: VoteValue })
  value: VoteValue;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @ManyToOne(() => Decision, (d) => d.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'decision_id' })
  decision: Decision;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voter_id' })
  voter: User;
}
