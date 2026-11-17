"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@mui/material/Button";
import type { RoleCode } from "@/lib/auth-roles";

const toolbarApps = [
  { title: "Calendar", href: "/apps/calendar" },
  { title: "Email", href: "/apps/email" },
] as const;

export function Navigation({ activeRole }: { activeRole: RoleCode }) {
  const pathname = usePathname();

  return (
    <>
      {toolbarApps
        .filter((item) =>
          activeRole === "admin" || activeRole === "manager"
            ? item.href === "/apps/email"
            : true,
        )
        .map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.title}
              color="inherit"
              variant="text"
              component={Link}
              href={item.href}
              aria-current={active ? "page" : undefined}
              sx={
                active
                  ? {
                      bgcolor: "primary.main",
                      color: "#fff",
                      "&:hover": {
                        bgcolor: "primary.main",
                        color: "#fff",
                      },
                    }
                  : { color: "text.secondary" }
              }
            >
              {item.title}
            </Button>
          );
        })}
    </>
  );
}