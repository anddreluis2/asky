import { Module } from "@nestjs/common";
import { IndexController } from "./index.controller";
import { IndexService } from "./index.service";
import { PrismaModule } from "../prisma/prisma.module";
import { GitHubModule } from "../github/github.module";
import { EmbeddingModule } from "../embedding/embedding.module";
import { ParserModule } from "../parser/parser.module";

@Module({
  imports: [PrismaModule, GitHubModule, EmbeddingModule, ParserModule],
  controllers: [IndexController],
  providers: [IndexService],
  exports: [IndexService],
})
export class IndexModule {}
