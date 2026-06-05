import { SetMetadata } from "@nestjs/common";

export const PUBLIC_KEY = "daemon:public";

/** Skips tenant binding and allows anonymous access (health, metrics). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
