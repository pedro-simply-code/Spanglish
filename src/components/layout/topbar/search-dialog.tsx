"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconSearch, IconX } from "@tabler/icons-react";
import { getNavSections } from "@/components/layout/nav-data";
import type { RoleCode } from "@/lib/auth-roles";

type SearchMenuProps = {
  activeRole: RoleCode;
};

export function SearchMenu({ activeRole }: SearchMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const searchItems = getNavSections(activeRole).flatMap((section) =>
    section.items.map((item) => ({ label: section.label, ...item })),
  );

  const query = search.trim().toLowerCase();
  const results = searchItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.href.toLowerCase().includes(query) ||
      item.label.toLowerCase().includes(query),
  );

  return (
    <>
      <IconButton
        aria-label="Search"
        color="inherit"
        onClick={() => setOpen(true)}
        sx={{ color: "text.secondary" }}
      >
        <IconSearch size={21} stroke={1.5} />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="search-dialog-title"
        PaperProps={{ sx: { position: "fixed", top: 30, m: 0 } }}
      >
        <DialogContent id="search-dialog-title">
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              autoFocus
              fullWidth
              placeholder="Search here"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              inputProps={{ "aria-label": "Search here" }}
              sx={{
                "& .MuiOutlinedInput-root": { height: 45 },
                "& .MuiOutlinedInput-input": { py: 0 },
              }}
            />
            <IconButton
              size="small"
              aria-label="Close search"
              onClick={() => setOpen(false)}
              sx={{ color: "text.secondary" }}
            >
              <IconX size={18} />
            </IconButton>
          </Stack>
        </DialogContent>
        <Divider />
        <Box p={2} sx={{ maxHeight: "60vh", overflow: "auto" }}>
          <Typography variant="h5" p={1}>
            Quick Page Links
          </Typography>
          <List component="nav">
            {results.map((item) => (
              <ListItemButton
                key={item.title}
                sx={{ py: 0.5, px: 1 }}
                href={item.href}
                component={Link}
                onClick={() => setOpen(false)}
              >
                <ListItemText
                  primary={item.title}
                  secondary={item.href !== "#" ? item.href : item.label}
                  sx={{ my: 0, py: 0.5 }}
                />
              </ListItemButton>
            ))}
            {results.length === 0 ? (
              <Typography variant="subtitle2" color="text.secondary" p={1}>
                No results found
              </Typography>
            ) : null}
          </List>
        </Box>
      </Dialog>
    </>
  );
}
