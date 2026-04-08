import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkProfileDto } from './dto/link-profile.dto';

export interface DiscoveredProfile {
  igUserId: string;
  username: string | null;
  name: string | null;
  biography: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  accessToken: string | null;
}

@Injectable()
export class InstagramDiscoveryService {
  private readonly logger = new Logger(InstagramDiscoveryService.name);
  private readonly graphApiUrl: string;
  private readonly facebookGraphApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    const version = this.configService.get<string>(
      'META_GRAPH_API_VERSION',
      'v25.0',
    );
    this.graphApiUrl = `https://graph.instagram.com/${version}`;
    this.facebookGraphApiUrl = `https://graph.facebook.com/${version}`;
  }

  async resolveProfileForLinking(dto: LinkProfileDto): Promise<DiscoveredProfile> {
    if (dto.accessToken) {
      return this.resolveAuthenticatedProfile(dto);
    }

    if (dto.username) {
      return this.discoverByUsername(dto.username);
    }

    throw new BadRequestException(
      'Either username or accessToken must be provided.',
    );
  }

  async discoverByUsername(username: string): Promise<DiscoveredProfile> {
    const systemIgUserId = this.configService.get<string>(
      'META_SYSTEM_IG_USER_ID',
    );
    const accessToken = this.configService.get<string>(
      'META_SYSTEM_ACCESS_TOKEN',
    );

    if (!systemIgUserId || !accessToken) {
      throw new BadRequestException(
        'Instagram discovery is not configured. ' +
          'META_SYSTEM_IG_USER_ID and META_SYSTEM_ACCESS_TOKEN must be set.',
      );
    }

    const sanitized = username.replace(/^@/, '').trim();

    if (!sanitized) {
      throw new BadRequestException('Invalid Instagram username.');
    }

    const fields = [
      'username',
      'name',
      'biography',
      'profile_picture_url',
      'ig_id',
      'followers_count',
      'media_count',
    ].join(',');

    const url =
      `${this.facebookGraphApiUrl}/${systemIgUserId}` +
      `?fields=business_discovery.fields(${fields})` +
      `&username=${encodeURIComponent(sanitized)}` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ?? 'Failed to discover Instagram profile';
      this.logger.error('Instagram discovery failed', data);

      if (
        data?.error?.code === 110 ||
        errorMessage.toLowerCase().includes('not found')
      ) {
        throw new BadRequestException(
          `Instagram profile "@${sanitized}" was not found or is not a Business/Creator account.`,
        );
      }

      throw new BadRequestException(errorMessage);
    }

    const discovery = data?.business_discovery;

    if (!discovery) {
      throw new BadRequestException(
        `Could not retrieve data for "@${sanitized}". ` +
          'Make sure it is a public Business or Creator account.',
      );
    }

    return {
      igUserId: discovery.id,
      username: discovery.username,
      name: discovery.name ?? null,
      biography: discovery.biography ?? null,
      profilePictureUrl: discovery.profile_picture_url ?? null,
      followersCount: discovery.followers_count ?? null,
      mediaCount: discovery.media_count ?? null,
      accessToken: null,
    };
  }

  private async resolveAuthenticatedProfile(
    dto: LinkProfileDto,
  ): Promise<DiscoveredProfile> {
    const accessToken = dto.accessToken?.trim();

    if (!accessToken) {
      throw new BadRequestException('Instagram access token is required.');
    }

    const account = await this.fetchAuthenticatedAccount(dto, accessToken);

    return {
      igUserId: account.igUserId,
      username: account.username,
      name: null,
      biography: null,
      profilePictureUrl: null,
      followersCount: null,
      mediaCount: null,
      accessToken,
    };
  }

  private async fetchAuthenticatedAccount(
    dto: LinkProfileDto,
    accessToken: string,
  ): Promise<{ igUserId: string; username: string | null }> {
    const providedId = dto.instagramAccountId?.trim();
    const providedUsername = this.sanitizeUsername(dto.username);

    if (providedId) {
      return {
        igUserId: providedId,
        username: providedUsername,
      };
    }

    const url = new URL(`${this.graphApiUrl}/me`);
    url.searchParams.set('fields', 'user_id,username');
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        data?.error?.message ?? 'Failed to fetch authenticated Instagram account';
      this.logger.error('Instagram login account lookup failed', data);
      throw new BadRequestException(errorMessage);
    }

    const igUserId = data?.user_id ?? data?.id;

    if (!igUserId) {
      throw new BadRequestException(
        'Instagram Login did not return the professional account id. ' +
          'Send instagramAccountId together with accessToken.',
      );
    }

    return {
      igUserId,
      username: data?.username ?? providedUsername,
    };
  }

  private sanitizeUsername(username?: string): string | null {
    const sanitized = username?.replace(/^@/, '').trim();
    return sanitized ? sanitized : null;
  }
}
