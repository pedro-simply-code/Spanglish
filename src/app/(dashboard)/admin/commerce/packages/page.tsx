import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { CommercePackagesOverview } from "@/features/admin";
import { adminPackageKindToClassType, parseAdminPackageKindParam } from "@/lib/admin-package-filter";
import { DEFAULT_PAGE_SIZE, pageOffset, parsePageParam } from "@/lib/pagination";
import { countCommercePackages, listAdminPackageDetailsPaginated } from "@/server/admin/insights";

export const metadata: Metadata = {
  title: "Packages",
  description: "Admin catalog of class packages and prices",
};

type PageProps = {
  searchParams: Promise<{ page?: string; type?: string }>;
};

export default function AdminCommercePackagesPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps) {
  const query = await searchParams;
  const page = parsePageParam(query.page);
  const kind = parseAdminPackageKindParam(query.type);
  const classType = adminPackageKindToClassType(kind);
  const pageSize = DEFAULT_PAGE_SIZE;
  const offset = pageOffset(page, pageSize);

  const [total, packages] = await Promise.all([
    countCommercePackages(undefined, classType),
    listAdminPackageDetailsPaginated({ offset, limit: pageSize, classType }),
  ]);

  return (
    <CommercePackagesOverview
      packages={packages}
      page={page}
      total={total}
      pageSize={pageSize}
      kind={kind}
    />
  );
}