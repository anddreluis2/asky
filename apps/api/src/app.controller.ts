import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHealth(): { status: string; message: string } {
    return {
      status: "ok",
      message: "Asky API is running",
    };
  }
}
