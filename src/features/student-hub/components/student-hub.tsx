"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { Breadcrumb, HideBreadcrumb } from "@/components/layout/breadcrumb";

export type StudentHubTab = {
  value: string;
  label: string;
  href: string;
};

type StudentHubProps = {
  title: string;
  subtitle: string;
  tabs: StudentHubTab[];
  active: string;
  children: ReactNode;
};

/**
 * A student section with a friendly header and tabs (Mis clases, Estudiar,
 * Mi progreso, Mis créditos). The page inside keeps its content; its own
 * breadcrumb is hidden so there is a single header.
 */
export function StudentHub({ title, subtitle, tabs, active, children }: StudentHubProps) {
  return (
    <Box>
      <Breadcrumb title={title} subtitle={subtitle} />
      <Box sx={{ borderBottom: 1, borderColor: "divider", mt: -1 }}>
        <Tabs value={active} variant="scrollable" allowScrollButtonsMobile>
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              component={Link}
              href={tab.href}
              scroll={false}
              sx={{ fontWeight: 600, textTransform: "none", fontSize: 15 }}
            />
          ))}
        </Tabs>
      </Box>
      <HideBreadcrumb>{children}</HideBreadcrumb>
    </Box>
  );
}
