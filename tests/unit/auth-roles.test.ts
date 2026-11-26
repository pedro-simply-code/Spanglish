import { describe, expect, it } from "vitest";
import {
  canChangeRole,
  getActiveDashboard,
  getDashboardOptions,
  getPermissions,
  getPrimaryRole,
  hasAllPermissions,
  hasPermission,
  normalizeRoles,
} from "@/lib/auth-roles";

describe("normalizeRoles", () => {
  it("falls back to student when nothing valid is given", () => {
    expect(normalizeRoles([])).toEqual(["student"]);
    expect(normalizeRoles(["owner", ""])).toEqual(["student"]);
  });

  it("keeps a single role: the highest one", () => {
    expect(normalizeRoles(["student", "teacher"])).toEqual(["teacher"]);
    expect(normalizeRoles(["teacher", "manager"])).toEqual(["manager"]);
    expect(normalizeRoles(["student"])).toEqual(["student"]);
  });

  it("makes admin exclusive", () => {
    expect(normalizeRoles(["student", "admin"])).toEqual(["admin"]);
    expect(normalizeRoles(["admin", "manager", "teacher"])).toEqual(["admin"]);
  });
});

describe("permissions", () => {
  it("students book and join but do not manage", () => {
    expect(hasPermission(["student"], "classes:book")).toBe(true);
    expect(hasPermission(["student"], "materials:write")).toBe(false);
    expect(hasPermission(["student"], "payouts:prepare")).toBe(false);
  });

  it("teachers write materials but cannot moderate or approve teachers", () => {
    expect(hasAllPermissions(["teacher"], ["materials:write", "materials:share", "forms:grade"])).toBe(true);
    expect(hasPermission(["teacher"], "materials:moderate")).toBe(false);
    expect(hasPermission(["teacher"], "teachers:approve")).toBe(false);
  });

  it("managers prepare payouts but only the admin approves them", () => {
    expect(hasPermission(["manager"], "payouts:prepare")).toBe(true);
    expect(hasPermission(["manager"], "teachers:approve")).toBe(true);
    expect(hasPermission(["manager"], "materials:moderate")).toBe(true);
    expect(hasPermission(["manager"], "payouts:approve")).toBe(false);
    expect(hasPermission(["admin"], "payouts:approve")).toBe(true);
  });

  it("each role includes every permission of the roles below it (except practice with Luna)", () => {
    const student = new Set(getPermissions(["student"]).filter((permission) => permission !== "ai:practice"));
    const teacher = new Set(getPermissions(["teacher"]));
    const manager = new Set(getPermissions(["manager"]));
    const admin = new Set(getPermissions(["admin"]));
    for (const permission of student) expect(teacher.has(permission)).toBe(true);
    for (const permission of teacher) expect(manager.has(permission)).toBe(true);
    for (const permission of manager) expect(admin.has(permission)).toBe(true);
  });

  it("only students practice with Luna", () => {
    expect(getPermissions(["student"])).toContain("ai:practice");
    for (const role of ["teacher", "manager", "admin"] as const) {
      expect(getPermissions([role])).not.toContain("ai:practice");
    }
  });
});

describe("dashboards", () => {
  it("picks the highest role and honors a requested one the account has", () => {
    expect(getPrimaryRole(["student", "manager"])).toBe("manager");
    expect(getActiveDashboard(["teacher"]).path).toBe("/teacher");
    expect(getActiveDashboard(["teacher"], "admin").activeRole).toBe("teacher");
    expect(getActiveDashboard(["student", "teacher"], "student").path).toBe("/home");
  });

  it("only offers dashboards for roles the account has", () => {
    expect(getDashboardOptions(["manager"]).map((option) => option.role)).toEqual(["manager"]);
  });
});

describe("canChangeRole", () => {
  it("only admins change roles", () => {
    expect(canChangeRole(["manager"], ["student"], { role: "teacher", action: "grant" }).allowed).toBe(false);
    expect(canChangeRole(["admin"], ["student"], { role: "teacher", action: "grant" }).allowed).toBe(true);
  });

  it("never grants admin from the app and keeps the student default", () => {
    expect(canChangeRole(["admin"], ["manager"], { role: "admin", action: "grant" }).allowed).toBe(false);
    expect(canChangeRole(["admin"], ["student"], { role: "student", action: "revoke" }).allowed).toBe(false);
  });
});
