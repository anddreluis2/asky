import { Controller, Get, Req, UseGuards, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { ReposService } from "./repos.service";
import { PrismaService } from "../prisma/prisma.service";

@Controller("repos")
export class ReposController {
  constructor(
    @Inject(ReposService) private reposService: ReposService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(AuthGuard("jwt"))
  async getRepositories(@Req() req: Request) {
    const { userId } = req.user as { userId: string };

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.accessToken) {
      throw new HttpException("User access token not found", HttpStatus.UNAUTHORIZED);
    }

    return this.reposService.getUserRepositories(user.accessToken);
  }
}
