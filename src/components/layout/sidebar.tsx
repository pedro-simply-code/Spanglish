"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { IconDots, IconPower } from "@tabler/icons-react";
import { SpanglishLogo } from "@/components/brand/spanglish-logo";
import { Scrollbar } from "@/components/custom-scroll/scrollbar";
import { getNavSections } from "@/components/layout/nav-data";
import { MINI_SIDEBAR_WIDTH, SIDEBAR_WIDTH } from "@/components/layout/layout-config";
import {
  dashboardByRole,
  roleDefinitions,
  signOutAction,
} from "@/features/auth";
import type { AuthSession } from "@/features/auth";

type SidebarProps = {
  actor: AuthSession;
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
};

type SidebarContentProps = {
  actor: AuthSession;
  compact: boolean;
  onNavigate?: () => void;
};

function SidebarContent({ actor, compact, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const homePath = dashboardByRole[actor.activeRole].path;
  const activeRoleLabel = roleDefinitions[actor.activeRole].name;
  const navSections = getNavSections(actor.activeRole);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: compact ? 0 : 3 }}>
        <Box
          sx={{
            height: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: compact ? "center" : "flex-start",
          }}
        >
          <SpanglishLogo
            href={homePath}
            size="md"
            iconOnly={compact}
            showWordmark={!compact}
          />
        </Box>
      </Box>

      <Scrollbar sx={{ flexGrow: 1, minHeight: 0 }}>
        <Box sx={{ px: compact ? 1.5 : 3, pb: 2 }}>
          <List disablePadding>
            {navSections.map((section) => (
              <Box component="li" key={section.label} sx={{ listStyle: "none" }}>
                {compact ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                    <IconDots size={14} />
                  </Box>
                ) : (
                  <Typography
                    component="p"
                    sx={{
                      mt: 3,
                      mb: 0.5,
                      px: 1.5,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "text.primary",
                      lineHeight: "26px",
                    }}
                  >
                    {section.label}
                  </Typography>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const href = item.href === "/home" ? homePath : item.href;
                  const selected = pathname === href;

                  return (
                    <ListItemButton
                      key={item.title}
                      component={Link}
                      href={href}
                      selected={selected}
                      onClick={onNavigate}
                      sx={{
                        minHeight: 45,
                        mb: "2px",
                        px: 2.5,
                        py: 1,
                        borderRadius: "7px",
                        justifyContent: compact ? "center" : "flex-start",
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: "primary.light",
                          color: "primary.main",
                        },
                        "&.Mui-selected": {
                          bgcolor: "primary.main",
                          color: "#fff",
                          "&:hover": {
                            bgcolor: "primary.main",
                            color: "#fff",
                          },
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: compact ? 0 : 36,
                          color: "inherit",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={20} stroke={1.5} />
                      </ListItemIcon>
                      {!compact ? (
                        <>
                          <Typography
                            component="span"
                            sx={{ flexGrow: 1, fontSize: 14, fontWeight: 500 }}
                          >
                            {item.title}
                          </Typography>
                          {item.chip ? (
                            <Chip
                              label={item.chip}
                              color={item.chipColor}
                              size="small"
                              sx={{ height: 20, fontSize: 11 }}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </ListItemButton>
                  );
                })}
              </Box>
            ))}
          </List>
        </Box>
      </Scrollbar>

      <Box
        sx={{
          m: compact ? 1.5 : 3,
          p: compact ? 1 : 2,
          bgcolor: "secondary.light",
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          gap: 2,
        }}
      >
        <Avatar
          src="/images/profile/user-1.jpg"
          alt={actor.name}
          sx={{ width: 40, height: 40 }}
        />
        {!compact ? (
          <>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {actor.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {activeRoleLabel} dashboard
              </Typography>
            </Box>
            <Box component="form" action={signOutAction} sx={{ ml: "auto" }}>
              <Tooltip title="Sign out" placement="top">
                <IconButton
                  type="submit"
                  size="small"
                  aria-label="Sign out"
                  sx={{ color: "primary.main" }}
                >
                  <IconPower size={20} />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

export function Sidebar({ actor, collapsed, mobileOpen, onClose }: SidebarProps) {
  const theme = useTheme();

  return (
    <>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", lg: "block" },
          width: collapsed ? MINI_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: collapsed ? MINI_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
            boxSizing: "border-box",
            bgcolor: "background.paper",
            borderRight: "1px solid",
            borderColor: "divider",
            overflowX: "hidden",
            transition: theme.transitions.create("width", {
              duration: theme.transitions.duration.shortest,
            }),
          },
        }}
      >
        <SidebarContent actor={actor} compact={collapsed} />
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: 0,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <SidebarContent actor={actor} compact={false} onNavigate={onClose} />
      </Drawer>
    </>
  );
}
