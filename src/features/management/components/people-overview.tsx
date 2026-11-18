"use client";

import { Suspense, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { IconCards, IconUserPlus } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { AcademyContactButton } from "@/components/ui/academy-contact-button";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { QueryPagination } from "@/components/ui/query-pagination";
import { SectionCard } from "@/components/ui/section-card";
import type { PersonAccount } from "@/features/management/data";
import { roleCodes, type RoleCode } from "@/lib/auth-roles";

type PeopleOverviewProps = {
  accounts: PersonAccount[];
  page: number;
  total: number;
  pageSize: number;
  roleFilter: RoleCode | "";
  searchQuery: string;
  mailFromName?: string;
};

const joinedLabel = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

const statusColor = {
  Active: "success" as const,
  Invited: "warning" as const,
  Suspended: "default" as const,
};

function UserListFilters({
  roleFilter,
  searchQuery,
}: {
  roleFilter: RoleCode | "";
  searchQuery: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin");
  const roleT = useTranslations("shell");
  const [draft, setDraft] = useState(searchQuery);

  useEffect(() => {
    setDraft(searchQuery);
  }, [searchQuery]);

  const pushFilters = (role: RoleCode | "", q: string) => {
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set("q", trimmed);
    if (role) params.set("role", role);
    const query = params.toString();
    router.push(query ? `/admin/organization/users?${query}` : "/admin/organization/users");
  };

  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2} useFlexGap>
      <TextField
        size="small"
        label={t("management.people.searchLabel")}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") pushFilters(roleFilter, draft);
        }}
        sx={{ minWidth: { sm: 260 }, flex: 1 }}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="users-role-filter">{t("management.people.roleLabel")}</InputLabel>
        <Select
          labelId="users-role-filter"
          label={t("management.people.roleLabel")}
          value={roleFilter}
          onChange={(event) => pushFilters(event.target.value as RoleCode | "", draft)}
        >
          <MenuItem value="">{t("management.people.allRoles")}</MenuItem>
          {roleCodes.map((role) => (
            <MenuItem key={role} value={role}>
              {roleT(`roles.${role}`)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="outlined" onClick={() => pushFilters(roleFilter, draft)}>
        {t("management.people.search")}
      </Button>
      {roleFilter || searchQuery ? (
        <Button variant="text" onClick={() => pushFilters("", "")}>
          {t("management.people.clearFilters")}
        </Button>
      ) : null}
    </Stack>
  );
}

export function PeopleOverview({
  accounts,
  page,
  total,
  pageSize,
  roleFilter,
  searchQuery,
  mailFromName,
}: PeopleOverviewProps) {
  const t = useTranslations("admin");
  const roleT = useTranslations("shell");
  const locale = useLocale();

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("common.page.users")}
        subtitle={t("management.people.subtitle")}
        items={[
          { title: t("common.admin"), to: "/admin" },
          { title: t("common.section.organization") },
          { title: t("common.page.users") },
        ]}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <LinkButton href="/admin/organization/students" variant="outlined" startIcon={<IconCards size={16} />}>
            {t("management.people.studentsAndPairs")}
          </LinkButton>
          <LinkButton href="/admin/organization/roles" variant="contained" startIcon={<IconUserPlus size={16} />}>
            {t("management.people.manageRoles")}
          </LinkButton>
        </Stack>
      </Breadcrumb>

      <SectionCard
        title={t("management.people.accounts")}
        subtitle={t("management.people.accountsSubtitle")}
      >
        <UserListFilters roleFilter={roleFilter} searchQuery={searchQuery} />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("management.people.column.name")}</TableCell>
              <TableCell>{t("management.people.column.roles")}</TableCell>
              <TableCell>{t("management.people.column.status")}</TableCell>
              <TableCell>{t("management.people.column.twoFactor")}</TableCell>
              <TableCell>{t("management.people.column.joined")}</TableCell>
              <TableCell align="right">{t("management.people.column.links")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    {roleFilter || searchQuery
                      ? t("management.people.empty.filtered")
                      : t("management.people.empty.none")}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
            {accounts.map((person) => (
              <TableRow key={person.id} hover>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {person.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {person.email}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {person.roles.map((role) => (
                      <Chip
                        key={role}
                        label={roleT(`roles.${role}`)}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={t(`management.people.statusHint.${person.status.toLowerCase()}`)}
                  >
                    <Chip
                      label={t(`management.people.status.${person.status.toLowerCase()}`)}
                      size="small"
                      color={statusColor[person.status]}
                      variant="outlined"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={person.twoFactorEnabled
                      ? t("management.people.twoFactor.on")
                      : t("management.people.twoFactor.off")}
                    size="small"
                    color={person.twoFactorEnabled ? "success" : "default"}
                    variant={person.twoFactorEnabled ? "filled" : "outlined"}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {joinedLabel(person.createdAt, locale)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    <AcademyContactButton
                      to={person.email}
                      recipientName={person.name}
                      fromName={mailFromName}
                      topic={t("management.people.contactTopic", {
                        role: roleT(person.roles[0] ? `roles.${person.roles[0]}` : "roles.student"),
                      })}
                    />
                    {person.roles.includes("student") ? (
                      <Tooltip title={t("management.people.studentsTooltip")}>
                        <IconButton
                          component="a"
                          href="/admin/organization/students"
                          size="small"
                          aria-label={t("management.people.studentsAriaLabel", { name: person.name })}
                        >
                          <IconCards size={18} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Suspense fallback={null}>
          <QueryPagination page={page} total={total} pageSize={pageSize} />
        </Suspense>
      </SectionCard>
    </Box>
  );
}