/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LinkProfileDto } from './dto/link-profile.dto';
import { InstagramDiscoveryService } from './instagram-discovery.service';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
    private readonly instagramDiscoveryService: InstagramDiscoveryService,
  ) {}

  async create(userId: string, dto: CreateProfileDto): Promise<Profile> {
    const profile = this.profilesRepository.create({ ...dto, userId });
    return this.profilesRepository.save(profile);
  }

  async findAllByUser(userId: string): Promise<Profile[]> {
    return this.profilesRepository.find({ where: { userId } });
  }

  async findById(id: string, userId: string): Promise<Profile> {
    const profile = await this.profilesRepository.findOne({
      where: { id, userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Profile> {
    const profile = await this.findById(id, userId);
    Object.assign(profile, dto);
    return this.profilesRepository.save(profile);
  }

  async remove(id: string, userId: string): Promise<void> {
    const profile = await this.findById(id, userId);
    await this.profilesRepository.remove(profile);
  }

  async linkInstagram(
    id: string | undefined,
    userId: string,
    dto: LinkProfileDto,
  ): Promise<Profile> {
    const discovered =
      await this.instagramDiscoveryService.resolveProfileForLinking(dto);

    const profile = id
      ? await this.findById(id, userId)
      : this.profilesRepository.create({
          userId,
          name: discovered.name ?? discovered.username ?? 'Untitled',
        });

    profile.instagramUsername = discovered.username;
    profile.instagramAccountId = discovered.igUserId;
    profile.profilePictureUrl = discovered.profilePictureUrl;

    if (discovered.accessToken) {
      profile.instagramAccessToken = discovered.accessToken;
    }

    if (!profile.name || profile.name === 'Untitled') {
      profile.name = discovered.name ?? profile.name;
    }
    if (!profile.description && discovered.biography) {
      profile.description = discovered.biography;
    }

    return this.profilesRepository.save(profile);
  }
}
