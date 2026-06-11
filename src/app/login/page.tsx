"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { NexusFlowBrand } from "@/components/brand/NexusFlowBrand";

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pending, setPending] = useState(false);
  
  // MFA States
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, isAuthLoaded, router]);

  useEffect(() => {
    if (!isSignInLoaded) {
      const timer = setTimeout(() => {
        console.warn(
          "[NexusFlow Diagnostic] Clerk sign-in client is still not loaded after 5 seconds. " +
          "Please verify that https://gorgeous-eel-85.clerk.accounts.dev is accessible and not blocked by an adblocker or security policy."
        );
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSignInLoaded]);

  const finalizeSession = async (finalize: any) => {
    try {
      const { error } = await finalize({
        navigate: ({ decorateUrl }: any) => {
          const url = decorateUrl("/dashboard");
          if (url.startsWith("http")) {
            window.location.href = url;
            return;
          }
          router.push(url);
        },
      });
      return error;
    } catch (err: any) {
      return err;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !pwd) {
      toast.error("Please enter both email and password.");
      return;
    }

    setPending(true);

    if (!isSignInLoaded) {
      toast.error("Authentication is still loading. Please wait a moment.");
      setPending(false);
      return;
    }

    try {
      const result = await signIn.create({
        identifier: email,
        password: pwd,
      });

      if (result.status === "complete") {
        const finalizeErr = await finalizeSession((result as any).finalize.bind(signIn));
        if (finalizeErr) {
          toast.error(finalizeErr.message || "Failed to complete sign in.");
          return;
        }
        toast.success("Welcome back.");
        router.push("/dashboard");
      } else if (result.status === "needs_first_factor") {
        const factor = result.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        if (factor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: (factor as any).emailAddressId,
          });
          setVerifying(true);
          toast.success("Verification code sent to your email.");
        } else {
          toast.info("Additional verification steps are required.");
        }
      } else {
        toast.info("Additional authentication steps are required.");
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.longMessage || err.message || "";
      if (msg.includes("already signed in") || msg.includes("session_already_active")) {
        toast.success("Already signed in. Redirecting.");
        router.push("/dashboard");
        return;
      }
      toast.error(msg || "Invalid credentials. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (!code) {
      toast.error("Please enter the verification code.");
      return;
    }

    if (!signIn) {
      toast.error("Authentication client not initialized.");
      return;
    }

    setPending(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code,
      });

      if (result.status === "complete") {
        const finalizeErr = await finalizeSession((result as any).finalize.bind(signIn));
        if (finalizeErr) {
          toast.error(finalizeErr.message || "Failed to complete verification.");
          return;
        }
        toast.success("Verification complete.");
        router.push("/dashboard");
      } else {
        toast.info("Additional steps required.");
      }
    } catch (err: any) {
      toast.error(err.errors?.[0]?.longMessage || err.message || "Invalid verification code.");
    } finally {
      setPending(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!isSignInLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      toast.error(err.message || "Google auth initiation failed.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0B0D10] text-white px-4 py-12">
      {/* Background Layer */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(198,124,78,0.12),#0B0D10_70%)]" />
        <div className="absolute top-1/4 left-1/4 size-[500px] rounded-full bg-[#C67C4E]/5 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 size-[500px] rounded-full bg-[#D4A373]/5 blur-[120px] mix-blend-screen animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-[450px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <NexusFlowBrand className="gap-3" markClassName="h-12 w-12" showSubtitle={true} wordmarkClassName="space-y-1" />
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
            {verifying ? "Enter Verification Code" : "Sign in to workspace"}
          </h2>
          <p className="mt-2 text-sm text-[#9CA3AF]">
            {verifying ? "We sent a 6-digit code to your email." : "Enter your credentials to access your PMO dashboard."}
          </p>
        </div>

        {/* Auth Card */}
        <div className="overflow-hidden rounded-[32px] border border-[rgba(201,139,90,0.16)] bg-[#111111]/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
          {!verifying ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF]">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#78716C]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#78716C] focus:border-[#C67C4E] focus:outline-none focus:ring-1 focus:ring-[#C67C4E] transition-all text-sm"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF]">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#78716C]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-11 pr-11 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#78716C] focus:border-[#C67C4E] focus:outline-none focus:ring-1 focus:ring-[#C67C4E] transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={pending}
                className="relative w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#D4A373_0%,#C67C4E_100%)] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(198,124,78,0.25)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Sign In <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-semibold uppercase tracking-wider text-[#78716C]">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={signInWithGoogle}
                className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all text-sm font-medium text-white cursor-pointer"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Google SSO
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              {/* Code Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-[#9CA3AF]">
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#78716C]" />
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="123456"
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-[#78716C] focus:border-[#C67C4E] focus:outline-none focus:ring-1 focus:ring-[#C67C4E] transition-all text-sm tracking-[0.25em] font-semibold text-center"
                    maxLength={6}
                  />
                </div>
              </div>

              {/* Submit Code */}
              <button
                type="submit"
                disabled={pending}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#D4A373_0%,#C67C4E_100%)] text-white font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(198,124,78,0.25)] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Verify Code <ArrowRight className="size-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setVerifying(false)}
                className="w-full text-center text-xs text-[#9CA3AF] hover:text-white transition-colors"
              >
                Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
