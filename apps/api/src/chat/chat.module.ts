import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EmbeddingModule } from "../embedding/embedding.module";

@Module({
  imports: [ConfigModule, PrismaModule, EmbeddingModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
