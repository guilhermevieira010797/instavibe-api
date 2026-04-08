import { Inject, Injectable } from '@nestjs/common';
import {
  AI_PROVIDER,
  GeneratePostInput,
  GeneratedImages,
  GenerateCaptionInput,
  GeneratedCaption,
  RefineImagesInput,
} from './providers/ai-provider.interface';
import type { AiProvider } from './providers/ai-provider.interface';
import { ProfilesService } from '../profiles/profiles.service';
import { Profile } from '../profiles/profile.entity';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly profilesService: ProfilesService,
  ) {}

  async generateImages(
    input: Omit<GeneratePostInput, 'profileContext'> & {
      profileId?: string;
      userId?: string;
    },
  ): Promise<GeneratedImages> {
    const profileContext = await this.resolveProfileContext(
      input.profileId,
      input.userId,
    );

    const referenceImages = await this.mergeProfileReferences(
      input.profileId,
      input.userId,
      input.referenceImagesBase64,
    );

    return this.provider.generateImages({
      prompt: input.prompt,
      postType: input.postType,
      slidesCount: input.slidesCount,
      referenceImagesBase64: referenceImages,
      profileContext,
    });
  }

  async refineImages(
    input: Omit<RefineImagesInput, 'profileContext'> & {
      profileId?: string;
      userId?: string;
    },
  ): Promise<GeneratedImages> {
    const profileContext = await this.resolveProfileContext(
      input.profileId,
      input.userId,
    );

    return this.provider.refineImages({
      prompt: input.prompt,
      currentImagesBase64: input.currentImagesBase64,
      slideIndexes: input.slideIndexes,
      referenceImagesBase64: input.referenceImagesBase64,
      profileContext,
    });
  }

  async generateCaption(
    input: GenerateCaptionInput,
  ): Promise<GeneratedCaption> {
    return this.provider.generateCaption(input);
  }

  private async resolveProfileContext(
    profileId?: string,
    userId?: string,
  ): Promise<string | undefined> {
    if (!profileId || !userId) return undefined;

    const profile = await this.profilesService.findById(profileId, userId);
    return this.buildProfileContext(profile);
  }

  private async mergeProfileReferences(
    profileId?: string,
    userId?: string,
    inputReferences?: string[],
  ): Promise<string[] | undefined> {
    const refs = [...(inputReferences ?? [])];

    if (profileId && userId) {
      const profile = await this.profilesService.findById(profileId, userId);
      if (profile.referenceImagesBase64?.length) {
        refs.push(...profile.referenceImagesBase64);
      }
    }

    return refs.length ? refs : undefined;
  }

  private buildProfileContext(profile: Profile): string | undefined {
    const parts: string[] = [];

    if (profile.niche) {
      parts.push(`Nicho: ${profile.niche}`);
    }
    if (profile.description) {
      parts.push(`Descrição do perfil: ${profile.description}`);
    }
    if (profile.visualIdentity) {
      parts.push(`Identidade visual: ${profile.visualIdentity}`);
    }
    if (profile.colorPalette?.length) {
      parts.push(`Paleta de cores: ${profile.colorPalette.join(', ')}`);
    }
    if (profile.fontStyle) {
      parts.push(`Estilo de fonte: ${profile.fontStyle}`);
    }

    return parts.length ? parts.join('\n') : undefined;
  }
}
