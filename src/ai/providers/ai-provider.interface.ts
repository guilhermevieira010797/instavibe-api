export type PostType = 'single' | 'carousel';

export interface GeneratePostInput {
  prompt: string;
  postType: PostType;
  slidesCount?: number;
  referenceImagesBase64?: string[];
  profileContext?: string;
}

export interface RefineImagesInput {
  prompt: string;
  currentImagesBase64: string[];
  slideIndexes?: number[];
  referenceImagesBase64?: string[];
  profileContext?: string;
}

export interface GeneratedImages {
  imagesBase64: string[];
}

export interface GenerateCaptionInput {
  prompt: string;
  imagesBase64: string[];
}

export interface GeneratedCaption {
  caption: string;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  generateImages(input: GeneratePostInput): Promise<GeneratedImages>;
  refineImages(input: RefineImagesInput): Promise<GeneratedImages>;
  generateCaption(input: GenerateCaptionInput): Promise<GeneratedCaption>;
}
