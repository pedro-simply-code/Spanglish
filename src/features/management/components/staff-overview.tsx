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
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import { teacherLevels } from "@/lib/teacher-levels";

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

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function StaffOverview({ teachers }: { teachers: StaffTeacherCard[] }) {
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
      const haystack = [teacher.name, teacher.headline, teacher.country, teacher.levelName]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [teachers, search, levelFilter, availabilityFilter, bookableFilter, countryFilter]);

  const pageRows = sliceForPage(filtered, listPage, DEFAULT_PAGE_SIZE);

  const resetPage = () => setListPage(1);

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Staff"
        subtitle="Teachers on the academy roster — filter and review teaching load and booking readiness."
        items={[
          { title: "Manager", to: "/manager" },
          { title: "Staff" },
        ]}
      />

      <SectionCard
        title="Teachers"
        subtitle={
          filtered.length === teachers.length
            ? `${teachers.length} on roster`
            : `${filtered.length} of ${teachers.length} match filters`
        }
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <TextField
            size="small"
            label="Search"
            placeholder="Name, headline, country…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: { md: 220 }, flex: { md: 1 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="staff-level-filter">Level</InputLabel>
            <Select
              labelId="staff-level-filter"
              label="Level"
              value={levelFilter === "" ? "" : String(levelFilter)}
              onChange={(event) => {
                const raw = event.target.value;
                setLevelFilter(raw === "" ? "" : (Number(raw) as 1 | 2 | 3 | 4));
                resetPage();
              }}
            >
              <MenuItem value="">All levels</MenuItem>
              {teacherLevels.map((level) => (
                <MenuItem key={level.level} value={String(level.level)}>
                  {level.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="staff-availability-filter">Availability</InputLabel>
            <Select
              labelId="staff-availability-filter"
              label="Availability"
              value={availabilityFilter}
              onChange={(event) => {
                setAvailabilityFilter(event.target.value as AvailabilityFilter);
                resetPage();
              }}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="yes">Has windows</MenuItem>
              <MenuItem value="no">No windows</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="staff-bookable-filter">Bookable</InputLabel>
            <Select
              labelId="staff-bookable-filter"
              label="Bookable"
              value={bookableFilter}
              onChange={(event) => {
                setBookableFilter(event.target.value as BookableFilter);
                resetPage();
              }}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="yes">Bookable</MenuItem>
              <MenuItem value="no">Not bookable</MenuItem>
            </Select>
          </FormControl>
          {countryOptions.length ? (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="staff-country-filter">Country</InputLabel>
              <Select
                labelId="staff-country-filter"
                label="Country"
                value={countryFilter}
                onChange={(event) => {
                  setCountryFilter(event.target.value);
                  resetPage();
                }}
              >
                <MenuItem value="">All countries</MenuItem>
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
            No teachers on the roster yet. Approve applications or promote a verified student.
          </Typography>
        ) : !filtered.length ? (
          <Typography variant="body2" color="text.secondary">
            No teachers match the current filters.
          </Typography>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Teacher</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Availability</TableCell>
                    <TableCell>Bookable</TableCell>
                    <TableCell align="right">Classes</TableCell>
                    <TableCell>Rating</TableCell>
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
                              {teacher.headline || "Profile not completed"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={teacher.levelName} />
                      </TableCell>
                      <TableCell>{teacher.country || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={teacher.hasAvailability ? "success" : "warning"}
                          label={teacher.hasAvailability ? "Yes" : "No"}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={teacher.bookable ? "success" : "default"}
                          label={teacher.bookable ? "Yes" : "No"}
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
                          Schedule
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