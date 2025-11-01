import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'prisma/prisma.module';
import { ReviewsController } from './reviews/reviews.controller';
import { ReviewsModule } from './reviews/reviews.module';
import { LlmService } from './llm/llm.service';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot(),
    PrismaModule,
    ReviewsModule,
    LlmModule,
    ReviewsModule
  ],
  controllers: [AppController, ReviewsController],
  providers: [AppService, LlmService],
})
export class AppModule { }
