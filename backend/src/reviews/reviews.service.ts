import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LlmService } from 'src/llm/llm.service';

export interface CreateReviewDto {
    title: string;
    description?: string;
    code: string;
    language: string;
    fileName?: string;
    userId: number;
}


@Injectable()
export class ReviewsService {
    constructor(
        private prisma: PrismaService,
        private llmService: LlmService,
    ) { }

    /**
     * Create a new code review and trigger AI analysis
     */
    async create(data: CreateReviewDto) {
        const review = await this.prisma.codeReview.create({
            data: {
                title: data.title,
                description: data.description,
                code: data.code,
                language: data.language,
                fileName: data.fileName,
                userId: data.userId,
                status: 'pending',
            },
        });

        // Step 2: Trigger AI analysis in background (don't wait)
        this.analyzeReview(review.id).catch((err) =>
            console.error(`Failed to analyze review ${review.id}:`, err),
        );

        return review;
    }


    async analyzeReview(reviewId: number) {
        // Update status to 'in_progress'
        await this.prisma.codeReview.update({
            where: { id: reviewId },
            data: { status: 'in_progress' },
        });

        try {
            // Get the review
            const review = await this.prisma.codeReview.findUnique({
                where: { id: reviewId },
            });

            if (!review)
                throw new Error('Review not found. Make sure the review exists.');

            // Call LLM to analyze
            const analysis = await this.llmService.analyzeCode(
                review.code,
                review.language,
                review.fileName || undefined,
            );

            // Save analysis summary
            await this.prisma.codeReview.update({
                where: { id: reviewId },
                data: {
                    summaryAnalysis: analysis.summary,
                    overallEffortPoints: analysis.effortPoints,
                    status: 'completed',
                },
            });

            // Save each finding
            for (let finding of analysis.findings) {
                await this.prisma.lLMReview.create({
                    data: {
                        reviewId: reviewId,
                        category: finding.category,
                        severity: finding.severity,
                        title: finding.title,
                        description: finding.description,
                        lineNumber: finding.lineNumber,
                        codeSnippet: finding.codeSnippet,
                        suggestion: finding.suggestion,
                        autoFixCode: finding.autoFixCode,
                    },
                });
            }

            // Update user stats
            await this.updateUserProgress(review.userId, analysis.overallScore);

            console.log(`Review with id[${reviewId}] analysis completed`);
        } catch (error) {
            console.error(`Analysis failed for review ${reviewId}:`, error);
            await this.prisma.codeReview.update({
                where: { id: reviewId },
                data: { status: 'failed' },
            });
        }
    }

    // Get all reviews for an user
    async findByUser(userId: number) {
        return this.prisma.codeReview.findMany({
            where: { id: userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: {
                        findings: true,
                        comments: true
                    },
                },
            },
        });
    }


    // Get a specific review with all findings
    async findOne(id: number) {
        return this.prisma.codeReview.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                    },
                },
                findings: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        comments: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                        name: true
                                    },
                                },
                            },
                        },
                    },
                },
                comments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                name: true
                            },
                        },
                    },
                },
            },
        });
    }


    // Update users's progress after review
    async updateUserProgress(userId: number, reviewScore: number) {
        const user = await this.prisma.staff.findUnique({
            where: { id: userId },
        });

        // TODO: Handle the case if user doesn't exist.
        if (!user)
            return;

        const totalReviews = user.totalReviews + 1;
        const currentAvg = user.averageScore || 0;
        const newAvg =
            (currentAvg * user.totalReviews + reviewScore) / totalReviews;

        await this.prisma.staff.update({
            where: { id: userId },
            data: {
                totalReviews: totalReviews,
                averageScore: newAvg,
                lastReviewDate: new Date(),
            },
        });
    }


    // Get user's progress stats
    async getUserProgress(userId: number) {
        return this.prisma.staff.findUnique({
            where: { id: userId },
            select: {
                totalReviews: true,
                averageScore: true,
                lastReviewDate: true,
                improvementStreak: true,
            },
        });
    }

    // Add comment to review or finding
    async addComment(data: {
        content: string;
        userId: number;
        reviewId?: number;
        findingId?: number;
    }) {
        return this.prisma.reviewComment.create({
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        name: true
                    },
                },
            },
        });
    }


    // Update finding status
    async updateFindingStatus(id: number, status: string) {
        return this.prisma.lLMReview.update({
            where: { id },
            data: { status },
        });
    }
}