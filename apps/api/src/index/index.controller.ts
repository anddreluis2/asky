import { Controller, Post, Get, Param, Req, UseGuards, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { IndexService } from "./index.service";
import { PrismaService } from "../prisma/prisma.service";
import { ExpressUser } from "@asky/shared-types";

@Controller("repos")
export class IndexController {
  constructor(
    @Inject(IndexService) private indexService: IndexService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  @Get(":owner/:repo/index/status")
  @UseGuards(AuthGuard("jwt"))
  async getIndexStatus(@Param("owner") owner: string, @Param("repo") repo: string, @Req() req: Request) {
    const user = req.user;
    if (!user || typeof user !== "object" || !("userId" in user)) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }

    const expressUser = user as ExpressUser;
    const fullName = `${owner}/${repo}`;

    return this.indexService.getIndexStatus(fullName, expressUser.userId);
  }

  @Post(":owner/:repo/index")
  @UseGuards(AuthGuard("jwt"))
  async indexRepository(@Param("owner") owner: string, @Param("repo") repo: string, @Req() req: Request) {
    const user = req.user;
    if (!user || typeof user !== "object" || !("userId" in user)) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }

    const expressUser = user as ExpressUser;
    const fullName = `${owner}/${repo}`;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: expressUser.userId },
    });

    if (!dbUser || !dbUser.accessToken) {
      throw new HttpException("User access token not found", HttpStatus.UNAUTHORIZED);
    }

    return this.indexService.indexRepository(fullName, expressUser.userId, dbUser.accessToken);
  }
}
