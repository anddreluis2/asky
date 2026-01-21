import { Controller, Get, Req, Res, UseGuards, HttpStatus, Inject } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { User } from "@asky/shared-types";

@Controller("auth")
export class GitHubAuthController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  @Get("github")
  @UseGuards(AuthGuard("github"))
  async githubAuth(): Promise<void> {
    // Initiates GitHub OAuth flow
  }

  @Get("github/callback")
  @UseGuards(AuthGuard("github"))
  async githubAuthCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const user = req.user;
    if (!user || typeof user !== "object" || !("id" in user)) {
      res.status(HttpStatus.UNAUTHORIZED).json({ message: "Authentication failed" });
      return;
    }
    
    // User is validated by GitHubStrategy which returns User
    const validatedUser = user as User;
    const token = await this.authService.login(validatedUser);

    // Set httpOnly cookie with JWT
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend
    res.redirect(process.env.FRONTEND_URL || "http://localhost:5173");
  }

  @Get("logout")
  async logout(@Res() res: Response): Promise<void> {
    res.clearCookie("auth_token");
    res.json({ message: "Logged out successfully" });
  }

  @Get("me")
  async getProfile(@Req() req: Request): Promise<User | null> {
    const token = req.cookies.auth_token;

    if (!token || typeof token !== "string") {
      return null;
    }

    try {
      const user = await this.authService.verifyToken(token);
      return user;
    } catch {
      return null;
    }
  }
}
