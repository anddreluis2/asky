import { Controller, Post, Param, Body, Req, UseGuards, Inject, Res } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
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

  @Post(":owner/:repo/chat/stream")
  @UseGuards(AuthGuard("jwt"))
  async chatStream(
    @Param("owner") owner: string,
    @Param("repo") repo: string,
    @Body() body: ChatRequestBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { userId } = req.user as { userId: string };
    const fullName = `${owner}/${repo}`;

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Helps proxies (nginx) not buffer SSE
    res.setHeader("X-Accel-Buffering", "no");
    (res as any).flushHeaders?.();

    const writeEvent = (event: string, data: string) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    };

    const keepAlive = setInterval(() => {
      // comment ping (SSE)
      res.write(`: ping\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
    });

    try {
      await this.chatService.chatStream(
        fullName,
        body.question,
        userId,
        body.conversationHistory ?? [],
        {
          onToken: (token) => writeEvent("token", JSON.stringify({ token })),
          onDone: (payload) => writeEvent("done", JSON.stringify(payload)),
        },
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      writeEvent("error", JSON.stringify({ message }));
    } finally {
      clearInterval(keepAlive);
      res.end();
    }
  }
}
