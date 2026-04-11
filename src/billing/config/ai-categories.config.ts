import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AiCategory = 'simples' | 'medio' | 'avancado';
export const AI_CATEGORIES: AiCategory[] = ['simples', 'medio', 'avancado'];

export type AiOperation = 'generate' | 'refine' | 'caption';

export interface AiCategoryDefinition {
  category: AiCategory;
  claudeModel: string;
  imageGenerator: string;
  costs: Record<AiOperation, number>;
}

const DEFAULTS: Record<
  AiCategory,
  {
    claudeModel: string;
    imageGenerator: string;
    costs: Record<AiOperation, number>;
  }
> = {
  simples: {
    claudeModel: 'claude-haiku-4-5',
    imageGenerator: 'fal',
    costs: { generate: 4, refine: 2, caption: 1 },
  },
  medio: {
    claudeModel: 'claude-sonnet-4-6',
    imageGenerator: 'stability',
    costs: { generate: 20, refine: 10, caption: 3 },
  },
  avancado: {
    claudeModel: 'claude-opus-4-6',
    imageGenerator: 'openai',
    costs: { generate: 80, refine: 40, caption: 10 },
  },
};

@Injectable()
export class AiCategoriesConfig {
  private readonly defs: Record<AiCategory, AiCategoryDefinition>;

  constructor(private readonly config: ConfigService) {
    this.defs = AI_CATEGORIES.reduce(
      (acc, category) => {
        const upper = category.toUpperCase();
        const def = DEFAULTS[category];
        acc[category] = {
          category,
          claudeModel:
            config.get<string>(`AI_CATEGORY_${upper}_CLAUDE_MODEL`) ??
            def.claudeModel,
          imageGenerator:
            config.get<string>(`AI_CATEGORY_${upper}_IMAGE_GENERATOR`) ??
            def.imageGenerator,
          costs: {
            generate: this.int(
              `CREDITS_COST_GENERATE_${upper}`,
              def.costs.generate,
            ),
            refine: this.int(`CREDITS_COST_REFINE_${upper}`, def.costs.refine),
            caption: this.int(
              `CREDITS_COST_CAPTION_${upper}`,
              def.costs.caption,
            ),
          },
        };
        return acc;
      },
      {} as Record<AiCategory, AiCategoryDefinition>,
    );
  }

  get(category: AiCategory): AiCategoryDefinition {
    return this.defs[category];
  }

  costFor(
    category: AiCategory,
    operation: AiOperation,
    imageCount = 1,
  ): number {
    const base = this.defs[category].costs[operation];
    return base * Math.max(1, imageCount);
  }

  private int(key: string, fallback: number): number {
    const v = this.config.get<string>(key);
    if (!v) return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
}
