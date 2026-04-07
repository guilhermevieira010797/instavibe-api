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

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async upsertByGoogle(data: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<User> {
    let user = await this.findByGoogleId(data.googleId);
    if (!user) {
      user = await this.findByEmail(data.email);
    }
    if (user) {
      user.googleId = data.googleId;
      user.name = data.name;
      return this.usersRepository.save(user);
    }
    return this.create({ ...data });
  }
}
