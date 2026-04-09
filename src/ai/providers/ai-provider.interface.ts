export type PostType = 'single' | 'carousel';

export enum ImageStyle {
  REALISTIC = 'realistic',
  CARTOON = 'cartoon',
  WATERCOLOR = 'watercolor',
  FLAT_DESIGN = 'flat-design',
  THREE_D = '3d',
  MINIMALIST = 'minimalist',
  PIXEL_ART = 'pixel-art',
  HAND_DRAWN = 'hand-drawn',
  COLLAGE = 'collage',
  NEON = 'neon',
  VINTAGE = 'vintage',
  ISOMETRIC = 'isometric',
}

export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = {
  [ImageStyle.REALISTIC]: 'Realista / Fotográfico',
  [ImageStyle.CARTOON]: 'Cartoon / Ilustração animada',
  [ImageStyle.WATERCOLOR]: 'Aquarela',
  [ImageStyle.FLAT_DESIGN]: 'Flat Design / Vetorial',
  [ImageStyle.THREE_D]: '3D Render',
  [ImageStyle.MINIMALIST]: 'Minimalista / Clean',
  [ImageStyle.PIXEL_ART]: 'Pixel Art',
  [ImageStyle.HAND_DRAWN]: 'Desenho à mão / Sketch',
  [ImageStyle.COLLAGE]: 'Colagem / Mixed Media',
  [ImageStyle.NEON]: 'Neon / Cyberpunk',
  [ImageStyle.VINTAGE]: 'Vintage / Retrô',
  [ImageStyle.ISOMETRIC]: 'Isométrico',
};

export interface GeneratePostInput {
  prompt: string;
  postType: PostType;
  slidesCount?: number;
  imageStyle?: ImageStyle;
  referenceImagesBase64?: string[];
  profileContext?: string;
  instructions?: string;
}

export interface RefineImagesInput {
  prompt: string;
  currentImagesBase64: string[];
  slideIndexes?: number[];
  imageStyle?: ImageStyle;
  referenceImagesBase64?: string[];
  profileContext?: string;
  instructions?: string;
}

export interface GeneratedImages {
  imagesBase64: string[];
  message: string;
}

export interface GenerateCaptionInput {
  prompt: string;
  imagesBase64: string[];
  instructions?: string;
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
