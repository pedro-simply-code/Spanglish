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
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import {
  getPermissions,
  roleCodes,
  roleDefinitions,
  ProfileSettings,
  DeleteAccountCard,
  SecuritySettings,
  signOutAction,
  switchDashboardAction,
} from "@/features/auth";
import type { AuthSession, EditableProfile, RoleCode } from "@/features/auth";
import { getAccountAvatarUrl } from "@/lib/account-avatar";

/** Converts a permission identifier such as `classes:view-own` into a catalog key. */
function permissionKey(permission: string) {
  return `permissions.${permission.replace(/[:_-]([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
}

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
  const t = useTranslations("shell");
  const dynamicT = t as (key: string, values?: Record<string, string | number>) => string;
  const [tab, setTab] = useState(initialTab === "security" ? securityTab : 0);
  const [pending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    daily: true,
    weekly: true,
    achievements: false,
  });
  const accountAvatarUrl = getAccountAvatarUrl(actor.userId, actor.image);

  const grantedPermissions = getPermissions(actor.roles);

  const notificationOptions = [
    {
      id: "daily",
      title: t("settings.notifications.daily.title"),
      description: t("settings.notifications.daily.description"),
    },
    {
      id: "weekly",
      title: t("settings.notifications.weekly.title"),
      description: t("settings.notifications.weekly.description"),
    },
    {
      id: "achievements",
      title: t("settings.notifications.achievements.title"),
      description: t("settings.notifications.achievements.description"),
    },
  ];

  const switchDashboard = (role: RoleCode) => {
    startTransition(() => {
      void switchDashboardAction(role);
    });
  };

  return (
    <Box>
      <Breadcrumb
        title={t("settings.breadcrumb.title")}
        subtitle={t("settings.breadcrumb.subtitle")}
      />

      <Card elevation={9}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: "30px" }}>
          <Tabs
            value={tab}
            onChange={(_, value: number) => setTab(value)}
            aria-label={t("settings.tabs.ariaLabel")}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label={t("settings.tabs.profile")} />
            <Tab label={t("settings.tabs.notifications")} />
            <Tab label={t("settings.tabs.preferences")} />
            <Tab label={t("settings.tabs.rolesAccess")} />
            <Tab label={t("settings.tabs.security")} />
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
                        label={t(`roles.${role}`)}
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
                  <Typography variant="h6">{t("settings.profile.signOutTitle")}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("settings.profile.signOutHelp")}
                  </Typography>
                </Box>
                <Box component="form" action={signOutAction}>
                  <Button type="submit" variant="outlined" color="primary">
                    {t("settings.profile.signOut")}
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
                  <InputLabel id="level-label">{t("settings.preferences.levelLabel")}</InputLabel>
                  <Select
                    labelId="level-label"
                    label={t("settings.preferences.levelLabel")}
                    defaultValue="intermediate"
                  >
                    <MenuItem value="beginner">{t("settings.preferences.beginner")}</MenuItem>
                    <MenuItem value="intermediate">{t("settings.preferences.intermediate")}</MenuItem>
                    <MenuItem value="advanced">{t("settings.preferences.advanced")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="goal-label">{t("settings.preferences.goalLabel")}</InputLabel>
                  <Select
                    labelId="goal-label"
                    label={t("settings.preferences.goalLabel")}
                    defaultValue="20"
                  >
                    <MenuItem value="10">{t("settings.preferences.minutes10")}</MenuItem>
                    <MenuItem value="20">{t("settings.preferences.minutes20")}</MenuItem>
                    <MenuItem value="30">{t("settings.preferences.minutes30")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={12}>
                <Typography variant="h6" mb={1}>
                  {t("settings.preferences.theme")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.preferences.themeHelp")}
                </Typography>
              </Grid>
            </Grid>
          ) : null}

          {tab === 3 ? (
            <Stack spacing={3}>
              <Alert severity="info" icon={<IconLayoutDashboard size={20} />}>
                {t("settings.rolesAccess.notice")}
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
                  <Typography variant="h5">{t("settings.rolesAccess.heading")}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("settings.rolesAccess.description")}
                  </Typography>
                </Box>
              </Stack>

              <Grid container spacing={3}>
                {roleCodes.map((role) => {
                  const owned = actor.roles.includes(role);
                  const active = actor.activeRole === role;
                  const Icon = roleIcons[role];
                  const roleLabel = t(`roles.${role}`);

                  return (
                    <Grid key={role} size={{ xs: 12, md: 6 }}>
                      <SectionCard
                        title={roleLabel}
                        subtitle={dynamicT(`roles.descriptions.${role}`)}
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
                              label={dynamicT(`roles.badges.${role}`)}
                              size="small"
                              variant="outlined"
                            />
                            <Chip
                              label={t("settings.rolesAccess.priority", {
                                priority: roleDefinitions[role].priority,
                              })}
                              size="small"
                              variant="outlined"
                            />
                            {owned ? (
                              <Chip
                                label={t("settings.rolesAccess.granted")}
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            ) : (
                              <Chip
                                label={t("settings.rolesAccess.notGranted")}
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
                              {t("settings.rolesAccess.addsPermissions")}
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              flexWrap="wrap"
                              gap={0.75}
                              mt={1}
                            >
                              {roleDefinitions[role].permissions.map((permission) => (
                                <Chip
                                  key={permission}
                                  label={dynamicT(permissionKey(permission))}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                          </Box>

                          {active ? (
                            <Alert severity="success">
                              {t("settings.rolesAccess.activeNow")}
                            </Alert>
                          ) : owned ? (
                            <Button
                              variant="contained"
                              size="small"
                              disabled={pending}
                              onClick={() => switchDashboard(role)}
                              sx={{ alignSelf: "flex-start" }}
                            >
                              {t("settings.rolesAccess.switch", {
                                role: roleLabel.toLowerCase(),
                              })}
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {t("settings.rolesAccess.notAssigned")}
                            </Typography>
                          )}
                        </Stack>
                      </SectionCard>
                    </Grid>
                  );
                })}
              </Grid>

              <SectionCard
                title={t("settings.rolesAccess.effectiveTitle")}
                subtitle={t("settings.rolesAccess.effectiveSubtitle", {
                  permissions: grantedPermissions.length,
                  roles: actor.roles.length,
                })}
              >
                <Stack spacing={2}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.75}>
                    {grantedPermissions.map((permission) => (
                      <Chip
                        key={permission}
                        label={dynamicT(permissionKey(permission))}
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
                      {t("settings.rolesAccess.activeDashboard")}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {dynamicT(`dashboards.${actor.activeRole}`)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t("settings.rolesAccess.defaultNote")}
                  </Typography>
                </Stack>
              </SectionCard>
            </Stack>
          ) : null}

          {tab === securityTab ? (
            <Stack spacing={3}>
              <SecuritySettings
                hasPassword={hasPassword}
                twoFactorEnabled={actor.twoFactorEnabled}
              />
              {actor.roles.length === 1 && actor.roles[0] === "student" ? (
                <DeleteAccountCard email={actor.email} />
              ) : null}
            </Stack>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
