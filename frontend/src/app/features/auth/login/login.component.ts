import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css']
})
export class LoginComponent {
    isLogin = true;
    loading = false;
    error = '';

    // Login form
    loginUsername = '';
    loginPassword = '';

    // Register form
    registerUsername = '';
    registerPassword = '';
    registerEmail = '';
    registerName = '';

    constructor(
        private authService: AuthService,
        private router: Router
    ) {
        // If already logged in, redirect
        if (this.authService.isAuthenticated()) {
            this.router.navigate(['/dashboard']);
        }
    }

    onLogin() {
        this.loading = true;
        this.error = '';

        this.authService.login(this.loginUsername, this.loginPassword).subscribe({
            next: () => {
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                this.error = 'Invalid credentials. Please try again.';
                console.error('Login error:', err);
            }
        });
    }

    onRegister() {
        this.loading = true;
        this.error = '';

        this.authService.register({
            username: this.registerUsername,
            password: this.registerPassword,
            email: this.registerEmail,
            name: this.registerName
        }).subscribe({
            next: () => {
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                this.error = 'Registration failed. Username might be taken.';
                console.error('Register error:', err);
            }
        });
    }

    toggleMode() {
        this.isLogin = !this.isLogin;
        this.error = '';
    }
}