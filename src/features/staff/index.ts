export { ExecutiveOverview as AdminOverview } from "@/features/admin";
export { ManagerOverview } from "@/features/staff/components/manager-overview";
export type {
  ManagerDashboardStat,
  ManagerHome,
  ManagerPendingItem,
  ManagerStudentsSummary,
  ManagerTeamRow,
  ManagerTodayClass,
} from "@/features/staff/types";
export { SwitchRoleButton } from "@/features/staff/components/switch-role-button";
export { TeacherOverview } from "@/features/staff/components/teacher-overview";
export type { TeacherOverviewClass, TeacherOverviewHome } from "@/features/staff/components/teacher-overview";
export {
  adminActivity,
  adminStats,
  countClassesToday,
  getTeacherByName,
  getTeacherClasses,
  localizedTeacherStudents,
  managerEscalations,
  managerStats,
  teacherFollowUps,
  teacherStudents,
} from "@/features/staff/data";
export type { TeacherStudent } from "@/features/staff/data";
