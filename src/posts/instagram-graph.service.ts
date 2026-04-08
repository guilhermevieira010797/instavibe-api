import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CreateContainerParams {
  igUserId: string;
  accessToken: string;
  imageUrl: string;
  caption?: string;
  isCarouselItem?: boolean;
}

interface CreateCarouselContainerParams {
  igUserId: string;
  accessToken: string;
  childrenIds: string[];
  caption?: string;
}

interface PublishContainerParams {
  igUserId: string;
  accessToken: string;
  containerId: string;
}

@Injectable()
export class InstagramGraphService {
  private readonly logger = new Logger(InstagramGraphService.name);
  private readonly graphApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    const version = this.configService.get<string>(
      'META_GRAPH_API_VERSION',
      'v25.0',
    );
    this.graphApiUrl = `https://graph.instagram.com/${version}`;
  }

  async createMediaContainer(params: CreateContainerParams): Promise<string> {
    const body = new URLSearchParams();
    body.set('access_token', params.accessToken);
    body.set('image_url', params.imageUrl);

    if (params.caption) {
      body.set('caption', params.caption);
    }

    if (params.isCarouselItem) {
      body.set('is_carousel_item', 'true');
    }

    const response = await fetch(`${this.graphApiUrl}/${params.igUserId}/media`, {
      method: 'POST',
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Failed to create media container', data);
      throw new Error(
        data?.error?.message ?? 'Failed to create media container',
      );
    }

    return data.id;
  }

  async createCarouselContainer(
    params: CreateCarouselContainerParams,
  ): Promise<string> {
    const body = new URLSearchParams();
    body.set('access_token', params.accessToken);
    body.set('media_type', 'CAROUSEL');
    body.set('children', params.childrenIds.join(','));

    if (params.caption) {
      body.set('caption', params.caption);
    }

    const response = await fetch(`${this.graphApiUrl}/${params.igUserId}/media`, {
      method: 'POST',
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Failed to create carousel container', data);
      throw new Error(
        data?.error?.message ?? 'Failed to create carousel container',
      );
    }

    return data.id;
  }

  async publishContainer(params: PublishContainerParams): Promise<string> {
    const body = new URLSearchParams();
    body.set('access_token', params.accessToken);
    body.set('creation_id', params.containerId);

    const response = await fetch(
      `${this.graphApiUrl}/${params.igUserId}/media_publish`,
      {
        method: 'POST',
        body,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Failed to publish container', data);
      throw new Error(data?.error?.message ?? 'Failed to publish container');
    }

    return data.id;
  }

  async checkContainerStatus(
    containerId: string,
    accessToken: string,
  ): Promise<string> {
    const url = new URL(`${this.graphApiUrl}/${containerId}`);
    url.searchParams.set('fields', 'status_code');
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
      this.logger.error('Failed to check container status', data);
      throw new Error(
        data?.error?.message ?? 'Failed to check container status',
      );
    }

    return data.status_code;
  }
}
