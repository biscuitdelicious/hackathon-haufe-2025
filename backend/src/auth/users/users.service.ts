import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

export type User = {
    id: number;
    username: string;
    password: string;
    email: string | null;
    name: string;
    role_id: number;
}

@Injectable()
export class UsersService {

    // Injecting Prisma to query the database
    constructor(
        private prisma: PrismaService
    ) { }

    async findOneUser(username: string): Promise<User | null> {
        return this.prisma.staff.findUnique({
            where: { username: username }
        });
    }

    // Create a new user
    async create(userData: {
        username: string;
        password: string;
        email: string;
        name: string;
        role_id: number;
    }): Promise<User> {
        return this.prisma.staff.create({
            data: userData
        });
    }
}
