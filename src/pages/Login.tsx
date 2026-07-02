import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui";
import { GoogleIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { friendlyAuthError } from "@/lib/errors";

export default function Login() {
  const { signIn, signInWithGoogle, configured } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to keep your streak going."
    >
      {!configured && (
        <p className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Firebase isn't configured — sign-in is disabled in this demo build.
        </p>
      )}
      <Button
        variant="ghost"
        className="w-full"
        onClick={google}
        disabled={!configured || loading}
      >
        <GoogleIcon /> Continue with Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-500">
        <div className="h-px flex-1 bg-white/10" />
        or with email
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={!configured}
        >
          Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        New to StudyMate?{" "}
        <Link to="/signup" className="font-medium text-brand-300 hover:text-brand-200">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
