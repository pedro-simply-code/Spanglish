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
import { AcademyContactButton } from "@/components/ui/academy-contact-button";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { QueryPagination } from "@/components/ui/query-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { roleDefinitions } from "@/features/auth";
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

const joinedLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

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
        label="Search name or email"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") pushFilters(roleFilter, draft);
        }}
        sx={{ minWidth: { sm: 260 }, flex: 1 }}
      />
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="users-role-filter">Role</InputLabel>
        <Select
          labelId="users-role-filter"
          label="Role"
          value={roleFilter}
          onChange={(event) => pushFilters(event.target.value as RoleCode | "", draft)}
        >
          <MenuItem value="">All roles</MenuItem>
          {roleCodes.map((role) => (
            <MenuItem key={role} value={role}>
              {roleDefinitions[role].badge}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="outlined" onClick={() => pushFilters(roleFilter, draft)}>
        Search
      </Button>
      {roleFilter || searchQuery ? (
        <Button variant="text" onClick={() => pushFilters("", "")}>
          Clear filters
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
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Users"
        subtitle="Accounts can hold multiple roles; status reflects email verification and delivery health."
        items={[
          { title: "Admin", to: "/admin" },
          { title: "Organization" },
          { title: "Users" },
        ]}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <LinkButton href="/admin/organization/students" variant="outlined" startIcon={<IconCards size={16} />}>
            Students & pairs
          </LinkButton>
          <LinkButton href="/admin/organization/roles" variant="contained" startIcon={<IconUserPlus size={16} />}>
            Manage roles
          </LinkButton>
        </Stack>
      </Breadcrumb>

      <SectionCard
        title="Accounts"
        subtitle="Suspended means email bounced — transactional mail is suppressed until the address is fixed."
      >
        <UserListFilters roleFilter={roleFilter} searchQuery={searchQuery} />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>2FA</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell align="right">Links</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    {roleFilter || searchQuery
                      ? "No accounts match these filters."
                      : "No accounts yet. Run db:seed or sign up on the site."}
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
                        label={roleDefinitions[role].badge}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Tooltip
                    title={
                      person.status === "Suspended"
                        ? "Email bounced — not a manual ban"
                        : person.status === "Invited"
                          ? "Email not verified yet"
                          : "Verified and deliverable"
                    }
                  >
                    <Chip
                      label={person.status}
                      size="small"
                      color={statusColor[person.status]}
                      variant="outlined"
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={person.twoFactorEnabled ? "On" : "Off"}
                    size="small"
                    color={person.twoFactorEnabled ? "success" : "default"}
                    variant={person.twoFactorEnabled ? "filled" : "outlined"}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {joinedLabel(person.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                    <AcademyContactButton
                      to={person.email}
                      recipientName={person.name}
                      fromName={mailFromName}
                      topic={`message for ${person.roles[0] ?? "member"}`}
                    />
                    {person.roles.includes("student") ? (
                      <Tooltip title="Students, pairs, and credit balances">
                        <IconButton
                          component="a"
                          href="/admin/organization/students"
                          size="small"
                          aria-label={`Open students directory for ${person.name}`}
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