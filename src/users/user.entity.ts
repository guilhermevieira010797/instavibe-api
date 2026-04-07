import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ nullable: true, name: 'google_id' })
  googleId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
