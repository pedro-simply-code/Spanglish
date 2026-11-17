"use client";

import { Suspense, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { IconEdit, IconExternalLink } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { QueryPagination } from "@/components/ui/query-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { importDefaultPricingCatalogAction } from "@/features/admin/actions/pricing-packages";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import { PackageEditorDialog } from "@/features/admin/components/package-editor-dialog";
import { PackageCommerceLinks } from "@/features/admin/components/package-commerce-links";
import { PackageKindRulesCard } from "@/features/admin/components/package-kind-rules-card";
import type { AdminPackageDetail } from "@/features/admin/types";
import { formatMoney } from "@/features/academy/data";
import type { AdminPackageKindFilter } from "@/lib/admin-package-filter";

type CommercePackagesOverviewProps = {
  packages: AdminPackageDetail[];
  page: number;
  total: number;
  pageSize?: number;
  kind?: AdminPackageKindFilter;
};

const kindTab: Record<AdminPackageKindFilter, number> = {
  all: 0,
  "one-on-one": 1,
  paired: 2,
};

const tabKind: AdminPackageKindFilter[] = ["all", "one-on-one", "paired"];

const tabLabels: Record<AdminPackageKindFilter, string> = {
  all: "All",
  "one-on-one": "Individual",
  paired: "Paired",
};

const showsKindRules = (kind: AdminPackageKindFilter): kind is "one-on-one" | "paired" =>
  kind === "one-on-one" || kind === "paired";

/** MUI sets overflow: auto on the message slot, which shows a useless scrollbar on one line. */
const importFeedbackAlertSx = {
  mb: 2,
  alignItems: "center",
  "& .MuiAlert-icon": { py: 0, alignSelf: "center" },
  "& .MuiAlert-message": { py: 0, alignSelf: "center", overflow: "visible" },
  "& .MuiAlert-action": { py: 0, pt: 0, alignItems: "center", alignSelf: "center" },
} as const;

export function CommercePackagesOverview({
  packages,
  page,
  total,
  pageSize = DEFAULT_PAGE_SIZE,
  kind = "all",
}: CommercePackagesOverviewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<AdminPackageDetail | null>(null);

  const openCreate = () => {
    setEditorMode("create");
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (pkg: AdminPackageDetail) => {
    setEditorMode("edit");
    setEditing(pkg);
    setEditorOpen(true);
  };

  const runImport = () => {
    setImportMessage(null);
    setImportError(null);
    startTransition(async () => {
      const result = await importDefaultPricingCatalogAction(kind);
      if (!result.ok) {
        setImportError(result.message);
        return;
      }
      setImportMessage(result.message ?? "Default catalog imported.");
      router.refresh();
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Class packages"
        subtitle={
          showsKindRules(kind)
            ? "Credit bundles for this class type · teacher pay is revenue share on each credit (Finance → Teacher pay rates)."
            : "Prices and credit bundles for English-speaking learners buying live Spanish."
        }
        items={adminBreadcrumb("Commerce", "Packages", "/admin/commerce/packages")}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {showsKindRules(kind) ? <PackageCommerceLinks /> : null}
          <LinkButton
            href="/pricing"
            variant="outlined"
            size="small"
            target="_blank"
            endIcon={<IconExternalLink size={16} />}
          >
            View public pricing
          </LinkButton>
        </Stack>
      </Breadcrumb>

      {importMessage ? (
        <Alert severity="success" sx={importFeedbackAlertSx} onClose={() => setImportMessage(null)}>
          {importMessage}
        </Alert>
      ) : null}
      {importError ? (
        <Alert severity="error" sx={importFeedbackAlertSx} onClose={() => setImportError(null)}>
          {importError}
        </Alert>
      ) : null}

      <Tabs
        value={kindTab[kind]}
        onChange={(_, index) => {
          const next = tabKind[index] ?? "all";
          const params = new URLSearchParams();
          if (next !== "all") params.set("type", next === "one-on-one" ? "individual" : next);
          const query = params.toString();
          router.push(query ? `/admin/commerce/packages?${query}` : "/admin/commerce/packages");
        }}
        sx={{ mb: 2 }}
      >
        {tabKind.map((value) => (
          <Tab key={value} label={tabLabels[value]} />
        ))}
      </Tabs>

      <Grid container spacing={3}>
        {showsKindRules(kind) ? (
          <Grid size={{ xs: 12, lg: 4 }}>
            <PackageKindRulesCard kind={kind} />
          </Grid>
        ) : null}
        <Grid size={{ xs: 12, lg: showsKindRules(kind) ? 8 : 12 }}>
      <SectionCard
        title="Catalog"
        subtitle="USD list prices · Live packages are visible on /pricing and checkout (no separate publish step)"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Package</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell align="right">Credits</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {packages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">
                    No packages yet. Add one or import the default catalog.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {packages.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{row.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.id}
                  </Typography>
                </TableCell>
                <TableCell>{row.classType}</TableCell>
                <TableCell>{row.duration}</TableCell>
                <TableCell align="right">{row.credits}</TableCell>
                <TableCell align="right">{formatMoney(row.priceUsd)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={row.active ? "success" : "default"}
                    label={row.active ? `Live · ${row.publishedAt ?? "now"}` : "Draft"}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton aria-label={`Edit ${row.name}`} onClick={() => openEdit(row)} size="small">
                    <IconEdit size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={3}>
          <Button variant="contained" onClick={openCreate}>
            Add package
          </Button>
          <Button variant="outlined" onClick={runImport} disabled={pending}>
            {kind === "all"
              ? "Import default catalog"
              : `Import default ${tabLabels[kind].toLowerCase()} catalog`}
          </Button>
        </Stack>

        <Suspense fallback={null}>
          <QueryPagination page={page} total={total} pageSize={pageSize} />
        </Suspense>
      </SectionCard>
        </Grid>
      </Grid>

      {/* Remounts on each open so the form starts from the selected package. */}
      <PackageEditorDialog
        key={editorOpen ? `${editorMode}-${editing?.id ?? "new"}` : "closed"}
        open={editorOpen}
        mode={editorMode}
        initial={editing}
        onClose={() => setEditorOpen(false)}
      />
    </Box>
  );
}