import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReposModule } from "./repos/repos.module";
import { GitHubModule } from "./github/github.module";
import { EmbeddingModule } from "./embedding/embedding.module";
import { IndexModule } from "./index/index.module";
import { ChatModule } from "./chat/chat.module";
import { AppController } from "./app.controller";
import { validateEnv } from "./config/env";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ReposModule,
    GitHubModule,
    EmbeddingModule,
    IndexModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
