import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  niche: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true, name: 'visual_identity' })
  visualIdentity: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'color_palette' })
  colorPalette: string[] | null;

  @Column({ type: 'varchar', nullable: true, name: 'font_style' })
  fontStyle: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'reference_images_base64' })
  referenceImagesBase64: string[] | null;

  @Column({ type: 'varchar', nullable: true, name: 'instagram_username' })
  instagramUsername: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'instagram_account_id' })
  instagramAccountId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'instagram_access_token' })
  instagramAccessToken: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'profile_picture_url' })
  profilePictureUrl: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'logo_url' })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'target_audience' })
  targetAudience: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'tone_of_voice' })
  toneOfVoice: string | null;

  @Column({ type: 'jsonb', nullable: true })
  keywords: string[] | null;

  @Column({ type: 'jsonb', nullable: true, name: 'forbidden_words' })
  forbiddenWords: string[] | null;

  @Column({ type: 'varchar', nullable: true, name: 'communication_goal' })
  communicationGoal: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'preferred_cta' })
  preferredCta: string | null;

  @Column({ type: 'text', nullable: true, name: 'brand_differentials' })
  brandDifferentials: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
