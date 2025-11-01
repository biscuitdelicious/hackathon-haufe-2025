import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    ParseIntPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {

    constructor(
        private reviewsService: ReviewsService
    ) { }

    // Create new review
    @Post()
    async create(@Body() body: any, @Request() req: any) {
        return this.reviewsService.create({
            title: body.title,
            description: body.description,
            code: body.code,
            language: body.language,
            fileName: body.fileName,
            userId: req.user.sub, // From JWT token
            customGuidelines: body.customGuidelines || '',
        });
    }

    // Get current user's review history
    @Get()
    async findMyReviews(@Request() req: any) {
        return this.reviewsService.findByUser(req.user.sub);
    }

    // Get current users's learning path/progress
    @Get('progress')
    async getProgress(@Request() req: any) {
        return this.reviewsService.getUserProgress(req.user.sub);
    }

    // Get a specific review with all findings
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.reviewsService.findOne(id);
    }

    // Add comment to review
    @Post(':id/comments')
    async addComment(
        @Param('id', ParseIntPipe) reviewId: number,
        @Body('content') content: string,
        @Request() req: any,
    ) {
        return this.reviewsService.addComment({
            content,
            userId: req.user.sub,
            reviewId,
        });
    }

    // Add comment to a specific finding
    @Post('findings/:id/comments')
    async addFindingComment(
        @Param('id', ParseIntPipe) findingId: number,
        @Body('content') content: string,
        @Request() req: any,
    ) {
        return this.reviewsService.addComment({
            content,
            userId: req.user.sub,
            findingId,
        });
    }

    // Update finding status
    @Patch('findings/:id/status')
    async updateFindingStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: string,
    ) {
        return this.reviewsService.updateFindingStatus(id, status);
    }



}
