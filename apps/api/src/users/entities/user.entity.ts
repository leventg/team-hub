import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ChannelMember } from '../../channels/entities/channel-member.entity';

export enum UserType {
  HUMAN = 'HUMAN',
  AI_AGENT = 'AI_AGENT',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ARCHITECT = 'ARCHITECT',
  ENGINEER = 'ENGINEER',
  JUNIOR = 'JUNIOR',
}

@Entity({ name: 'users', schema: 'team_hub' })
export class User extends BaseEntity {
  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ name: 'keycloak_id', type: 'varchar', length: 255, unique: true, nullable: true, select: false })
  keycloakId: string | null;

  @Column({ name: 'api_key_hash', type: 'varchar', length: 255, nullable: true, select: false })
  apiKeyHash: string | null;

  @Column({ name: 'user_type', type: 'enum', enum: UserType })
  userType: UserType;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @OneToMany(() => ChannelMember, (cm) => cm.user)
  channelMemberships: ChannelMember[];
}
