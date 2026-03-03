import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Channel } from './channel.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'channel_members', schema: 'team_hub' })
@Unique('unq_channel_members_channel_user', ['channel', 'user'])
export class ChannelMember extends BaseEntity {
  @Column({ name: 'channel_id', type: 'uuid' })
  channelId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt: Date | null;

  @ManyToOne(() => Channel, (ch) => ch.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @ManyToOne(() => User, (u) => u.channelMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
