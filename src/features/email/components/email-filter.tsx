"use client";

import type { ComponentType } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { IconAlertCircle, IconMail, IconSend, IconStar, IconTrash } from "@tabler/icons-react";
import { Scrollbar } from "@/components/custom-scroll/scrollbar";
import { EmailCompose, type EmailComposeInitial } from "@/features/email/components/email-compose";
import type { EmailFilterId } from "@/features/email/types";

type FilterIcon = ComponentType<{ size?: number | string; stroke?: number | string }>;

type FilterEntry = {
  key: string;
  name?: EmailFilterId;
  filterbyTitle?: string;
  divider?: boolean;
  icon?: FilterIcon;
  color?: string;
};

const filterData: FilterEntry[] = [
  { key: "inbox", name: "inbox", icon: IconMail, color: "inherit" },
  { key: "sent", name: "sent", icon: IconSend, color: "inherit" },
  { key: "trash", name: "trash", icon: IconTrash, color: "inherit" },
  { key: "divider-1", divider: true },
  { key: "sort-by", filterbyTitle: "Sort By" },
  { key: "starred", name: "starred", icon: IconStar, color: "inherit" },
  { key: "important", name: "important", icon: IconAlertCircle, color: "inherit" },
];

type EmailFilterProps = {
  active: EmailFilterId;
  onFilterChange: (filter: EmailFilterId) => void;
  composeInitial?: EmailComposeInitial | null;
  composeOpen?: boolean;
  composeDraft?: EmailComposeInitial | null;
  onSend?: (input: { toEmail: string; subject: string; body: string }) => void;
  sendPending?: boolean;
};

export function EmailFilter({
  active,
  onFilterChange,
  composeInitial,
  composeOpen,
  composeDraft,
  onSend,
  sendPending,
}: EmailFilterProps) {
  return (
    <>
      <Box>
        <EmailCompose
          initial={composeInitial}
          openOnMount={composeOpen}
          draft={composeDraft}
          onSend={onSend}
          sendPending={sendPending}
        />
      </Box>

      <List>
        <Scrollbar
          sx={{ height: { lg: "calc(100vh - 100px)", md: "100vh" }, maxHeight: "800px" }}
        >
          {filterData.map((filter) => {
            if (filter.filterbyTitle) {
              return (
                <Typography
                  variant="subtitle2"
                  p={3}
                  pb={1}
                  pl={5.5}
                  fontWeight={600}
                  key={filter.key}
                >
                  {filter.filterbyTitle}
                </Typography>
              );
            }

            if (filter.divider) {
              return <Divider key={filter.key} />;
            }

            const Icon = filter.icon;

            return (
              <ListItemButton
                sx={{
                  mb: 1,
                  px: "20px",
                  mx: 3,
                  borderRadius: 1,
                }}
                selected={active === filter.name}
                onClick={() => filter.name && onFilterChange(filter.name)}
                key={filter.key}
              >
                <ListItemIcon sx={{ minWidth: "30px", color: filter.color }}>
                  {Icon ? <Icon stroke={1.5} size={19} /> : null}
                </ListItemIcon>
                <ListItemText sx={{ textTransform: "capitalize" }}>
                  {filter.name}
                </ListItemText>
              </ListItemButton>
            );
          })}
        </Scrollbar>
      </List>
    </>
  );
}