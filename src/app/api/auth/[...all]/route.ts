import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";

/** Better Auth endpoints (web forms today, the Android app later). */
export const { GET, POST } = toNextJsHandler(auth);
