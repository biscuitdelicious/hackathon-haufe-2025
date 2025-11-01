import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Review {
    id: number;
    title: string;
    description?: string;
    code: string;
    language: string;
    fileName?: string;
    status: string;
    summaryAnalysis?: string;
    overallEffortPoints?: number;
    createdAt: string;
    findings?: Finding[];
    _count?: { findings: number; comments: number };
}

export interface Finding {
    id: number;
    category: string;
    severity: string;
    title: string;
    description: string;
    lineNumber?: number;
    codeSnippet?: string;
    suggestion?: string;
    autoFixCode?: string;
    status: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReviewsService {
    private apiUrl = 'http://localhost:3001/reviews';

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('jwt_token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    createReview(data: {
        title: string;
        description?: string;
        code: string;
        language: string;
        fileName?: string;
    }): Observable<Review> {
        return this.http.post<Review>(this.apiUrl, data, { headers: this.getHeaders() });
    }

    getMyReviews(): Observable<Review[]> {
        return this.http.get<Review[]>(this.apiUrl, { headers: this.getHeaders() });
    }

    getReview(id: number): Observable<Review> {
        return this.http.get<Review>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
    }

}