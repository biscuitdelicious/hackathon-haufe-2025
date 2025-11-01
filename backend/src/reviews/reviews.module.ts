import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [ReviewsService],
  controllers: [ReviewsController],
  exports: [ReviewsService]
})
export class ReviewsModule { }
