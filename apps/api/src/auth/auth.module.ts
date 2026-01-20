import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { GitHubAuthController } from "./github.controller";
import { GitHubStrategy } from "./github.strategy";
import { JwtStrategy } from "./jwt.strategy";
import { AuthService } from "./auth.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "7d" },
    }),
  ],
  controllers: [GitHubAuthController],
  providers: [AuthService, GitHubStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
