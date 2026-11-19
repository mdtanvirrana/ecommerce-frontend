"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import QRCode from "qrcode";
import { Copy, KeyRound, RefreshCw, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import {
  changePasswordSchema,
  profileSchema,
  twoFactorConfirmSchema,
  twoFactorPasswordSchema,
} from "@/schemas";
import { adminAuthApi } from "@/services/api";
import { useAdminAuth } from "@/providers/AdminAuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyApiErrorsToForm, getApiErrorMessage } from "@/lib/formErrors";
import type { z } from "zod";

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof changePasswordSchema>;
type TwoFactorConfirmValues = z.infer<typeof twoFactorConfirmSchema>;
type TwoFactorPasswordValues = z.infer<typeof twoFactorPasswordSchema>;

export default function AdminProfilePage() {
  const { staff, refreshStaff } = useAdminAuth();

  const [settingUp2FA, setSettingUp2FA] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupQrDataUrl, setSetupQrDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [passwordModalMode, setPasswordModalMode] = useState<"disable" | "regenerate" | null>(
    null,
  );

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(changePasswordSchema) });
  const confirm2FAForm = useForm<TwoFactorConfirmValues>({
    resolver: zodResolver(twoFactorConfirmSchema),
    defaultValues: { code: "" },
  });
  const modalPasswordForm = useForm<TwoFactorPasswordValues>({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (staff) {
      profileForm.reset({
        name: staff.name,
        email: staff.email,
        phone: staff.phone ?? "",
      });
    }
  }, [staff, profileForm]);

  const onUpdateProfile = async (values: ProfileValues) => {
    try {
      await adminAuthApi.updateProfile(values);
      await refreshStaff();
      toast.success("Staff profile updated.");
    } catch (err) {
      applyApiErrorsToForm(err, profileForm.setError, ["name", "email", "phone"]);
      toast.error(getApiErrorMessage(err, "Failed to update profile."));
    }
  };

  const onUpdatePassword = async (values: PasswordValues) => {
    try {
      await adminAuthApi.updatePassword(values);
      passwordForm.reset();
      toast.success("Password changed successfully.");
    } catch (err) {
      applyApiErrorsToForm(err, passwordForm.setError, [
        "current_password",
        "password",
        "password_confirmation",
      ]);
      toast.error(getApiErrorMessage(err, "Failed to update password."));
    }
  };

  const handleStart2FASetup = async () => {
    setSettingUp2FA(true);
    setRecoveryCodes(null);
    try {
      const res = await adminAuthApi.setupTwoFactor();
      const qrDataUrl = await QRCode.toDataURL(res.data.otpauth_url, {
        width: 200,
        margin: 2,
        color: { dark: "#09090b", light: "#ffffff" },
      });
      setSetupSecret(res.data.secret);
      setSetupQrDataUrl(qrDataUrl);
      confirm2FAForm.reset({ code: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not start two-factor setup."));
    } finally {
      setSettingUp2FA(false);
    }
  };

  const onConfirm2FA = async (values: TwoFactorConfirmValues) => {
    try {
      const res = await adminAuthApi.confirmTwoFactor(values.code);
      setSetupSecret(null);
      setSetupQrDataUrl(null);
      setRecoveryCodes(res.data.recovery_codes);
      await refreshStaff();
      toast.success("Two-factor authentication enabled! Save your recovery codes.");
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, confirm2FAForm.setError, ["code"]);
      const msg = getApiErrorMessage(err, "Invalid authentication code.");
      if (!mapped) {
        confirm2FAForm.setError("code", { type: "server", message: msg });
      }
      toast.error(msg);
    }
  };

  const onSubmitPasswordAction = async (values: TwoFactorPasswordValues) => {
    try {
      if (passwordModalMode === "disable") {
        await adminAuthApi.disableTwoFactor(values.password);
        setRecoveryCodes(null);
        setSetupSecret(null);
        setSetupQrDataUrl(null);
        await refreshStaff();
        toast.success("Two-factor authentication disabled.");
      } else if (passwordModalMode === "regenerate") {
        const res = await adminAuthApi.regenerateRecoveryCodes(values.password);
        setRecoveryCodes(res.data.recovery_codes);
        toast.success("New recovery codes generated. Save them securely.");
      }
      modalPasswordForm.reset({ password: "" });
      setPasswordModalMode(null);
    } catch (err) {
      const mapped = applyApiErrorsToForm(err, modalPasswordForm.setError, ["password"]);
      const msg = getApiErrorMessage(err, "Password verification failed.");
      if (!mapped) {
        modalPasswordForm.setError("password", { type: "server", message: msg });
      }
      toast.error(msg);
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard.`);
    } catch {
      toast.error("Unable to copy to clipboard.");
    }
  };

  const is2FAEnabled = Boolean(staff?.two_factor_enabled);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Staff Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your staff details, password, and two-factor security settings.
        </p>
      </div>

      {/* Account Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Name, email, and contact number</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={profileForm.handleSubmit(onUpdateProfile)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staff-name">Full Name</Label>
                <Input
                  id="staff-name"
                  aria-invalid={Boolean(profileForm.formState.errors.name)}
                  {...profileForm.register("name")}
                />
                {profileForm.formState.errors.name && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-email">Email</Label>
                <Input
                  id="staff-email"
                  type="email"
                  aria-invalid={Boolean(profileForm.formState.errors.email)}
                  {...profileForm.register("email")}
                />
                {profileForm.formState.errors.email && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                aria-invalid={Boolean(profileForm.formState.errors.phone)}
                {...profileForm.register("phone")}
              />
              {profileForm.formState.errors.phone && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {profileForm.formState.errors.phone.message}
                </p>
              )}
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Requires a strong password (min 8 chars, upper, lower, number, symbol).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={passwordForm.handleSubmit(onUpdatePassword)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                aria-invalid={Boolean(passwordForm.formState.errors.current_password)}
                {...passwordForm.register("current_password")}
              />
              {passwordForm.formState.errors.current_password && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {passwordForm.formState.errors.current_password.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  aria-invalid={Boolean(passwordForm.formState.errors.password)}
                  {...passwordForm.register("password")}
                />
                {passwordForm.formState.errors.password && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  aria-invalid={Boolean(passwordForm.formState.errors.password_confirmation)}
                  {...passwordForm.register("password_confirmation")}
                />
                {passwordForm.formState.errors.password_confirmation && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    {passwordForm.formState.errors.password_confirmation.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication (TOTP) */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Two-Factor Authentication (TOTP)
            </CardTitle>
            <CardDescription className="mt-1">
              Protect your admin account with Google Authenticator, Authy, or 1Password.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              is2FAEnabled
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            {is2FAEnabled ? (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Enabled
              </span>
            ) : (
              "Not Enabled"
            )}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {!is2FAEnabled && !setupSecret && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Require a rotating 6-digit verification code whenever you sign in to the Admin
                Panel.
              </p>
              <Button onClick={handleStart2FASetup} disabled={settingUp2FA}>
                {settingUp2FA ? "Preparing..." : "Enable 2FA"}
              </Button>
            </div>
          )}

          {!is2FAEnabled && setupSecret && setupQrDataUrl && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <img
                  src={setupQrDataUrl}
                  alt="Scan this QR code in your authenticator app"
                  className="h-44 w-44 rounded-xl border border-border bg-white p-2"
                />
                <div className="flex-1 space-y-2.5 text-sm">
                  <p className="font-semibold">1. Scan the QR code</p>
                  <p className="text-xs text-muted-foreground">
                    Open Google Authenticator, Authy, or 1Password and scan this QR code, or enter
                    the manual secret key below:
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs break-all">
                    <span className="flex-1">{setupSecret}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy secret key"
                      onClick={() => copyText(setupSecret, "Secret key")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              <form
                noValidate
                onSubmit={confirm2FAForm.handleSubmit(onConfirm2FA)}
                className="space-y-3 border-t border-border pt-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-2fa-code">2. Enter 6-Digit Verification Code</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="confirm-2fa-code"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      className="font-mono tracking-widest sm:max-w-[180px]"
                      aria-invalid={Boolean(confirm2FAForm.formState.errors.code)}
                      {...confirm2FAForm.register("code")}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={confirm2FAForm.formState.isSubmitting}>
                        {confirm2FAForm.formState.isSubmitting ? "Confirming..." : "Confirm & Enable"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSetupSecret(null);
                          setSetupQrDataUrl(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                  {confirm2FAForm.formState.errors.code && (
                    <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                      {confirm2FAForm.formState.errors.code.message}
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}

          {recoveryCodes && recoveryCodes.length > 0 && (
            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Save Your Single-Use Recovery Codes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Store these codes safely. Each code can be used once if you lose access to your
                    authenticator app.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyText(recoveryCodes.join("\n"), "Recovery codes")}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy All
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {recoveryCodes.map((code) => (
                  <code
                    key={code}
                    className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-center font-mono text-xs font-semibold"
                  >
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}

          {is2FAEnabled && (
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  modalPasswordForm.reset({ password: "" });
                  setPasswordModalMode("regenerate");
                }}
              >
                <RefreshCw className="h-4 w-4" /> Regenerate Recovery Codes
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  modalPasswordForm.reset({ password: "" });
                  setPasswordModalMode("disable");
                }}
              >
                <ShieldOff className="h-4 w-4" /> Disable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Confirmation Modal for Disable / Regenerate */}
      <Dialog
        open={passwordModalMode !== null}
        onOpenChange={(open) => !open && setPasswordModalMode(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {passwordModalMode === "disable"
                ? "Disable Two-Factor Authentication"
                : "Regenerate Recovery Codes"}
            </DialogTitle>
            <DialogDescription>
              {passwordModalMode === "disable"
                ? "Enter your current password to remove TOTP protection from your staff account."
                : "Enter your current password to invalidate old recovery codes and generate 8 new ones."}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={modalPasswordForm.handleSubmit(onSubmitPasswordAction)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="modal-2fa-password">Current Password *</Label>
              <Input
                id="modal-2fa-password"
                type="password"
                aria-invalid={Boolean(modalPasswordForm.formState.errors.password)}
                {...modalPasswordForm.register("password")}
              />
              {modalPasswordForm.formState.errors.password && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {modalPasswordForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalMode(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={passwordModalMode === "disable" ? "destructive" : "default"}
                disabled={modalPasswordForm.formState.isSubmitting}
              >
                {modalPasswordForm.formState.isSubmitting
                  ? "Verifying..."
                  : passwordModalMode === "disable"
                    ? "Disable 2FA"
                    : "Regenerate Codes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
