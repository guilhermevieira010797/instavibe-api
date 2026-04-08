import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { Profile } from '../profiles/profile.entity';
import { AiService } from '../ai/ai.service';
import { InstagramGraphService } from './instagram-graph.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    private readonly profilesService: ProfilesService,
    private readonly aiService: AiService,
    private readonly instagramGraphService: InstagramGraphService,
    private readonly s3Service: S3Service,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<Post> {
    const profile = dto.profileId
      ? await this.profilesService.findById(dto.profileId, userId)
      : null;

    const { imagesBase64 } = await this.aiService.generateImages({
      prompt: dto.prompt,
      postType: dto.postType,
      slidesCount: dto.slidesCount,
      referenceImagesBase64: dto.referenceImagesBase64,
      profileId: profile?.id,
      userId,
    });

    const post = this.postsRepository.create({
      userId,
      profileId: profile?.id ?? null,
      postType: dto.postType,
      prompt: dto.prompt,
      caption: dto.caption ?? null,
      hashtags: dto.hashtags ?? [],
      mentions: dto.mentions ?? [],
      imagesBase64,
      draft: dto.draft ?? true,
      status: 'draft',
    });

    return this.postsRepository.save(post);
  }

  async findAllByProfile(profileId: string, userId: string): Promise<Post[]> {
    await this.profilesService.findById(profileId, userId);
    return this.postsRepository.find({
      where: { profileId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByUser(userId: string): Promise<Post[]> {
    return this.postsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, userId: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.userId !== userId) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  async update(id: string, userId: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findById(id, userId);

    if (post.status === 'published') {
      throw new BadRequestException('Cannot update a published post');
    }

    Object.assign(post, dto);
    return this.postsRepository.save(post);
  }

  async publish(id: string, userId: string): Promise<Post> {
    const post = await this.findById(id, userId);

    if (post.draft) {
      throw new BadRequestException(
        'Draft posts cannot be published. Update draft=false before publishing.',
      );
    }

    if (post.status === 'published') {
      throw new BadRequestException('Post is already published');
    }

    if (!post.profile) {
      throw new BadRequestException(
        'Post is not linked to a profile. Link a profile before publishing.',
      );
    }

    const profile = post.profile;

    if (!profile.instagramAccountId || !profile.instagramAccessToken) {
      throw new BadRequestException(
        'This profile does not have Instagram credentials configured. ' +
          'Only Instagram Business or Creator accounts can publish via the API. ' +
          'Please connect a valid account in the profile settings.',
      );
    }

    if (!post.imagesBase64.length) {
      throw new BadRequestException('Post has no images to publish');
    }

    post.status = 'publishing';
    await this.postsRepository.save(post);

    try {
      const caption = this.buildPublishCaption(post);
      const mediaId = await this.publishToInstagram(
        post,
        profile as Profile & {
          instagramAccountId: string;
          instagramAccessToken: string;
        },
        caption,
      );

      post.instagramMediaId = mediaId;
      post.status = 'published';
      post.publishedAt = new Date();
      post.errorMessage = null;
    } catch (error) {
      post.status = 'failed';
      post.errorMessage =
        error instanceof Error ? error.message : 'Unknown publishing error';
    }

    return this.postsRepository.save(post);
  }

  async remove(id: string, userId: string): Promise<void> {
    const post = await this.findById(id, userId);
    await this.postsRepository.remove(post);
  }

  private async publishToInstagram(
    post: Post,
    profile: { instagramAccountId: string; instagramAccessToken: string },
    caption: string,
  ): Promise<string> {
    const igUserId = profile.instagramAccountId;
    const accessToken = profile.instagramAccessToken;

    const imageUrls = await this.uploadImagesAndGetUrls(post.imagesBase64);

    if (post.postType === 'single') {
      const containerId = await this.instagramGraphService.createMediaContainer(
        {
          igUserId,
          accessToken,
          imageUrl: imageUrls[0],
          caption,
        },
      );

      return this.instagramGraphService.publishContainer({
        igUserId,
        accessToken,
        containerId,
      });
    }

    const childrenIds: string[] = [];
    for (const imageUrl of imageUrls) {
      const childId = await this.instagramGraphService.createMediaContainer({
        igUserId,
        accessToken,
        imageUrl,
        isCarouselItem: true,
      });
      childrenIds.push(childId);
    }

    const carouselContainerId =
      await this.instagramGraphService.createCarouselContainer({
        igUserId,
        accessToken,
        childrenIds,
        caption,
      });

    return this.instagramGraphService.publishContainer({
      igUserId,
      accessToken,
      containerId: carouselContainerId,
    });
  }

  private buildPublishCaption(post: Post): string {
    const parts: string[] = [];

    if (post.caption) {
      parts.push(post.caption);
    }

    if (post.mentions.length) {
      parts.push(post.mentions.map((m) => `@${m}`).join(' '));
    }

    if (post.hashtags.length) {
      parts.push(post.hashtags.map((h) => `#${h}`).join(' '));
    }

    return parts.join('\n\n');
  }

  private async uploadImagesAndGetUrls(
    imagesBase64: string[],
  ): Promise<string[]> {
    const urls = await Promise.all(
      imagesBase64.map((base64, index) =>
        this.s3Service.upload(base64, 'posts', `image-${Date.now()}-${index}`),
      ),
    );

    return urls;
  }
}
