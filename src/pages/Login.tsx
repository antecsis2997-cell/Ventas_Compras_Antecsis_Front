import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

export default function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [puedeRecuperar, setPuedeRecuperar] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ??
    "/plataforma-sectores";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPuedeRecuperar(false);
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string }; status?: number } })
        ?.response;
      const msg =
        res?.data?.message ??
        (res?.status === 401 ? t("login.errorAuth") : t("login.errorGeneric"));
      setError(msg);
      if (username.trim()) {
        api
          .post<{ puedeRecuperar: boolean }>("/api/auth/puede-recuperar", {
            username: username.trim(),
          })
          .then((r) => setPuedeRecuperar(r.data?.puedeRecuperar ?? false))
          .catch(() => setPuedeRecuperar(false));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess(false);
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { correo: forgotEmail.trim() });
      setForgotSuccess(true);
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { message?: string } } })?.response;
      setForgotError(res?.data?.message ?? t("login.errorForgot"));
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgotModal = () => {
    setShowForgot(false);
    setForgotEmail("");
    setForgotSuccess(false);
    setForgotError("");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/30">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageToggle />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8 rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="flex flex-col items-center">
            <img src="/logo-antecsis.png" alt="ANTECSIS" className="h-36 w-auto" />
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="username"
                type="text"
                placeholder={t("login.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? t("login.submitting") : t("login.submit")}
            </Button>
            {error && puedeRecuperar && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground underline"
              >
                {t("login.forgotPassword")}
              </button>
            )}
          </form>
        </div>
      </div>

      <p className="shrink-0 py-4 text-center text-xs text-muted-foreground">
        {t("layout.footer", { year: new Date().getFullYear() })}
      </p>

      <Dialog open={showForgot} onOpenChange={(open) => !open && closeForgotModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("login.forgotTitle")}</DialogTitle>
          </DialogHeader>
          {forgotSuccess ? (
            <p className="text-sm text-muted-foreground">{t("login.forgotSuccess")}</p>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              {forgotError && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {forgotError}
                </div>
              )}
              <p className="text-sm text-muted-foreground">{t("login.forgotHint")}</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder={t("login.emailPlaceholder")}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeForgotModal}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={forgotLoading}>
                  {forgotLoading ? t("login.sending") : t("login.sendLink")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
