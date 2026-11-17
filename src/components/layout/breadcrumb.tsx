import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { IconCircle } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";

export type BreadcrumbItem = {
  title: string;
  to?: string;
};

type BreadcrumbProps = {
  title: string;
  subtitle?: string;
  items?: BreadcrumbItem[];
  image?: { src: string; width?: number; height?: number };
  children?: ReactNode;
};

export function Breadcrumb({
  title,
  subtitle,
  items,
  image,
  children,
}: BreadcrumbProps) {
  const rightSlot =
    children ??
    (image ? (
      <Image
        src={image.src}
        alt="Breadcrumb decoration"
        width={image.width ?? 165}
        height={image.height ?? 165}
        priority
      />
    ) : null);

  return (
    <Grid
      container
      sx={{
        backgroundColor: "primary.light",
        borderRadius: 1.75,
        p: "30px 25px 20px",
        mb: "30px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Grid size={{ xs: 12, sm: 6, lg: 8 }} mb={1}>
        <Typography variant="h4">{title}</Typography>

        {subtitle ? (
          <Typography
            color="text.secondary"
            variant="h6"
            fontWeight={400}
            mt={0.8}
            mb={0}
          >
            {subtitle}
          </Typography>
        ) : null}

        {items?.length ? (
          <Breadcrumbs
            separator={
              <IconCircle
                size={5}
                fill="#5A6A85"
                fillOpacity={0.6}
                style={{ margin: "0 5px" }}
              />
            }
            sx={{ alignItems: "center", mt: "10px" }}
            aria-label="breadcrumb"
          >
            {items.map((item) =>
              item.to ? (
                <Link key={item.title} href={item.to}>
                  <Typography color="text.secondary">{item.title}</Typography>
                </Link>
              ) : (
                <Typography key={item.title} color="text.primary">
                  {item.title}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        ) : null}
      </Grid>

      {rightSlot ? (
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            position: "absolute",
            top: "50%",
            right: "25px",
            transform: "translateY(-50%)",
          }}
        >
          {rightSlot}
        </Box>
      ) : null}
    </Grid>
  );
}
