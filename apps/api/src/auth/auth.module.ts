import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { GitHubAuthController } from "./github.controller";
import { GitHubStrategy } from "./github.strategy";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthService } from "./auth.service";
import { PrismaModule } from "../prisma/prisma.module";
import type { Env } from "../config/env";

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>) => ({
        secret: configService.get("JWT_SECRET")!,
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [GitHubAuthController],
  providers: [AuthService, GitHubStrategy, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
