import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ImageGenerator,
  ImageGenerationInput,
  ImageGenerationResult,
} from './image-generator.interface';

@Injectable()
export class StabilityImageGenerator implements ImageGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('STABILITY_API_KEY', '');
    this.baseUrl = this.configService.get<string>(
      'STABILITY_API_URL',
      'https://api.stability.ai',
    );
  }

  async generate(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    const imagesBase64: string[] = [];

    for (let i = 0; i < input.count; i++) {
      const formData = new FormData();
      formData.append('prompt', input.prompt);
      formData.append('output_format', 'png');
      formData.append('aspect_ratio', '1:1');

      const response = await fetch(
        `${this.baseUrl}/v2beta/stable-image/generate/core`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            Accept: 'application/json',
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stability AI error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as { image: string };
      if (data.image) {
        imagesBase64.push(data.image);
      }
    }

    return { imagesBase64 };
  }
}
