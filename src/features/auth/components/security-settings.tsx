"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  disableTwoFactorWithCodeAction,
  regenerateBackupCodesWithCodeAction,
  setInitialPasswordAction,
} from "@/features/auth/actions";
import { authClient } from "@/features/auth/auth-client";
import { useErrorText } from "@/features/auth/components/use-error-text";
import { codeErrorCode, passwordErrorCode } from "@/lib/auth-validation";

type Feedback = { tone: "success" | "error"; text: string } | null;

function FeedbackAlert({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return <Alert severity={feedback.tone}>{feedback.text}</Alert>;
}

/* ------------------------------------------------------------------ */
/* Password                                                            */
/* ------------------------------------------------------------------ */

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations("security.password");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    const error = passwordErrorCode(next) ?? (next !== confirm ? "PASSWORDS_DONT_MATCH" : null);
    if (error) return setFeedback({ tone: "error", text: errorText(error) });

    startTransition(async () => {
      if (hasPassword) {
        const { error: changeError } = await authClient.changePassword({
          currentPassword: current,
          newPassword: next,
          revokeOtherSessions: signOutOthers,
        });
        if (changeError) {
          setFeedback({ tone: "error", text: errorText(changeError) });
          return;
        }
        setFeedback({ tone: "success", text: t("changed") });
      } else {
        const result = await setInitialPasswordAction({ password: next });
        setFeedback({
          tone: result.ok ? "success" : "error",
          text: result.ok ? t("created") : errorText(result.code),
        });
        if (!result.ok) return;
        router.refresh();
      }
      setCurrent("");
      setNext("");
      setConfirm("");
    });
  };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Typography variant="h6">{hasPassword ? t("changeTitle") : t("createTitle")}</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {hasPassword ? t("changeHelp") : t("createHelp")}
      </Typography>
      <Stack spacing={2} maxWidth={420}>
        {hasPassword ? (
          <TextField
            label={t("current")}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            disabled={pending}
            size="small"
          />
        ) : null}
        <TextField
          label={t("new")}
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          disabled={pending}
          size="small"
        />
        <TextField
          label={t("confirm")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          disabled={pending}
          size="small"
        />
        {hasPassword ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={signOutOthers}
                onChange={(event) => setSignOutOthers(event.target.checked)}
                disabled={pending}
              />
            }
            label={t("signOutOthers")}
          />
        ) : null}
        <FeedbackAlert feedback={feedback} />
        <Box>
          <Button type="submit" variant="contained" disabled={pending}>
            {hasPassword ? t("changeSubmit") : t("createSubmit")}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Two-factor                                                          */
/* ------------------------------------------------------------------ */

type Enrollment = { totpURI: string; backupCodes: string[] };

function secretFromUri(uri: string) {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("security.twoFactor");
  return (
    <Box>
      <Typography variant="subtitle2" mb={1}>
        {t("backupTitle")}
      </Typography>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 2,
          listStyle: "none",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1,
          bgcolor: "grey.100",
          borderRadius: 1,
          fontFamily: "monospace",
        }}
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </Box>
    </Box>
  );
}

function TwoFactorSection({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const t = useTranslations("security.twoFactor");
  const tp = useTranslations("security.password");
  const tc = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Accounts without a password manage 2FA with their session alone.
  const passwordBody = hasPassword ? { password } : {};

  const start = () => {
    setFeedback(null);
    if (hasPassword && !password) {
      setFeedback({ tone: "error", text: t("needPassword") });
      return;
    }
    startTransition(async () => {
      const { data, error } = await authClient.twoFactor.enable({
        ...(passwordBody as { password: string }),
        method: "totp",
      });
      if (error || !data || !("totpURI" in data)) {
        setFeedback({ tone: "error", text: errorText(error) });
        return;
      }
      setEnrollment({ totpURI: data.totpURI, backupCodes: data.backupCodes });
      setPassword("");
    });
  };

  const confirm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const codeError = codeErrorCode(code);
    if (codeError) return setFeedback({ tone: "error", text: errorText(codeError) });

    startTransition(async () => {
      const { error } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (error) {
        setFeedback({ tone: "error", text: errorText(error.code ? error : "INVALID_CODE") });
        return;
      }
      setEnrollment(null);
      setCode("");
      setFeedback({ tone: "success", text: t("enabled") });
      router.refresh();
    });
  };

  const disable = () => {
    setFeedback(null);
    if (hasPassword && !password) {
      setFeedback({ tone: "error", text: t("needPassword") });
      return;
    }
    if (!hasPassword && !code.trim()) {
      setFeedback({ tone: "error", text: t("needCode") });
      return;
    }
    startTransition(async () => {
      if (hasPassword) {
        const { error } = await authClient.twoFactor.disable({ password });
        if (error) {
          setFeedback({ tone: "error", text: errorText(error) });
          return;
        }
      } else {
        const result = await disableTwoFactorWithCodeAction({ code });
        if (!result.ok) {
          setFeedback({ tone: "error", text: errorText(result.code) });
          return;
        }
        setCode("");
      }
      setPassword("");
      setNewBackupCodes(null);
      setFeedback({ tone: "success", text: t("disabled") });
      router.refresh();
    });
  };

  const regenerate = () => {
    setFeedback(null);
    if (hasPassword && !password) {
      setFeedback({ tone: "error", text: t("needPassword") });
      return;
    }
    if (!hasPassword && !code.trim()) {
      setFeedback({ tone: "error", text: t("needCode") });
      return;
    }
    startTransition(async () => {
      if (hasPassword) {
        const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
        if (error || !data) {
          setFeedback({ tone: "error", text: errorText(error) });
          return;
        }
        setPassword("");
        setNewBackupCodes(data.backupCodes);
        return;
      }
      const result = await regenerateBackupCodesWithCodeAction({ code });
      if (!result.ok || !result.backupCodes) {
        setFeedback({ tone: "error", text: errorText(result.code) });
        return;
      }
      setCode("");
      setNewBackupCodes(result.backupCodes);
    });
  };

  const confirmCodeField = !hasPassword ? (
    <TextField
      label={t("codeLabel")}
      value={code}
      onChange={(event) => setCode(event.target.value)}
      inputProps={{ inputMode: "numeric", maxLength: 6, autoComplete: "one-time-code" }}
      disabled={pending}
      size="small"
      helperText={t("codeHelp")}
    />
  ) : null;

  const passwordField = hasPassword ? (
    <TextField
      label={tp("current")}
      type="password"
      autoComplete="current-password"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      disabled={pending}
      size="small"
    />
  ) : null;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6">{t("title")}</Typography>
        <Chip
          size="small"
          color={enabled ? "success" : "default"}
          label={enabled ? t("on") : t("off")}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t("help")}
      </Typography>

      <Stack spacing={2} maxWidth={460}>
        {enrollment ? (
          <Box component="form" onSubmit={confirm} noValidate>
            <Stack spacing={2}>
              <Typography variant="body2">{t("scan")}</Typography>
              <Box sx={{ bgcolor: "#fff", p: 2, width: "fit-content", borderRadius: 1 }}>
                <QRCode value={enrollment.totpURI} size={168} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {t("manualKey", { key: secretFromUri(enrollment.totpURI) })}
              </Typography>
              <BackupCodes codes={enrollment.backupCodes} />
              <Typography variant="body2">{t("enterCode")}</Typography>
              <TextField
                label={t("codeLabel")}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputProps={{ inputMode: "numeric", maxLength: 6, autoComplete: "one-time-code" }}
                disabled={pending}
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" disabled={pending}>
                  {t("turnOn")}
                </Button>
                <Button
                  variant="text"
                  disabled={pending}
                  onClick={() => {
                    setEnrollment(null);
                    setCode("");
                  }}
                >
                  {tc("cancel")}
                </Button>
              </Stack>
            </Stack>
          </Box>
        ) : enabled ? (
          <>
            {passwordField}
            {confirmCodeField}
            {newBackupCodes ? <BackupCodes codes={newBackupCodes} /> : null}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" disabled={pending} onClick={regenerate}>
                {t("newBackupCodes")}
              </Button>
              <Button variant="outlined" color="error" disabled={pending} onClick={disable}>
                {t("turnOff")}
              </Button>
            </Stack>
          </>
        ) : (
          <>
            {passwordField}
            <Box>
              <Button variant="contained" disabled={pending} onClick={start}>
                {t("setup")}
              </Button>
            </Box>
          </>
        )}
        <FeedbackAlert feedback={feedback} />
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

type DeviceSession = {
  id: string;
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function describeDevice(userAgent: string | null | undefined, unknown: string) {
  if (!userAgent) return unknown;
  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : /Safari\//.test(userAgent) ? "Safari"
    : "Browser";
  const os =
    /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad/.test(userAgent) ? "iOS"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS X/.test(userAgent) ? "macOS"
    : /Linux/.test(userAgent) ? "Linux"
    : "";
  return os ? `${browser} on ${os}` : browser;
}

function SessionsSection() {
  const t = useTranslations("security.sessions");
  const errorText = useErrorText();
  const [pending, startTransition] = useTransition();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((key) => key + 1);

  const showLoadError = useEffectEvent((error: Parameters<typeof errorText>[0]) => {
    setFeedback({ tone: "error", text: errorText(error) });
  });

  useEffect(() => {
    let active = true;
    void Promise.all([authClient.listSessions(), authClient.getSession()]).then(
      ([list, current]) => {
        if (!active) return;
        if (list.error) {
          showLoadError(list.error);
          return;
        }
        setSessions((list.data ?? []) as DeviceSession[]);
        setCurrentToken(current.data?.session.token ?? null);
      },
    );
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const revoke = (token: string) => {
    setFeedback(null);
    startTransition(async () => {
      const { error } = await authClient.revokeSession({ token });
      if (error) {
        setFeedback({ tone: "error", text: errorText(error) });
        return;
      }
      reload();
    });
  };

  const revokeOthers = () => {
    setFeedback(null);
    startTransition(async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) {
        setFeedback({ tone: "error", text: errorText(error) });
        return;
      }
      setFeedback({ tone: "success", text: t("signedOutOthers") });
      reload();
    });
  };

  return (
    <Box>
      <Typography variant="h6">{t("title")}</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {t("help")}
      </Typography>
      <Stack spacing={1.5} maxWidth={560}>
        {sessions.map((session) => {
          const isCurrent = session.token === currentToken;
          return (
            <Stack
              key={session.id}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 2, py: 1.5 }}
            >
              <Box>
                <Typography variant="subtitle2">
                  {describeDevice(session.userAgent, t("unknownDevice"))}{" "}
                  {isCurrent ? <Chip size="small" color="primary" label={t("thisDevice")} /> : null}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {session.ipAddress ? `${session.ipAddress} · ` : ""}
                  {t("lastActive", { date: new Date(session.updatedAt).toLocaleString() })}
                </Typography>
              </Box>
              {isCurrent ? null : (
                <Button
                  size="small"
                  color="error"
                  disabled={pending}
                  onClick={() => revoke(session.token)}
                >
                  {t("signOut")}
                </Button>
              )}
            </Stack>
          );
        })}
        {sessions.length > 1 ? (
          <Box>
            <Button variant="outlined" disabled={pending} onClick={revokeOthers}>
              {t("signOutOthers")}
            </Button>
          </Box>
        ) : null}
        <FeedbackAlert feedback={feedback} />
      </Stack>
    </Box>
  );
}

/** Settings → Security: password, two-factor and signed-in devices. */
export function SecuritySettings({
  hasPassword,
  twoFactorEnabled,
}: {
  hasPassword: boolean;
  twoFactorEnabled: boolean;
}) {
  return (
    <Stack spacing={4}>
      <PasswordSection hasPassword={hasPassword} />
      <Divider />
      <TwoFactorSection enabled={twoFactorEnabled} hasPassword={hasPassword} />
      <Divider />
      <SessionsSection />
    </Stack>
  );
}
