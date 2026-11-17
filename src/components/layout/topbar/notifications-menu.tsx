"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconBellRinging, IconMail } from "@tabler/icons-react";
import { Scrollbar } from "@/components/custom-scroll/scrollbar";
import type { InboxNotificationItem } from "@/server/messages/mailbox";

type NotificationsMenuProps = {
  inboxItems: InboxNotificationItem[];
  unreadCount: number;
};

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );

export function NotificationsMenu({ inboxItems, unreadCount }: NotificationsMenuProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <IconButton
        size="large"
        color="inherit"
        aria-label="Notifications"
        aria-haspopup="true"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ color: open ? "primary.main" : "text.secondary" }}
      >
        <Badge badgeContent={unreadCount} color="primary" max={99} invisible={unreadCount === 0}>
          <IconBellRinging size={21} stroke={1.5} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        slotProps={{ paper: { sx: { width: 360 } } }}
      >
        <Stack
          direction="row"
          py={2}
          px={4}
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 ? (
            <Chip label={`${unreadCount} unread`} color="primary" size="small" />
          ) : null}
        </Stack>

        {!inboxItems.length ? (
          <Typography variant="body2" color="text.secondary" px={4} pb={3}>
            No messages yet. Academy mail appears here when someone contacts you or sends a notice.
          </Typography>
        ) : null}

        {inboxItems.length ? (
          <Scrollbar sx={{ height: 385 }}>
            {inboxItems.map((item) => (
              <MenuItem
                key={item.id}
                component={Link}
                href={`/apps/email?message=${encodeURIComponent(item.id)}`}
                onClick={handleClose}
                sx={{ py: 2, px: 4, alignItems: "flex-start" }}
              >
                <Stack direction="row" spacing={2} width="100%">
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: item.unread ? "primary.light" : "grey.100",
                      color: item.unread ? "primary.main" : "text.secondary",
                    }}
                  >
                    <IconMail size={22} />
                  </Avatar>
                  <Box minWidth={0} flexGrow={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                      <Typography
                        variant="subtitle2"
                        fontWeight={item.unread ? 700 : 600}
                        noWrap
                        sx={{ maxWidth: 180 }}
                      >
                        {item.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" flexShrink={0}>
                        {timeLabel(item.createdAt)}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {item.fromName}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      noWrap
                      sx={{ maxWidth: 260 }}
                    >
                      {item.excerpt}
                    </Typography>
                  </Box>
                </Stack>
              </MenuItem>
            ))}
          </Scrollbar>
        ) : null}

        <Box p={3} pb={1}>
          <Button component={Link} href="/apps/email" variant="outlined" color="primary" fullWidth onClick={handleClose}>
            Open Email
          </Button>
        </Box>
      </Menu>
    </Box>
  );
}