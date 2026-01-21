import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { Env } from "../config/env";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(ConfigService) configService: ConfigService<Env>) {
    const connectionString = configService.get("DATABASE_URL");
    const pool = connectionString ? new Pool({ connectionString }) : undefined;

    super(
      pool
        ? {
            adapter: new PrismaPg(pool),
          }
        : {},
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
