import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@asky/shared-types";

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  async validateGitHubUser(
    githubId: string,
    username: string,
    avatar?: string,
    accessToken?: string,
  ): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { githubId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          githubId,
          username,
          avatar,
          accessToken,
        },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          avatar,
          accessToken,
        },
      });
    }

    return user;
  }

  async login(user: User): Promise<string> {
    const payload = { sub: user.id, githubId: user.githubId, username: user.username };

    return this.jwtService.sign(payload);
  }

  async verifyToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
