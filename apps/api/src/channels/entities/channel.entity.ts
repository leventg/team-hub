import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ChannelMember } from './channel-member.entity';
import { Message } from '../../messages/entities/message.entity';

@Entity({ name: 'channels', schema: 'team_hub' })
export class Channel extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @OneToMany(() => ChannelMember, (cm) => cm.channel)
  members: ChannelMember[];

  @OneToMany(() => Message, (m) => m.channel)
  messages: Message[];
}
