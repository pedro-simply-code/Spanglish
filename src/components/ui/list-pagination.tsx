"use client";

import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_PAGE_SIZE, totalPages } from "@/lib/pagination";

type ListPaginationProps = {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
};

/** Client-side list paging (always 10 rows unless `pageSize` overrides). */
export function ListPagination({
  page,
  total,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
}: ListPaginationProps) {
  const t = useTranslations("shell");
  const locale = useLocale();
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
        onChange={(_, value) => onPageChange(value)}
      />
    </Box>
  );
}