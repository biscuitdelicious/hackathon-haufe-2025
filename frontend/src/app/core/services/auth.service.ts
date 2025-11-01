import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

interface AuthResponse {
    jwt_token: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3001/auth';
    private tokenKey = 'jwt_token';

    constructor(
        private http: HttpClient,
        private router: Router
    ) { }

    register(data: { username: string; password: string; email: string; name: string }): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
            ...data,
            role_id: 1
        }).pipe(
            tap(response => {
                this.setToken(response.jwt_token);
                this.router.navigate(['/dashboard']);
            })
        );
    }

    login(username: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
            .pipe(
                tap(response => {
                    this.setToken(response.jwt_token);
                    this.router.navigate(['/dashboard']);
                })
            );
    }

    logout(): void {
        localStorage.removeItem(this.tokenKey);
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    private setToken(token: string): void {
        localStorage.setItem(this.tokenKey, token);
    }
}