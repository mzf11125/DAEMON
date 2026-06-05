import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

@Controller()
export class HealthController {
  @Get("health")
  @Public()
  health() {
    return { status: "ok" };
  }
}
