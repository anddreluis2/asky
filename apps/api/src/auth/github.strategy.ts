import { Injectable, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy, StrategyOption } from "passport-github2";
import { AuthService } from "./auth.service";

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(@Inject(AuthService) private authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:3001/auth/github/callback",
      scope: ["user:email", "read:org"],
    } as StrategyOption);
  }

  async validate(accessToken: string, _refreshToken: string, profile: Profile): Promise<any> {
    const user = await this.authService.validateGitHubUser(
      profile.id,
      profile.username,
      profile.photos?.[0]?.value,
      accessToken,
    );
    return user;
  }
}
