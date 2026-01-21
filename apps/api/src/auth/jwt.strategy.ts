import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload, ExpressUser, JwtPayloadSchema } from "@asky/shared-types";
import type { Env } from "../config/env";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(ConfigService) configService: ConfigService<Env>) {
    const cookieExtractor = (request: any) => request?.cookies?.auth_token;
    const secret = configService.get("JWT_SECRET")!;

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: unknown): Promise<ExpressUser> {
    const validated = JwtPayloadSchema.parse(payload);
    return { userId: validated.sub, githubId: validated.githubId, username: validated.username };
  }
}
