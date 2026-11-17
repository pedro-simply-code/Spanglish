"use client";

import { useState, useTransition } from "react";
import type { ComponentType } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import {
  IconChalkboard,
  IconLayoutDashboard,
  IconSchool,
  IconShield,
  IconShieldCheck,
  IconUsersGroup,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import {
  dashboardByRole,
  getPermissions,
  roleCodes,
  roleDefinitions,
  ProfileSettings,
  SecuritySettings,
  signOutAction,
  switchDashboardAction,
} from "@/features/auth";
import type { AuthSession, EditableProfile, RoleCode } from "@/features/auth";
import { getAccountAvatarUrl } from "@/lib/account-avatar";

const notificationOptions = [
  {
    id: "daily",
    title: "Daily reminders",
    description: "Get a nudge to practice every day.",
  },
  {
    id: "weekly",
    title: "Weekly summary",
    description: "Receive a recap of your progress each week.",
  },
  {
    id: "achievements",
    title: "Achievement alerts",
    description: "Know as soon as you unlock a new badge.",
  },
];

const roleIcons: Record<RoleCode, ComponentType<{ size?: number }>> = {
  student: IconSchool,
  teacher: IconChalkboard,
  manager: IconUsersGroup,
  admin: IconShield,
};

type SettingsOverviewProps = {
  actor: AuthSession;
  /** Whether the account can sign in with a password (Security tab). */
  hasPassword: boolean;
  profile: EditableProfile;
  /** Opens a tab directly, e.g. from `/settings?tab=security`. */
  initialTab?: "security";
};

const securityTab = 4;

export function SettingsOverview({
  actor,
  hasPassword,
  profile,
  initialTab,
}: SettingsOverviewProps) {
  const [tab, setTab] = useState(initialTab === "security" ? securityTab : 0);
  const [pending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    daily: true,
    weekly: true,
    achievements: false,
  });
  const accountAvatarUrl = getAccountAvatarUrl(actor.userId);

  const grantedPermissions = getPermissions(actor.roles);

  const switchDashboard = (role: RoleCode) => {
    startTransition(() => {
      void switchDashboardAction(role);
    });
  };

  return (
    <Box mt={3}>
      <Breadcrumb title="Settings" subtitle="Make Spanglish yours" />

      <Card elevation={9}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: "30px" }}>
          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            aria-label="Settings sections"
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="Profile" />
            <Tab label="Notifications" />
            <Tab label="Preferences" />
            <Tab label="Roles & access" />
            <Tab label="Security" />
          </Tabs>
        </Box>

        <CardContent sx={{ p: "30px" }}>
          {tab === 0 ? (
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={accountAvatarUrl}
                  alt={actor.name}
                  sx={{ width: 72, height: 72 }}
                />
                <Box>
                  <Typography variant="h5">{actor.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {actor.email}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    mt={1}
                    flexWrap="wrap"
                    gap={0.75}
                  >
                    {actor.roles.map((role) => (
                      <Chip
                        key={role}
                        label={roleDefinitions[role].name}
                        size="small"
                        color={role === actor.activeRole ? "primary" : "default"}
                        variant={
                          role === actor.activeRole ? "filled" : "outlined"
                        }
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>

              <Divider />

              <ProfileSettings profile={profile} />

              <Divider />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
              >
                <Box>
                  <Typography variant="h6">Sign out</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your dashboard choice is remembered for the next sign-in.
                  </Typography>
                </Box>
                <Box component="form" action={signOutAction}>
                  <Button type="submit" variant="outlined" color="primary">
                    Sign out
                  </Button>
                </Box>
              </Stack>
            </Stack>
          ) : null}

          {tab === 1 ? (
            <Stack divider={<Divider />} spacing={3}>
              {notificationOptions.map((option) => (
                <Stack
                  key={option.id}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="h6">{option.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                  <Switch
                    checked={notifications[option.id]}
                    onChange={(event) =>
                      setNotifications((current) => ({
                        ...current,
                        [option.id]: event.target.checked,
                      }))
                    }
                    inputProps={{ "aria-label": option.title }}
                  />
                </Stack>
              ))}
            </Stack>
          ) : null}

          {tab === 2 ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="level-label">Spanish level</InputLabel>
                  <Select
                    labelId="level-label"
                    label="Spanish level"
                    defaultValue="intermediate"
                  >
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="advanced">Advanced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="goal-label">Daily goal</InputLabel>
                  <Select
                    labelId="goal-label"
                    label="Daily goal"
                    defaultValue="20"
                  >
                    <MenuItem value="10">10 minutes</MenuItem>
                    <MenuItem value="20">20 minutes</MenuItem>
                    <MenuItem value="30">30 minutes</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <Typography variant="h6" mb={1}>
                  Theme
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Spanglish uses a single orange theme for the whole app. There
                  is no theme switcher.
                </Typography>
              </Grid>
            </Grid>
          ) : null}

          {tab === 3 ? (
            <Stack spacing={3}>
              <Alert severity="info" icon={<IconLayoutDashboard size={20} />}>
                One dashboard is visible at a time. Switching role changes the
                sidebar, the topbar, and the whole dashboard content. The server
                redirects you away from any dashboard that is not active.
              </Alert>

              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    bgcolor: "primary.light",
                    color: "primary.main",
                  }}
                >
                  <IconShieldCheck size={28} />
                </Avatar>
                <Box>
                  <Typography variant="h5">Roles & access</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Permissions are cumulative. Every role you hold adds to your
                    access, but only the active role decides the visible
                    dashboard.
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={3}>
                {roleCodes.map((role) => {
                  const definition = roleDefinitions[role];
                  const owned = actor.roles.includes(role);
                  const active = actor.activeRole === role;
                  const Icon = roleIcons[role];

                  return (
                    <Grid key={role} size={{ xs: 12, md: 6 }}>
                      <SectionCard
                        title={definition.name}
                        subtitle={definition.description}
                        action={
                          <Avatar
                            sx={{
                              width: 42,
                              height: 42,
                              bgcolor: owned ? "primary.light" : "grey.100",
                              color: owned ? "primary.main" : "text.disabled",
                            }}
                          >
                            <Icon size={21} />
                          </Avatar>
                        }
                      >
                        <Stack spacing={2}>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            gap={0.75}
                          >
                            <Chip
                              label={definition.badge}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={`Priority ${definition.priority}`}
                              size="small"
                              variant="outlined"
                            />
                            {owned ? (
                              <Chip
                                label="Granted"
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label="Not granted"
                                size="small"
                                color="default"
                                variant="outlined"
                              />
                            )}
                          </Stack>

                          <Divider />

                          <Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                fontWeight: 600,
                              }}
                            >
                              Adds permissions
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              flexWrap="wrap"
                              gap={0.75}
                              mt={1}
                            >
                              {definition.permissions.map((permission) => (
                                <Chip
                                  key={permission}
                                  label={permission}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                          </Box>

                          {active ? (
                            <Alert severity="success">
                              This dashboard is active right now.
                            </Alert>
                          ) : owned ? (
                            <Button
                              variant="contained"
                              size="small"
                              disabled={pending}
                              onClick={() => switchDashboard(role)}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              Switch to {definition.name.toLowerCase()}{" "}
                              dashboard
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              This role is not assigned to your account. An
                              administrator can grant it from the admin
                              role-management tools.
                            </Typography>
                          )}
                        </Stack>
                      </SectionCard>
                    </Grid>
                  );
                })}
              </Grid>

              <SectionCard
                title="Your effective permissions"
                subtitle={`${grantedPermissions.length} permissions from ${actor.roles.length} role${actor.roles.length === 1 ? "" : "s"}`}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75}>
                    {grantedPermissions.map((permission) => (
                      <Chip
                        key={permission}
                        label={permission}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                  <Divider />
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                  >
                    <Typography variant="body2" color="text.secondary">
                      Active dashboard
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {dashboardByRole[actor.activeRole].label}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    The Student role is the account default and cannot be
                    removed. The academy always keeps at least one administrator.
                  </Typography>
                </Stack>
              </SectionCard>
            </Stack>
          ) : null}

          {tab === securityTab ? (
            <SecuritySettings
              hasPassword={hasPassword}
              twoFactorEnabled={actor.twoFactorEnabled}
            />
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
