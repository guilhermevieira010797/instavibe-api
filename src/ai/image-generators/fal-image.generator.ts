import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createFalClient } from '@fal-ai/client';
import {
  ImageGenerator,
  ImageGenerationInput,
  ImageGenerationResult,
} from './image-generator.interface';

@Injectable()
export class FalImageGenerator implements ImageGenerator {
  private readonly client: ReturnType<typeof createFalClient>;

  constructor(private readonly configService: ConfigService) {
    this.client = createFalClient({
      credentials: this.configService.get<string>('FAL_API_KEY', ''),
    });
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const model = this.configService.get<string>(
      'FAL_IMAGE_MODEL',
      'fal-ai/flux/schnell',
    );

    const result = await this.client.subscribe(model, {
      input: {
        prompt: input.prompt,
        image_size: 'square',
        num_images: input.count,
      },
    });

    const data = result.data as { images?: Array<{ url: string }> };
    const images = data.images ?? [];

    const imagesBase64: string[] = [];
    for (const image of images) {
      const response = await fetch(image.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      imagesBase64.push(buffer.toString('base64'));
    }

    return { imagesBase64 };
  }
}
