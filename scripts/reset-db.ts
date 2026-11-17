/**
 * Empties the database so the schema can be recreated from scratch: drops
 * every table, view, type and sequence in the `public` schema plus Drizzle's
 * migration journal (`drizzle` schema). Only for development databases with
 * demo data: all accounts, classes, materials and chat history are deleted.
 *
 * Usage: npm run db:reset -- --yes
 * Then either `npm run db:migrate` (migrations) or `npm run db:push`.
 */
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("This deletes all data. Re-run with: npm run db:reset -- --yes");
    process.exit(1);
  }
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to reset a database with NODE_ENV=production.");
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const sql = neon(url);
  const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

  const tables = await sql.query(
    "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'",
  );
  for (const { name } of tables as { name: string }[]) {
    await sql.query(`DROP TABLE IF EXISTS public.${quote(name)} CASCADE`);
    console.log(`Dropped table ${name}`);
  }

  const views = await sql.query(
    "SELECT viewname AS name FROM pg_views WHERE schemaname = 'public'",
  );
  for (const { name } of views as { name: string }[]) {
    await sql.query(`DROP VIEW IF EXISTS public.${quote(name)} CASCADE`);
    console.log(`Dropped view ${name}`);
  }

  const sequences = await sql.query(
    "SELECT sequencename AS name FROM pg_sequences WHERE schemaname = 'public'",
  );
  for (const { name } of sequences as { name: string }[]) {
    await sql.query(`DROP SEQUENCE IF EXISTS public.${quote(name)} CASCADE`);
    console.log(`Dropped sequence ${name}`);
  }

  const types = await sql.query(
    `SELECT t.typname AS name FROM pg_type t
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public' AND t.typtype = 'e'`,
  );
  for (const { name } of types as { name: string }[]) {
    await sql.query(`DROP TYPE IF EXISTS public.${quote(name)} CASCADE`);
    console.log(`Dropped type ${name}`);
  }

  await sql.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  console.log("Dropped Drizzle migration journal");

  console.log("Done. Now run: npm run db:migrate && npm run db:seed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
