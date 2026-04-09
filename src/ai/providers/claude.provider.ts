import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiProvider,
  GeneratePostInput,
  GeneratedImages,
  GenerateCaptionInput,
  GeneratedCaption,
  RefineImagesInput,
  IMAGE_STYLE_LABELS,
} from './ai-provider.interface';
import { IMAGE_GENERATOR } from '../image-generators/image-generator.interface';
import type { ImageGenerator } from '../image-generators/image-generator.interface';

type ImageBlockParam = Anthropic.Messages.ImageBlockParam;
type TextBlockParam = Anthropic.Messages.TextBlockParam;
type ContentBlockParam = ImageBlockParam | TextBlockParam;

@Injectable()
export class ClaudeProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    @Inject(IMAGE_GENERATOR) private readonly imageGenerator: ImageGenerator,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateImages(input: GeneratePostInput): Promise<GeneratedImages> {
    const imageCount =
      input.postType === 'carousel' ? (input.slidesCount ?? 5) : 1;

    const systemPrompt = this.buildGenerateSystemPrompt(input, imageCount);
    const userContent = this.buildGenerateUserContent(input);

    const [claudeResponse, generatedImages] = await Promise.all([
      this.client.messages.create({
        model: this.configService.get<string>(
          'ANTHROPIC_MODEL',
          'claude-sonnet-4-20250514',
        ),
        max_tokens: 4096,
        system: [
          ...(input.instructions
            ? [{ type: 'text' as const, text: input.instructions }]
            : []),
          { type: 'text' as const, text: systemPrompt },
        ],
        messages: [{ role: 'user', content: userContent }],
      }),
      this.imageGenerator.generate({
        prompt: this.buildImagePrompt(input.prompt, input.imageStyle),
        count: imageCount,
      }),
    ]);

    const message = this.extractText(claudeResponse);

    return {
      imagesBase64: generatedImages.imagesBase64,
      message,
    };
  }

  async refineImages(input: RefineImagesInput): Promise<GeneratedImages> {
    const { currentImagesBase64, slideIndexes, prompt } = input;

    const targetIndexes = slideIndexes?.length
      ? slideIndexes
      : currentImagesBase64.map((_, i) => i);

    const imagesToRefine = targetIndexes.map((i) => currentImagesBase64[i]);

    const totalSlides = currentImagesBase64.length;
    const isPartial = targetIndexes.length < totalSlides;

    const slideLabels = targetIndexes.map((i) => `Slide ${i + 1}`).join(', ');

    const systemPrompt = this.buildRefineSystemPrompt(
      input,
      targetIndexes,
      totalSlides,
      isPartial,
      slideLabels,
    );

    const userContent: ContentBlockParam[] = [
      {
        type: 'text' as const,
        text: `Refine as imagens a seguir com base neste pedido: ${prompt}\n\nAs imagens abaixo correspondem aos: ${slideLabels}.`,
      },
    ];

    for (const imageBase64 of imagesToRefine) {
      userContent.push({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png',
          data: imageBase64,
        },
      });
    }

    if (input.referenceImagesBase64?.length) {
      for (const refImage of input.referenceImagesBase64) {
        userContent.push({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/png',
            data: refImage,
          },
        });
      }
    }

    const [claudeResponse, generatedImages] = await Promise.all([
      this.client.messages.create({
        model: this.configService.get<string>(
          'ANTHROPIC_MODEL',
          'claude-sonnet-4-20250514',
        ),
        max_tokens: 4096,
        system: [
          ...(input.instructions
            ? [{ type: 'text' as const, text: input.instructions }]
            : []),
          { type: 'text' as const, text: systemPrompt },
        ],
        messages: [{ role: 'user', content: userContent }],
      }),
      this.imageGenerator.generate({
        prompt: this.buildImagePrompt(prompt, input.imageStyle),
        count: targetIndexes.length,
      }),
    ]);

    const message = this.extractText(claudeResponse);

    const result = [...currentImagesBase64];
    for (let i = 0; i < targetIndexes.length; i++) {
      if (generatedImages.imagesBase64[i]) {
        result[targetIndexes[i]] = generatedImages.imagesBase64[i];
      }
    }

    return { imagesBase64: result, message };
  }

  async generateCaption(
    input: GenerateCaptionInput,
  ): Promise<GeneratedCaption> {
    const userContent: ContentBlockParam[] = [
      { type: 'text' as const, text: input.prompt },
    ];

    for (const imageBase64 of input.imagesBase64) {
      userContent.push({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: 'image/png',
          data: imageBase64,
        },
      });
    }

    const response = await this.client.messages.create({
      model: this.configService.get<string>(
        'ANTHROPIC_MODEL',
        'claude-sonnet-4-20250514',
      ),
      max_tokens: 4096,
      system: [
        ...(input.instructions
          ? [{ type: 'text' as const, text: input.instructions }]
          : []),
        {
          type: 'text' as const,
          text: [
            'Você é um copywriter especialista em Instagram.',
            'Com base nas imagens fornecidas e no prompt do usuário, crie uma legenda envolvente para a postagem.',
            '',
            'Regras:',
            '- Responda APENAS com o texto da legenda, sem explicações extras.',
            '- A legenda deve ser adequada ao tom e nicho indicado pelo prompt.',
            '- Inclua hashtags relevantes ao final da legenda.',
            '- Use emojis de forma natural quando apropriado.',
          ].join('\n'),
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    let caption = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        caption += block.text;
      }
    }

    return { caption: caption.trim() };
  }

  private buildGenerateSystemPrompt(
    input: GeneratePostInput,
    imageCount: number,
  ): string {
    const postTypeLabel =
      input.postType === 'carousel'
        ? `um carrossel de Instagram com ${imageCount} slides`
        : 'um post único de Instagram';

    return [
      `Você é um designer especialista em criação visual para Instagram.`,
      `Sua tarefa é criar as imagens para ${postTypeLabel}.`,
      ``,
      `Regras:`,
      `- Gere EXATAMENTE ${imageCount} imagem(ns).`,
      `- As imagens devem ter proporção 1:1 (1080x1080), estilo profissional e moderno.`,
      `- Para carrosséis, cada slide deve ser visualmente coeso mas trazer informação progressiva.`,
      ...(input.imageStyle
        ? [
            `- ESTILO VISUAL OBRIGATÓRIO: ${IMAGE_STYLE_LABELS[input.imageStyle]}. Todas as imagens devem seguir rigorosamente este estilo.`,
          ]
        : []),
      ``,
      `Após gerar as imagens, responda com um resumo em texto explicando:`,
      `- O conceito visual escolhido e por quê.`,
      `- Um checklist das decisões aplicadas (ex: paleta de cores, estilo, composição, elementos).`,
      `- Formato: use marcadores (•) para o checklist.`,
      ...(input.profileContext
        ? [
            ``,
            `Contexto do perfil (siga a identidade visual descrita):`,
            input.profileContext,
          ]
        : []),
    ].join('\n');
  }

  private buildGenerateUserContent(
    input: GeneratePostInput,
  ): ContentBlockParam[] {
    const content: ContentBlockParam[] = [
      { type: 'text' as const, text: input.prompt },
    ];

    if (input.referenceImagesBase64?.length) {
      for (const imageBase64 of input.referenceImagesBase64) {
        content.push({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: 'image/png',
            data: imageBase64,
          },
        });
      }
    }

    return content;
  }

  private buildRefineSystemPrompt(
    input: RefineImagesInput,
    targetIndexes: number[],
    totalSlides: number,
    isPartial: boolean,
    slideLabels: string,
  ): string {
    return [
      `Você é um designer especialista em criação visual para Instagram.`,
      `O usuário quer refinar ${targetIndexes.length} imagem(ns) de um post que tem ${totalSlides} slide(s) no total.`,
      `Slides a serem refinados: ${slideLabels}.`,
      ``,
      `Regras:`,
      `- Gere EXATAMENTE ${targetIndexes.length} imagem(ns) refinada(s), na mesma ordem informada.`,
      `- Mantenha proporção 1:1 (1080x1080), estilo profissional e moderno.`,
      ...(input.imageStyle
        ? [
            `- ESTILO VISUAL OBRIGATÓRIO: ${IMAGE_STYLE_LABELS[input.imageStyle]}. Mantenha rigorosamente este estilo nas imagens refinadas.`,
          ]
        : []),
      ...(isPartial
        ? [
            `- As imagens que NÃO estão sendo refinadas permanecem inalteradas.`,
            `- Mantenha coerência visual com o restante do carrossel.`,
          ]
        : []),
      ``,
      `Após gerar as imagens refinadas, responda com um resumo em texto explicando:`,
      `- O que foi alterado em cada imagem.`,
      `- Um checklist das alterações aplicadas (ex: ajuste de cor, recomposição, novo elemento, etc).`,
      `- Formato: use marcadores (•) para o checklist.`,
      ...(input.profileContext
        ? [
            ``,
            `Contexto do perfil (siga a identidade visual descrita):`,
            input.profileContext,
          ]
        : []),
    ].join('\n');
  }

  private buildImagePrompt(
    userPrompt: string,
    imageStyle?: import('./ai-provider.interface').ImageStyle,
  ): string {
    const parts = [userPrompt];

    if (imageStyle) {
      parts.push(
        `Estilo visual obrigatório: ${IMAGE_STYLE_LABELS[imageStyle]}.`,
      );
    }

    parts.push(
      'Proporção 1:1 (1080x1080). Estilo profissional e moderno para Instagram.',
    );

    return parts.join(' ');
  }

  private extractText(response: Anthropic.Messages.Message): string {
    let message = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        message += block.text;
      }
    }

    return message.trim();
  }
}
