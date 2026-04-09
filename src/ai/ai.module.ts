import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { IMAGE_GENERATOR } from './image-generators/image-generator.interface';
import { OpenAiImageGenerator } from './image-generators/openai-image.generator';
import { StabilityImageGenerator } from './image-generators/stability-image.generator';
import { FalImageGenerator } from './image-generators/fal-image.generator';
import { ReplicateImageGenerator } from './image-generators/replicate-image.generator';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [ProfilesModule],
  controllers: [AiController],
  providers: [
    AiService,
    OpenAiProvider,
    ClaudeProvider,
    OpenAiImageGenerator,
    StabilityImageGenerator,
    FalImageGenerator,
    ReplicateImageGenerator,
    {
      provide: IMAGE_GENERATOR,
      useFactory: (
        configService: ConfigService,
        openai: OpenAiImageGenerator,
        stability: StabilityImageGenerator,
        fal: FalImageGenerator,
        replicate: ReplicateImageGenerator,
      ) => {
        const generator = configService.get<string>(
          'IMAGE_GENERATOR',
          'openai',
        );
        const generators: Record<string, unknown> = {
          openai,
          stability,
          fal,
          replicate,
        };
        return generators[generator] ?? openai;
      },
      inject: [
        ConfigService,
        OpenAiImageGenerator,
        StabilityImageGenerator,
        FalImageGenerator,
        ReplicateImageGenerator,
      ],
    },
    {
      provide: AI_PROVIDER,
      useFactory: (
        configService: ConfigService,
        openAiProvider: OpenAiProvider,
        claudeProvider: ClaudeProvider,
      ) => {
        const provider = configService.get<string>('AI_PROVIDER', 'openai');
        return provider === 'claude' ? claudeProvider : openAiProvider;
      },
      inject: [ConfigService, OpenAiProvider, ClaudeProvider],
    },
  ],
  exports: [AiService],
})
export class AiModule {}
