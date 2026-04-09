import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Replicate from 'replicate';
import {
  ImageGenerator,
  ImageGenerationInput,
  ImageGenerationResult,
} from './image-generator.interface';

@Injectable()
export class ReplicateImageGenerator implements ImageGenerator {
  private readonly client: Replicate;

  constructor(private readonly configService: ConfigService) {
    this.client = new Replicate({
      auth: this.configService.get<string>('REPLICATE_API_KEY', ''),
    });
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const model = this.configService.get<string>(
      'REPLICATE_IMAGE_MODEL',
      'black-forest-labs/flux-schnell',
    );

    const output = await this.client.run(model as `${string}/${string}`, {
      input: {
        prompt: input.prompt,
        num_outputs: input.count,
        aspect_ratio: '1:1',
        output_format: 'png',
      },
    });

    const urls = Array.isArray(output) ? (output as string[]) : [];

    const imagesBase64: string[] = [];
    for (const url of urls) {
      const response = await fetch(url);
      const buffer = Buffer.from(await response.arrayBuffer());
      imagesBase64.push(buffer.toString('base64'));
    }

    return { imagesBase64 };
  }
}
