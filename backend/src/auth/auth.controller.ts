import {
    Request,
    Controller,
    HttpStatus,
    Post,
    Get,
    HttpCode,
    Body,
    UseGuards
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import * as bcrypt from 'bcrypt';
@Controller('auth')
export class AuthController {

    constructor(
        private authService: AuthService
    ) { }

    @Post('register')
    async register(@Body() registerDto: Record<string, any>) {
        const hashedPassword = await bcrypt.hash(registerDto.password, 12)

        const user = await this.authService.register({
            username: registerDto.username,
            password: hashedPassword,
            email: registerDto.email,
            name: registerDto.name,
            role_id: registerDto.role_id || 1
        });

        return this.authService.signIn(user.username, registerDto.password);
    }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    signIn(@Body() signInDto: Record<string, any>) {
        return this.authService.signIn(signInDto.username, signInDto.password);
    }

    @UseGuards(AuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user;
    }
}
