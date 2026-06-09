import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DaemonError, ErrorCodes, type ErrorCode } from "@daemon/platform-types";

function asDaemonError(exception: unknown): DaemonError | null {
  if (exception instanceof DaemonError) {
    return exception;
  }
  if (
    typeof exception === "object" &&
    exception !== null &&
    "name" in exception &&
    (exception as Error).name === "DaemonError" &&
    "code" in exception &&
    "status" in exception
  ) {
    const e = exception as DaemonError;
    return new DaemonError(e.code as ErrorCode, e.message, e.status);
  }
  return null;
}

@Catch()
export class DaemonExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DaemonExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId =
      (req.headers["x-request-id"] as string | undefined) ??
      (req.headers["x-correlation-id"] as string | undefined);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === "object" ? body : { message: body });
      return;
    }

    const daemon = asDaemonError(exception);
    if (daemon) {
      res.status(daemon.status).json({
        code: daemon.code,
        message: daemon.message,
        ...(requestId ? { requestId } : {}),
      });
      return;
    }

    if (exception instanceof Error && /not found/i.test(exception.message)) {
      res.status(HttpStatus.NOT_FOUND).json({
        code: ErrorCodes.NOT_FOUND,
        message: exception.message,
        ...(requestId ? { requestId } : {}),
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack ?? exception.message : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCodes.INTERNAL,
      message: "internal server error",
      ...(requestId ? { requestId } : {}),
    });
  }
}
