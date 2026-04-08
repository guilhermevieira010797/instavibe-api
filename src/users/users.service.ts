import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: this.normalizeEmail(email) },
    });
  }

  async findAuthByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', {
        email: this.normalizeEmail(email),
      })
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create({
      ...data,
      email: data.email ? this.normalizeEmail(data.email) : undefined,
    });
    const savedUser = await this.usersRepository.save(user);
    return (await this.findById(savedUser.id)) ?? savedUser;
  }

  async upsertByGoogle(data: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<User> {
    const email = this.normalizeEmail(data.email);

    let user = await this.findByGoogleId(data.googleId);
    if (!user) {
      user = await this.findByEmail(email);
    }
    if (user) {
      user.googleId = data.googleId;
      user.name = data.name;
      return this.usersRepository.save(user);
    }
    return this.create({ ...data, email });
  }
}
