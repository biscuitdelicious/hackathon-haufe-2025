import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReviewsService, Review, Finding } from '../../core/services/reviews.service';
import { interval, Subscription } from 'rxjs';

@Component({
    selector: 'app-review-details',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './review-details.component.html',
    styleUrls: ['./review-details.component.css']
})
export class ReviewDetailsComponent implements OnInit {
    review: Review | null = null;
    loading = true;
    error = '';
    newComment = '';

    selectedCategory = 'All';
    pollingSubscription?: Subscription;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private reviewsService: ReviewsService
    ) { }

    ngOnInit() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (id) {
            this.loadReview(id);
        }
    }

    ngOnDestroy() {
        if (this.pollingSubscription) {
            this.pollingSubscription.unsubscribe();
        }
    }

    loadReview(id: number) {
        this.reviewsService.getReview(id).subscribe({
            next: (review) => {
                this.review = review;
                this.loading = false;

                // If still analyzing, poll every 3 seconds
                if (review.status === 'pending' || review.status === 'in_progress') {
                    this.startPolling(id);
                }
            },
            error: (err) => {
                this.error = 'Failed to load review';
                this.loading = false;
                console.error('Load review error:', err);
            }
        });
    }

    startPolling(id: number) {
        this.pollingSubscription = interval(3000).subscribe(() => {
            this.reviewsService.getReview(id).subscribe({
                next: (review) => {
                    this.review = review;
                    if (review.status === 'completed' || review.status === 'failed') {
                        this.pollingSubscription?.unsubscribe();
                    }
                }
            });
        });
    }

    get filteredFindings(): Finding[] {
        if (!this.review?.findings) return [];
        if (this.selectedCategory === 'All') return this.review.findings;
        return this.review.findings.filter(f => f.category === this.selectedCategory.toLowerCase());
    }

    get findingsByCategory() {
        if (!this.review?.findings) return {};
        return this.review.findings.reduce((acc: any, f) => {
            acc[f.category] = (acc[f.category] || 0) + 1;
            return acc;
        }, {});
    }

    getSeverityColor(severity: string): string {
        const colors: any = {
            'asap': 'bg-red-100 text-red-700 border-red-200',
            'high': 'bg-orange-100 text-orange-700 border-orange-200',
            'medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'low': 'bg-blue-100 text-blue-700 border-blue-200',
            'info': 'bg-green-100 text-green-700 border-green-200'
        };
        return colors[severity.toLowerCase()] || colors['info'];
    }

    getCategoryIcon(category: string): string {
        const icons: any = {
            'security': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
            'performance': 'M13 10V3L4 14h7v7l9-11h-7z',
            'bugs': 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
            'style': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
            'documentation': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        };
        return icons[category.toLowerCase()] || icons['documentation'];
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    getCodeLines(): string[] {
        return this.review?.code.split('\n') || [];
    }

    selectCategory(category: string) {
        this.selectedCategory = category;
    }

}