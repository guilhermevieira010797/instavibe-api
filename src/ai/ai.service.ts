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
import { DEVELOPER_PROMPT } from './constants/developer-prompt';
import {
  AiCategoriesConfig,
  AiCategory,
} from '../billing/config/ai-categories.config';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly profilesService: ProfilesService,
    private readonly aiCategories: AiCategoriesConfig,
  ) {}

  resolveCategoryDef(category: AiCategory) {
    return this.aiCategories.get(category);
  }

  creditCost(
    category: AiCategory,
    operation: 'generate' | 'refine' | 'caption',
    imageCount = 1,
  ): number {
    return this.aiCategories.costFor(category, operation, imageCount);
  }

  async generateImages(
    input: Omit<GeneratePostInput, 'profileContext' | 'instructions'> & {
      profileId?: string;
      userId?: string;
      instructions?: string;
      category: AiCategory;
    },
  ): Promise<GeneratedImages> {
    const profile = await this.resolveProfile(input.profileId, input.userId);
    const profileContext = profile
      ? this.buildBrandContext(profile)
      : undefined;
    const instructions = this.buildInstructions(profile, input.instructions);
    const catDef = this.aiCategories.get(input.category);

    const referenceImages = await this.mergeProfileReferences(
      input.profileId,
      input.userId,
      input.referenceImagesBase64,
    );

    return this.provider.generateImages({
      prompt: input.prompt,
      postType: input.postType,
      slidesCount: input.slidesCount,
      imageStyle: input.imageStyle,
      referenceImagesBase64: referenceImages,
      profileContext,
      instructions,
      claudeModel: catDef.claudeModel,
      imageGeneratorName: catDef.imageGenerator,
    });
  }

  async refineImages(
    input: Omit<RefineImagesInput, 'profileContext' | 'instructions'> & {
      profileId?: string;
      userId?: string;
      instructions?: string;
      category: AiCategory;
    },
  ): Promise<GeneratedImages> {
    const profile = await this.resolveProfile(input.profileId, input.userId);
    const profileContext = profile
      ? this.buildBrandContext(profile)
      : undefined;
    const instructions = this.buildInstructions(profile, input.instructions);
    const catDef = this.aiCategories.get(input.category);

    return this.provider.refineImages({
      prompt: input.prompt,
      currentImagesBase64: input.currentImagesBase64,
      slideIndexes: input.slideIndexes,
      imageStyle: input.imageStyle,
      referenceImagesBase64: input.referenceImagesBase64,
      profileContext,
      instructions,
      claudeModel: catDef.claudeModel,
      imageGeneratorName: catDef.imageGenerator,
    });
  }

  async generateCaption(
    input: Omit<GenerateCaptionInput, 'instructions'> & {
      profileId?: string;
      userId?: string;
      instructions?: string;
      category: AiCategory;
    },
  ): Promise<GeneratedCaption> {
    const profile = await this.resolveProfile(input.profileId, input.userId);
    const instructions = this.buildInstructions(profile, input.instructions);
    const catDef = this.aiCategories.get(input.category);

    return this.provider.generateCaption({
      prompt: input.prompt,
      imagesBase64: input.imagesBase64,
      instructions,
      claudeModel: catDef.claudeModel,
    });
  }

  private async resolveProfile(
    profileId?: string,
    userId?: string,
  ): Promise<Profile | undefined> {
    if (!profileId || !userId) return undefined;
    return this.profilesService.findById(profileId, userId);
  }

  private buildInstructions(
    profile?: Profile,
    userInstructions?: string,
  ): string {
    const parts: string[] = [DEVELOPER_PROMPT];

    const brandContext = profile ? this.buildBrandContext(profile) : undefined;

    if (brandContext) {
      parts.push(brandContext);
    }

    if (userInstructions) {
      parts.push(`Instruções adicionais do usuário:\n${userInstructions}`);
    }

    return parts.join('\n\n');
  }

  private buildBrandContext(profile: Profile): string | undefined {
    const lines: string[] = [];

    if (profile.name) lines.push(`- Nome da marca: ${profile.name}`);
    if (profile.niche) lines.push(`- Nicho: ${profile.niche}`);
    if (profile.targetAudience)
      lines.push(`- Público-alvo: ${profile.targetAudience}`);
    if (profile.communicationGoal)
      lines.push(`- Objetivo do post: ${profile.communicationGoal}`);
    if (profile.toneOfVoice) lines.push(`- Tom de voz: ${profile.toneOfVoice}`);
    if (profile.brandDifferentials)
      lines.push(`- Diferenciais: ${profile.brandDifferentials}`);
    if (profile.description)
      lines.push(`- Produto/serviço: ${profile.description}`);
    if (profile.forbiddenWords?.length)
      lines.push(`- Restrições: ${profile.forbiddenWords.join(', ')}`);
    if (profile.visualIdentity)
      lines.push(`- Referências visuais: ${profile.visualIdentity}`);
    if (profile.colorPalette?.length)
      lines.push(`- Paleta de cores: ${profile.colorPalette.join(', ')}`);
    if (profile.fontStyle)
      lines.push(`- Estilo de fonte: ${profile.fontStyle}`);
    if (profile.preferredCta)
      lines.push(`- CTA preferido: ${profile.preferredCta}`);
    if (profile.keywords?.length)
      lines.push(`- Palavras-chave: ${profile.keywords.join(', ')}`);
    if (profile.logoUrl) lines.push(`- Logo da marca: ${profile.logoUrl}`);
    if (profile.notes) lines.push(`- Observações adicionais: ${profile.notes}`);

    if (!lines.length) return undefined;

    return `Contexto da marca:\n${lines.join('\n')}`;
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
}
