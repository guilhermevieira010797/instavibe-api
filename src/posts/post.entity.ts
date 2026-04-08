import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from '../profiles/profile.entity';
import { User } from '../users/user.entity';

export type PostType = 'single' | 'carousel';
export type PostStatus = 'draft' | 'publishing' | 'published' | 'failed';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'profile_id', nullable: true })
  profileId: string | null;

  @ManyToOne(() => Profile, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile | null;

  @Column({ type: 'varchar', name: 'post_type' })
  postType: PostType;

  @Column({ type: 'text' })
  prompt: string;

  @Column({ type: 'text', nullable: true })
  caption: string | null;

  @Column({ type: 'jsonb', default: [] })
  hashtags: string[];

  @Column({ type: 'jsonb', default: [] })
  mentions: string[];

  @Column({ type: 'jsonb', default: [], name: 'images_base64' })
  imagesBase64: string[];

  @Column({ type: 'boolean', default: true })
  draft: boolean;

  @Column({ type: 'varchar', default: 'draft' })
  status: PostStatus;

  @Column({ type: 'varchar', nullable: true, name: 'instagram_media_id' })
  instagramMediaId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @Column({ nullable: true, name: 'published_at', type: 'timestamptz' })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
