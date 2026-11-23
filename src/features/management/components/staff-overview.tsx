"use client";

import { useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
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
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";

export type StaffTeacherCard = {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  country: string;
  bookable: boolean;
  hasAvailability: boolean;
  classesTaught: number;
  ratingAverage: number;
  ratingCount: number;
  level: 1 | 2 | 3 | 4;
  levelName: string;
};

type LevelFilter = "" | (1 | 2 | 3 | 4);
type AvailabilityFilter = "" | "yes" | "no";
type BookableFilter = "" | "yes" | "no";

const teacherLevelNumbers = [1, 2, 3, 4] as const;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function StaffOverview({ teachers }: { teachers: StaffTeacherCard[] }) {
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>("");
  const [bookableFilter, setBookableFilter] = useState<BookableFilter>("");
  const [countryFilter, setCountryFilter] = useState("");
  const [listPage, setListPage] = useState(1);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const teacher of teachers) {
      if (teacher.country.trim()) set.add(teacher.country.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [teachers]);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    return teachers.filter((teacher) => {
      if (levelFilter && teacher.level !== levelFilter) return false;
      if (availabilityFilter === "yes" && !teacher.hasAvailability) return false;
      if (availabilityFilter === "no" && teacher.hasAvailability) return false;
      if (bookableFilter === "yes" && !teacher.bookable) return false;
      if (bookableFilter === "no" && teacher.bookable) return false;
      if (countryFilter && teacher.country !== countryFilter) return false;
      if (!query) return true;
      const haystack = [
        teacher.name,
        teacher.headline,
        teacher.country,
        t(`management.staff.level.${teacher.level}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [teachers, search, levelFilter, availabilityFilter, bookableFilter, countryFilter, t]);

  const pageRows = sliceForPage(filtered, listPage, DEFAULT_PAGE_SIZE);

  const resetPage = () => setListPage(1);

  return (
    <Box>
      <Breadcrumb
        title={t("management.staff.title")}
        subtitle={t("management.staff.subtitle")}
        items={[
          { title: t("management.breadcrumb.manager"), to: "/manager" },
          { title: t("management.staff.title") },
        ]}
      />

      <SectionCard
        title={t("management.staff.teachers")}
        subtitle={
          filtered.length === teachers.length
            ? t("management.staff.onRoster", { count: teachers.length })
            : t("management.staff.matchFilters", {
                shown: filtered.length,
                total: teachers.length,
              })
        }
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <TextField
            size="small"
            label={t("management.staff.filter.search")}
            placeholder={t("management.staff.filter.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: { md: 220 }, flex: { md: 1 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="staff-level-filter">{t("management.staff.filter.level")}</InputLabel>
            <Select
              labelId="staff-level-filter"
              label={t("management.staff.filter.level")}
              value={levelFilter === "" ? "" : String(levelFilter)}
              onChange={(event) => {
                const raw = event.target.value;
                setLevelFilter(raw === "" ? "" : (Number(raw) as 1 | 2 | 3 | 4));
                resetPage();
              }}
            >
              <MenuItem value="">{t("management.staff.filter.allLevels")}</MenuItem>
              {teacherLevelNumbers.map((level) => (
                <MenuItem key={level} value={String(level)}>
                  {t(`management.staff.level.${level}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="staff-availability-filter">{t("management.staff.filter.availability")}</InputLabel>
            <Select
              labelId="staff-availability-filter"
              label={t("management.staff.filter.availability")}
              value={availabilityFilter}
              onChange={(event) => {
                setAvailabilityFilter(event.target.value as AvailabilityFilter);
                resetPage();
              }}
            >
              <MenuItem value="">{t("management.staff.filter.any")}</MenuItem>
              <MenuItem value="yes">{t("management.staff.filter.hasWindows")}</MenuItem>
              <MenuItem value="no">{t("management.staff.filter.noWindows")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="staff-bookable-filter">{t("management.staff.filter.bookable")}</InputLabel>
            <Select
              labelId="staff-bookable-filter"
              label={t("management.staff.filter.bookable")}
              value={bookableFilter}
              onChange={(event) => {
                setBookableFilter(event.target.value as BookableFilter);
                resetPage();
              }}
            >
              <MenuItem value="">{t("management.staff.filter.any")}</MenuItem>
              <MenuItem value="yes">{t("management.staff.filter.bookable")}</MenuItem>
              <MenuItem value="no">{t("management.staff.filter.notBookable")}</MenuItem>
            </Select>
          </FormControl>
          {countryOptions.length ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="staff-country-filter">{t("management.staff.filter.country")}</InputLabel>
              <Select
                labelId="staff-country-filter"
                label={t("management.staff.filter.country")}
                value={countryFilter}
                onChange={(event) => {
                  setCountryFilter(event.target.value);
                  resetPage();
                }}
              >
                <MenuItem value="">{t("management.staff.filter.allCountries")}</MenuItem>
                {countryOptions.map((country) => (
                  <MenuItem key={country} value={country}>
                    {country}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
        </Stack>

        {!teachers.length ? (
          <Typography variant="body2" color="text.secondary">
            {t("management.staff.empty.none")}
          </Typography>
        ) : !filtered.length ? (
          <Typography variant="body2" color="text.secondary">
            {t("management.staff.empty.filtered")}
          </Typography>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("management.staff.detail.teacher")}</TableCell>
                    <TableCell>{t("management.staff.filter.level")}</TableCell>
                    <TableCell>{t("management.staff.filter.country")}</TableCell>
                    <TableCell>{t("management.staff.filter.availability")}</TableCell>
                    <TableCell>{t("management.staff.filter.bookable")}</TableCell>
                    <TableCell align="right">{t("management.staff.detail.classes")}</TableCell>
                    <TableCell>{t("management.staff.detail.rating")}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((teacher) => (
                    <TableRow key={teacher.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar src={teacher.image ?? undefined} alt={teacher.name} sx={{ width: 36, height: 36 }}>
                            {teacher.name.charAt(0)}
                          </Avatar>
                          <Box minWidth={0}>
                            <Typography variant="subtitle2" fontWeight={600} noWrap title={teacher.name}>
                              {teacher.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap title={teacher.headline}>
                              {teacher.headline || t("management.staff.detail.profileNotCompleted")}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={t(`management.staff.level.${teacher.level}`)}
                        />
                      </TableCell>
                      <TableCell>{teacher.country || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={teacher.hasAvailability ? "success" : "warning"}
                          label={teacher.hasAvailability
                            ? t("common.yes")
                            : t("common.no")}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={teacher.bookable ? "success" : "default"}
                          label={teacher.bookable
                            ? t("common.yes")
                            : t("common.no")}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {teacher.classesTaught}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {teacher.ratingCount
                            ? `${teacher.ratingAverage.toFixed(1)} ★ (${teacher.ratingCount})`
                            : "—"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <LinkButton href="/apps/calendar" size="small" variant="text">
                          {t("management.staff.schedule")}
                        </LinkButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <ListPagination page={listPage} total={filtered.length} onPageChange={setListPage} />
          </>
        )}
      </SectionCard>
    </Box>
  );
}