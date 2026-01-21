import { Controller, Get, Req, UseGuards, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { Request } from "express";
import { ReposService } from "./repos.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// #region agent log helper notes:
// Logging endpoint: http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6
// sessionId: debug-session
// #endregion

@Controller("repos")
export class ReposController {
  constructor(
    @Inject(ReposService) private reposService: ReposService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getRepositories(@Req() req: Request) {
    const { userId } = req.user as { userId: string };

    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H1",
        location: "repos.controller.ts:getRepositories:entry",
        message: "enter getRepositories",
        data: { userId },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.accessToken) {
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H1",
          location: "repos.controller.ts:getRepositories:missingToken",
          message: "user missing access token",
          data: { hasUser: !!user, userId },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      throw new HttpException("User access token not found", HttpStatus.UNAUTHORIZED);
    }

    // #region agent log
    fetch("http://127.0.0.1:7244/ingest/9483d164-7ac3-4bfb-bd50-3b5d453c05e6", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "run1",
        hypothesisId: "H2",
        location: "repos.controller.ts:getRepositories:tokenPresent",
        message: "user token present",
        data: {
          userId,
          tokenSuffix: user.accessToken.slice(-4),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return this.reposService.getUserRepositories(user.accessToken);
  }
}
