import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ReposController } from "./repos.controller";
import { ReposService } from "./repos.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule, PassportModule],
  controllers: [ReposController],
  providers: [ReposService],
})
export class ReposModule {}
