import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { OpenAiImageGenerator } from './image-generators/openai-image.generator';
import { StabilityImageGenerator } from './image-generators/stability-image.generator';
import { FalImageGenerator } from './image-generators/fal-image.generator';
import { ReplicateImageGenerator } from './image-generators/replicate-image.generator';
import { GeneratorsRegistry } from './image-generators/generators.registry';
import { ProfilesModule } from '../profiles/profiles.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [ProfilesModule, BillingModule],
  controllers: [AiController],
  providers: [
    AiService,
    ClaudeProvider,
    OpenAiProvider,
    OpenAiImageGenerator,
    StabilityImageGenerator,
    FalImageGenerator,
    ReplicateImageGenerator,
    GeneratorsRegistry,
  ],
  exports: [AiService],
})
export class AiModule {}
