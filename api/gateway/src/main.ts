import "reflect-metadata";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DaemonExceptionFilter } from "./daemon-exception.filter";
import { AuthService } from "./auth/auth.service";

/** Load repo-root `.env` for local gateway dev; never walk parents in production. */
function loadRepoEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  const candidates = isProd
    ? [resolve(process.cwd(), ".env")]
    : [
        resolve(process.cwd(), ".env"),
        resolve(process.cwd(), "../.env"),
        resolve(process.cwd(), "../../.env"),
      ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    loadDotenv({ path, override: false });
    return;
  }
}

loadRepoEnv();
AuthService.assertBootConfig(process.env);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new DaemonExceptionFilter());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`daemon-api-gateway listening on http://localhost:${port}`);
}

bootstrap();
