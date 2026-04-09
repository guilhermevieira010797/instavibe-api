export interface ImageGenerationInput {
  prompt: string;
  count: number;
  size?: string;
}

export interface ImageGenerationResult {
  imagesBase64: string[];
}

export const IMAGE_GENERATOR = Symbol('IMAGE_GENERATOR');

export interface ImageGenerator {
  generate(input: ImageGenerationInput): Promise<ImageGenerationResult>;
}
