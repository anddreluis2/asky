import { Controller, Post, Param, Body, Req, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { ChatService } from "./chat.service";

interface ChatRequestBody {
  question: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

@Controller("repos")
export class ChatController {
  constructor(@Inject(ChatService) private chatService: ChatService) {}

  @Post(":owner/:repo/chat")
  @UseGuards(AuthGuard("jwt"))
  async chat(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() body: ChatRequestBody,
    @Req() req: Request,
  ) {
    const { userId } = req.user as { userId: string };
    const fullName = `${owner}/${repo}`;

    return this.chatService.chat(fullName, body.question, userId, body.conversationHistory ?? []);
  }
}
