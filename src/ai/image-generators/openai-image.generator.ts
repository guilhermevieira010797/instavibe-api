import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  ImageGenerator,
  ImageGenerationInput,
  ImageGenerationResult,
} from './image-generator.interface';

@Injectable()
export class OpenAiImageGenerator implements ImageGenerator {
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const imagesBase64: string[] = [];

    for (let i = 0; i < input.count; i++) {
      const response = await this.client.images.generate({
        model: this.configService.get<string>(
          'OPENAI_IMAGE_MODEL',
          'gpt-image-1',
        ),
        prompt: input.prompt,
        n: 1,
        size: (input.size as '1024x1024') || '1024x1024',
        quality: 'medium',
      });

      const b64 = response.data?.[0]?.b64_json;
      if (b64) {
        imagesBase64.push(b64);
      }
    }

    return { imagesBase64 };
  }
}
