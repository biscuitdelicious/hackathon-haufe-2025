import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReviewsService, Review } from '../../core/services/reviews.service';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    reviews: Review[] = [];
    filteredReviews: Review[] = [];
    loading = true;
    error = '';

    // Filter states
    selectedFilter = 'All';
    searchQuery = '';

    // New review modal
    showNewReviewModal = false;
    newReview = {
        title: '',
        code: '',
        language: 'javascript',
        fileName: '',
        description: '',
        customGuidelines: ''
    };
    creatingReview = false;

    constructor(
        private reviewsService: ReviewsService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit() {
        this.loadReviews();

        // Reload reviews when navigating back to dashboard
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: any) => {
                if (event.url === '/dashboard') {
                    this.loadReviews();
                }
            });
    }

    loadReviews() {
        this.loading = true;
        this.reviewsService.getMyReviews().subscribe({
            next: (reviews) => {
                this.reviews = reviews;
                this.filteredReviews = reviews;
                this.loading = false;
                this.applyFilters();
            },
            error: (err) => {
                this.error = 'Failed to load reviews';
                this.loading = false;
                console.error('Load reviews error:', err);
            }
        });
    }

    applyFilters() {
        let filtered = [...this.reviews];

        // Apply status filter
        if (this.selectedFilter !== 'All') {
            filtered = filtered.filter(r => {
                if (this.selectedFilter === 'ASAP') return r.status === 'completed' && r.findings?.some(f => f.severity === 'asap');
                if (this.selectedFilter === 'Medium') return r.status === 'completed' && r.findings?.some(f => f.severity === 'medium');
                if (this.selectedFilter === 'Info') return r.status === 'completed' && r.findings?.some(f => f.severity === 'info');
                return true;
            });
        }

        // Apply search
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(query) ||
                r.language.toLowerCase().includes(query) ||
                r.fileName?.toLowerCase().includes(query)
            );
        }

        this.filteredReviews = filtered;
    }

    selectFilter(filter: string) {
        this.selectedFilter = filter;
        this.applyFilters();
    }

    onSearchChange() {
        this.applyFilters();
    }

    openNewReviewModal() {
        this.showNewReviewModal = true;
    }


    createReview() {
        if (!this.newReview.title || !this.newReview.code) {
            return;
        }

        this.creatingReview = true;
        this.reviewsService.createReview(this.newReview).subscribe({
            next: (review) => {
                this.creatingReview = false;
                this.closeNewReviewModal();
                this.router.navigate(['/reviews', review.id]);
            },
            error: (err) => {
                this.creatingReview = false;
                console.error('Create review error:', err);
                alert('Failed to create review');
            }
        });
    }

    viewReview(reviewId: number) {
        this.router.navigate(['/reviews', reviewId]);
    }

    logout() {
        this.authService.logout();
    }

    getSeverityColor(review: Review): string {
        if (!review.findings || review.findings.length === 0) {
            return 'bg-gray-100 text-gray-700';
        }

        const hasCritical = review.findings.some(f => f.severity === 'asap');
        const hasMedium = review.findings.some(f => f.severity === 'medium');

        if (hasCritical) return 'bg-red-100 text-red-700';
        if (hasMedium) return 'bg-orange-100 text-orange-700';
        return 'bg-green-100 text-green-700';
    }

    getSeverityText(review: Review): string {
        if (review.status === 'pending') return 'Pending';
        if (review.status === 'in_progress') return 'Analyzing...';
        if (!review.findings || review.findings.length === 0) return 'Info';

        const hasCritical = review.findings.some(f => f.severity === 'asap');
        const hasMedium = review.findings.some(f => f.severity === 'medium');

        if (hasCritical) return 'ASAP';
        if (hasMedium) return 'Medium';
        return 'Info';
    }

    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Add to properties:
    uploadedFileName = '';

    // Add this method:
    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        if (!file) return;

        // Set filename
        this.uploadedFileName = file.name;
        this.newReview.fileName = file.name;

        // Auto-detect language from extension
        this.newReview.language = this.detectLanguage(file.name);

        // Auto-generate title from filename
        if (!this.newReview.title) {
            this.newReview.title = `Review: ${file.name}`;
        }

        // Read file content
        const reader = new FileReader();
        reader.onload = (e: any) => {
            this.newReview.code = e.target.result;
        };
        reader.readAsText(file);
    }

    // Add language detection helper:
    detectLanguage(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'go': 'go',
            'rs': 'rust',
            'cpp': 'cpp',
            'c': 'cpp',
            'cc': 'cpp',
            'php': 'php',
            'rb': 'ruby',
            'swift': 'swift',
            'kt': 'kotlin',
            'cs': 'csharp'
        };
        return languageMap[ext || ''] || 'javascript';
    }

    // Update closeNewReviewModal to reset file state:
    closeNewReviewModal() {
        this.showNewReviewModal = false;
        this.uploadedFileName = ''; // ← ADD THIS
        this.newReview = {
            title: '',
            code: '',
            language: 'javascript',
            fileName: '',
            description: '',
            customGuidelines: ''
        };
    }

    // Add these methods:
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const fakeEvent = { target: { files: [files[0]] } };
            this.onFileSelected(fakeEvent);
        }
    }

}