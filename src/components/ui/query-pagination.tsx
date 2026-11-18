"use client";

import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import Typography from "@mui/material/Typography";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_PAGE_SIZE, totalPages } from "@/lib/pagination";

type QueryPaginationProps = {
  page: number;
  total: number;
  pageSize?: number;
  /** Extra query keys to preserve (e.g. filters later). */
  paramName?: string;
};

/**
 * Page links use `?page=` on the current path. Other search params are kept.
 */
export function QueryPagination({
  page,
  total,
  pageSize = DEFAULT_PAGE_SIZE,
  paramName = "page",
}: QueryPaginationProps) {
  const t = useTranslations("shell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pages = totalPages(total, pageSize);

  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <Box
      sx={{
        mt: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {t("pagination.showing", {
          from: from.toLocaleString(locale),
          to: to.toLocaleString(locale),
          total: total.toLocaleString(locale),
        })}
      </Typography>
      <Pagination
        color="primary"
        shape="rounded"
        page={page}
        count={pages}
        onChange={(_, value) => {
          const params = new URLSearchParams(searchParams.toString());
          if (value <= 1) {
            params.delete(paramName);
          } else {
            params.set(paramName, String(value));
          }
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
      />
    </Box>
  );
}