import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users/users.service';
import * as bcrypt from 'bcrypt';


@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }


    async register(userData: {
        username: string;
        password: string;
        email: string;
        name: string;
        role_id: number;
    }) {
        return this.usersService.create(userData);
    }

    async signIn(username: string, password: string): Promise<{ jwt_token: string }> {
        const user = await this.usersService.findOneUser(username);

        // Check if user exists and matches password
        if (!user) {
            throw new UnauthorizedException();
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new UnauthorizedException();
        }

        const payload = {
            sub: user.id,
            username: user.username
        };

        return {
            jwt_token: await this.jwtService.signAsync(payload),
        };
    }
}
