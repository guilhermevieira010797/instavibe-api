import { Injectable } from '@nestjs/common';
import { ImageGenerator } from './image-generator.interface';
import { OpenAiImageGenerator } from './openai-image.generator';
import { StabilityImageGenerator } from './stability-image.generator';
import { FalImageGenerator } from './fal-image.generator';
import { ReplicateImageGenerator } from './replicate-image.generator';

@Injectable()
export class GeneratorsRegistry {
  private readonly generators: Record<string, ImageGenerator>;

  constructor(
    openai: OpenAiImageGenerator,
    stability: StabilityImageGenerator,
    fal: FalImageGenerator,
    replicate: ReplicateImageGenerator,
  ) {
    this.generators = { openai, stability, fal, replicate };
  }

  get(name: string): ImageGenerator {
    return this.generators[name] ?? this.generators.openai;
  }

  getDefault(defaultName: string): ImageGenerator {
    return this.get(defaultName);
  }
}
