export { AuthButton } from "@/features/auth/components/auth-button";
export { AuthDivider } from "@/features/auth/components/auth-divider";
export { AuthField } from "@/features/auth/components/auth-field";
export { AuthLink } from "@/features/auth/components/auth-link";
export { AuthShell } from "@/features/auth/components/auth-shell";
export { GoogleButton } from "@/features/auth/components/google-button";
export { LoginForm } from "@/features/auth/components/login-form";
export { LoginResetNotice } from "@/features/auth/components/login-reset-notice";
export { LanguageSwitch } from "@/features/auth/components/language-switch";
export { ProfileSettings } from "@/features/auth/components/profile-settings";
export { ProfileCompletionCard } from "@/features/auth/components/profile-completion-card";
export type { ProfileCompletion } from "@/features/auth/components/profile-completion-card";
export type { EditableProfile } from "@/features/auth/components/profile-settings";
export { RecoverPasswordForm } from "@/features/auth/components/recover-password-form";
export { RegisterForm } from "@/features/auth/components/register-form";
export { OnboardingForm } from "@/features/auth/components/onboarding-form";
export { TwoFactorForm } from "@/features/auth/components/two-factor-form";
export { SecuritySettings } from "@/features/auth/components/security-settings";
export {
  completeOnboardingAction,
  setLocaleAction,
  updateProfileAction,
  disableTwoFactorWithCodeAction,
  regenerateBackupCodesWithCodeAction,
  getPasswordStatusAction,
  setInitialPasswordAction,
  signOutAction,
  switchDashboardAction,
  verifyPendingTwoFactorAction,
} from "@/features/auth/actions";
export {
  authDemo,
  demoAccounts,
  getCodeError,
  getEmailError,
  getNameError,
  getPasswordError,
  isValidEmail,
  normalizeEmail,
} from "@/features/auth/data";
export type { DemoAccount } from "@/features/auth/data";
export {
  canChangeRole,
  dashboardByRole,
  defaultRole,
  getActiveDashboard,
  getDashboardForRole,
  getDashboardOptions,
  getPermissions,
  getPrimaryRole,
  hasAllPermissions,
  hasAnyRole,
  hasPermission,
  hasRole,
  isRoleCode,
  normalizeRoles,
  permissions,
  roleCodes,
  roleDefinitions,
} from "@/features/auth/roles";
export type {
  DashboardDefinition,
  DashboardOption,
  Permission,
  RoleChange,
  RoleChangeDecision,
  RoleCode,
  RoleDefinition,
} from "@/features/auth/roles";
export type {
  AuthActionResult,
  AuthMethod,
  AuthSession,
} from "@/features/auth/types";
export { AdminTwoFactorNotice } from "@/features/auth/components/admin-two-factor-notice";
