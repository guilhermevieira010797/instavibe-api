import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { Responses } from 'openai/resources/responses/responses';
import {
  AiProvider,
  GeneratePostInput,
  GeneratedImages,
  GenerateCaptionInput,
  GeneratedCaption,
  RefineImagesInput,
} from './ai-provider.interface';

type ResponseInputContent = Responses.ResponseInputContent;

@Injectable()
export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateImages(input: GeneratePostInput): Promise<GeneratedImages> {
    const imageCount =
      input.postType === 'carousel' ? (input.slidesCount ?? 5) : 1;

    const systemPrompt = this.buildSystemPrompt(input, imageCount);
    const userContent = this.buildUserContent(input);

    const response = await this.client.responses.create({
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4.1'),
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      tools: [
        {
          type: 'image_generation',
          quality: 'medium',
          size: '1024x1024',
          output_format: 'png',
        },
      ],
    });

    return this.parseResponse(response);
  }

  private buildSystemPrompt(
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
      `- Foque exclusivamente na geração visual. Não inclua texto de resposta.`,
      ...(input.profileContext
        ? [
            ``,
            `Contexto do perfil (siga a identidade visual descrita):`,
            input.profileContext,
          ]
        : []),
    ].join('\n');
  }

  private buildUserContent(input: GeneratePostInput): ResponseInputContent[] {
    const content: ResponseInputContent[] = [
      { type: 'input_text' as const, text: input.prompt },
    ];

    if (input.referenceImagesBase64?.length) {
      for (const imageBase64 of input.referenceImagesBase64) {
        content.push({
          type: 'input_image' as const,
          image_url: `data:image/png;base64,${imageBase64}`,
          detail: 'auto' as const,
        });
      }
    }

    return content;
  }

  async refineImages(input: RefineImagesInput): Promise<GeneratedImages> {
    const { currentImagesBase64, slideIndexes, prompt } = input;

    const targetIndexes = slideIndexes?.length
      ? slideIndexes
      : currentImagesBase64.map((_, i) => i);

    const imagesToRefine = targetIndexes.map((i) => currentImagesBase64[i]);

    const totalSlides = currentImagesBase64.length;
    const isPartial = targetIndexes.length < totalSlides;

    const systemPrompt = [
      `Você é um designer especialista em criação visual para Instagram.`,
      `O usuário quer refinar ${targetIndexes.length} imagem(ns) de um post que tem ${totalSlides} slide(s) no total.`,
      ``,
      `Regras:`,
      `- Gere EXATAMENTE ${targetIndexes.length} imagem(ns) refinada(s).`,
      `- Mantenha proporção 1:1 (1080x1080), estilo profissional e moderno.`,
      ...(isPartial
        ? [
            `- As imagens que NÃO estão sendo refinadas permanecem inalteradas.`,
            `- Mantenha coerência visual com o restante do carrossel.`,
          ]
        : []),
      `- Foque exclusivamente na geração visual. Não inclua texto de resposta.`,
      ...(input.profileContext
        ? [
            ``,
            `Contexto do perfil (siga a identidade visual descrita):`,
            input.profileContext,
          ]
        : []),
    ].join('\n');

    const userContent: ResponseInputContent[] = [
      {
        type: 'input_text' as const,
        text: `Refine as imagens a seguir com base neste pedido: ${prompt}`,
      },
    ];

    for (const imageBase64 of imagesToRefine) {
      userContent.push({
        type: 'input_image' as const,
        image_url: `data:image/png;base64,${imageBase64}`,
        detail: 'auto' as const,
      });
    }

    if (input.referenceImagesBase64?.length) {
      for (const refImage of input.referenceImagesBase64) {
        userContent.push({
          type: 'input_image' as const,
          image_url: `data:image/png;base64,${refImage}`,
          detail: 'auto' as const,
        });
      }
    }

    const response = await this.client.responses.create({
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4.1'),
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      tools: [
        {
          type: 'image_generation',
          quality: 'medium',
          size: '1024x1024',
          output_format: 'png',
        },
      ],
    });

    const refinedImages = this.parseResponse(response).imagesBase64;

    const result = [...currentImagesBase64];
    for (let i = 0; i < targetIndexes.length; i++) {
      if (refinedImages[i]) {
        result[targetIndexes[i]] = refinedImages[i];
      }
    }

    return { imagesBase64: result };
  }

  async generateCaption(
    input: GenerateCaptionInput,
  ): Promise<GeneratedCaption> {
    const userContent: ResponseInputContent[] = [
      { type: 'input_text' as const, text: input.prompt },
    ];

    for (const imageBase64 of input.imagesBase64) {
      userContent.push({
        type: 'input_image' as const,
        image_url: `data:image/png;base64,${imageBase64}`,
        detail: 'auto' as const,
      });
    }

    const response = await this.client.responses.create({
      model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4.1'),
      input: [
        {
          role: 'system',
          content: [
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
        { role: 'user', content: userContent },
      ],
    });

    let caption = '';
    for (const output of response.output) {
      if (output.type === 'message' && output.content) {
        for (const block of output.content) {
          if (block.type === 'output_text') {
            caption += block.text;
          }
        }
      }
    }

    return { caption: caption.trim() };
  }

  private parseResponse(response: OpenAI.Responses.Response): GeneratedImages {
    const imagesBase64: string[] = [];

    for (const output of response.output) {
      if (output.type === 'image_generation_call' && output.result) {
        imagesBase64.push(output.result);
      }
    }

    return { imagesBase64 };
  }
}
