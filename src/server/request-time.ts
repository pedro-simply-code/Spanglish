import { connection } from "next/server";

/**
 * Marks a read as request-time (it uses the clock). Inside Next.js this is
 * `connection()`; scripts such as the seed run outside a request, where it is
 * a no-op.
 */
export async function requestTime() {
  try {
    await connection();
  } catch (error) {
    if (error instanceof Error && error.message.includes("outside a request scope")) return;
    throw error;
  }
}
