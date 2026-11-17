import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PeopleOverview } from "@/features/management";
import { DEFAULT_PAGE_SIZE, pageOffset, parsePageParam } from "@/lib/pagination";
import { countUsersForAdmin, listUsersForAdmin, toPersonAccounts } from "@/server/admin/insights";
import { requireDashboard } from "@/server/auth/session";
import { roleCodes, type RoleCode } from "@/lib/auth-roles";

export const metadata: Metadata = {
  title: "Users",
  description: "Academy accounts and access state",
};

type PageProps = {
  searchParams: Promise<{ page?: string; q?: string; role?: string }>;
};

function parseRoleFilter(value: string | undefined): RoleCode | undefined {
  if (!value) return undefined;
  return roleCodes.includes(value as RoleCode) ? (value as RoleCode) : undefined;
}

export default function AdminOrganizationUsersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps) {
  const query = await searchParams;
  const page = parsePageParam(query.page);
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = pageOffset(page, pageSize);
  const role = parseRoleFilter(query.role);
  const search = query.q?.trim() ?? "";

  const filter = { role, search: search || undefined };

  const actor = await requireDashboard("admin");

  const [total, rows] = await Promise.all([
    countUsersForAdmin(filter),
    listUsersForAdmin({ offset, limit: pageSize, ...filter }),
  ]);

  return (
    <PeopleOverview
      accounts={toPersonAccounts(rows)}
      page={page}
      total={total}
      pageSize={pageSize}
      roleFilter={role ?? ""}
      searchQuery={search}
      mailFromName={actor.name}
    />
  );
}