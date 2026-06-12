"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, Users, Layers, Volume2, VolumeX } from "lucide-react";
import { useSignIn, useSignUp, useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import logo from "@/components/asset/logo.png";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();

  const finalizeSession = async (finalize: (params?: { navigate?: (ctx: { session: { currentTask?: unknown } | null; decorateUrl: (url: string) => string }) => void }) => Promise<{ error: unknown }>) => {
    const { error } = await finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) return;
        const url = decorateUrl("/dashboard");
        if (url.startsWith("http")) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
    return error;
  };
  
  const isSignInLoaded = !!signIn && signInFetchStatus !== "fetching";
  const isSignUpLoaded = !!signUp && signUpFetchStatus !== "fetching";
  
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pending, setPending] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationMode, setVerificationMode] = useState<"signup" | "client-trust" | null>(null);
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.volume = 0.35; // Set volume to 35% for a clear background volume level
      
      // Programmatically play to satisfy browser autoplay requirements
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay was prevented or video failed to play:", err);
      });
    }
  }, [isMuted]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);

    if (isSignUp) {
      if (!isSignUpLoaded) {
        toast.error("Clerk registration client is still loading. Please wait a moment.");
        setPending(false);
        return;
      }
      try {
        const { error } = await signUp.password({
          emailAddress: email,
          password: pwd,
        });
        if (error) {
          toast.error(error.message || "An error occurred during sign up.");
          return;
        }

        const { error: sendError } = await signUp.verifications.sendEmailCode();
        if (sendError) {
          toast.error(sendError.message || "Failed to send verification code.");
          return;
        }

        setVerificationMode("signup");
        setVerifying(true);
        toast.success("Verification code sent to your email!");
      } catch (err: unknown) {
        console.error("Sign up error:", err);
        const message = err instanceof Error ? err.message : "An error occurred during sign up.";
        toast.error(message);
      } finally {
        setPending(false);
      }
    } else {
      if (!isSignInLoaded) {
        toast.error("Clerk authentication client is still loading. Please wait a moment.");
        setPending(false);
        return;
      }
      try {
        const { error } = await signIn.password({
          emailAddress: email,
          password: pwd,
        });
        if (error) {
          const errMsg = error.message || "";
          if (errMsg.includes("already signed in") || errMsg.includes("session_already_active")) {
            toast.success("Already signed in. Welcome back!");
            router.push("/dashboard");
            return;
          }
          toast.error(errMsg || "An error occurred during sign in.");
          return;
        }

        if (signIn.status === "complete") {
          const finalizeError = await finalizeSession(signIn.finalize.bind(signIn));
          if (finalizeError) {
            toast.error(
              finalizeError instanceof Error ? finalizeError.message : "Failed to complete sign in.",
            );
            return;
          }
          toast.success("Welcome back!");
          router.push("/dashboard");
        } else if (signIn.status === "needs_client_trust") {
          const emailCodeFactor = signIn.supportedSecondFactors?.find(
            (factor) => factor.strategy === "email_code",
          );
          if (emailCodeFactor) {
            const { error: sendError } = await signIn.mfa.sendEmailCode();
            if (sendError) {
              toast.error(sendError.message || "Failed to send verification code.");
              return;
            }
            setVerificationMode("client-trust");
            setVerifying(true);
            toast.success("Verification code sent to your email!");
          } else {
            toast.info("Additional verification is required to complete sign in.");
          }
        } else if (signIn.status === "needs_second_factor") {
          toast.info("Multi-factor authentication is required. Please complete MFA to sign in.");
        } else {
          toast.info("Additional authentication steps are required to complete sign in.");
        }
      } catch (err: unknown) {
        console.error("Sign in error:", err);
        const errMsg = err instanceof Error ? err.message : "";
        if (errMsg.includes("already signed in") || errMsg.includes("session_already_active")) {
          toast.success("Already signed in. Welcome back!");
          router.push("/dashboard");
          return;
        }
        toast.error(errMsg || "An error occurred during sign in.");
      } finally {
        setPending(false);
      }
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      if (verificationMode === "client-trust") {
        if (!isSignInLoaded) return;
        const { error } = await signIn.mfa.verifyEmailCode({ code });
        if (error) {
          toast.error(error.message || "Invalid verification code.");
          return;
        }
        if (signIn.status === "complete") {
          const finalizeError = await finalizeSession(signIn.finalize.bind(signIn));
          if (finalizeError) {
            toast.error(
              finalizeError instanceof Error ? finalizeError.message : "Failed to complete sign in.",
            );
            return;
          }
          toast.success("Welcome back!");
          router.push("/dashboard");
        } else {
          toast.info("Additional authentication steps are required to complete sign in.");
        }
        return;
      }

      if (!isSignUpLoaded) return;
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) {
        toast.error(error.message || "Invalid verification code.");
        return;
      }
      if (signUp.status === "complete") {
        const finalizeError = await finalizeSession(signUp.finalize.bind(signUp));
        if (finalizeError) {
          toast.error(
            finalizeError instanceof Error ? finalizeError.message : "Failed to complete sign up.",
          );
          return;
        }

        try {
          const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name: email.split("@")[0] }),
          });
          if (!res.ok) console.warn("DB user creation responded with non-2xx code:", res.status);
        } catch (dbErr) {
          console.error("Error creating user profile in database:", dbErr);
        }

        toast.success("Account created successfully!");
        router.push("/dashboard");
      } else {
        toast.info("Verification incomplete. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Verification error:", err);
      const message = err instanceof Error ? err.message : "An error occurred during verification.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  const signInWithGoogle = async () => {
    const isReady = isSignUp ? isSignUpLoaded : isSignInLoaded;
    if (!isReady) return;
    try {
      const { error } = isSignUp
        ? await signUp.sso({
            strategy: "oauth_google",
            redirectUrl: "/dashboard",
            redirectCallbackUrl: "/sso-callback",
          })
        : await signIn.sso({
            strategy: "oauth_google",
            redirectUrl: "/dashboard",
            redirectCallbackUrl: "/sso-callback",
          });
      if (error) {
        toast.error(error.message || "An error occurred during Google authentication.");
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "An error occurred during Google authentication.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full grid lg:grid-cols-2 bg-transparent lg:overflow-hidden">
      {/* Left — luxury illustration */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-sidebar text-white">
        <video 
          ref={videoRef}
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none z-0"
        >
          <source src="/NexusFlow_Enterprise_Hero_Vide.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 opacity-[0.35] z-10" style={{
          backgroundImage:
            "radial-gradient(800px 400px at 20% 10%, rgba(198,124,78,0.35), transparent 60%), radial-gradient(700px 500px at 80% 90%, rgba(212,163,115,0.25), transparent 60%)",
        }} />
        <div className="absolute inset-0 opacity-[0.06] z-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }} />

        <div className="relative h-8 z-20" />

        <div className="relative flex items-center gap-2 text-xs text-white/40 z-20">
        </div>
      </div>

      {/* Right — login card */}
      <div className="relative flex items-center justify-center p-6 sm:p-12 lg:p-8 bg-transparent min-h-screen lg:h-full lg:min-h-0">
        {/* Minimized volume control button aligned properly in the right container */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
          }}
          className="absolute bottom-6 right-6 z-30 p-1.5 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 text-[10px] font-medium cursor-pointer"
          title={isMuted ? "Unmute video" : "Mute video"}
        >
          {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>

        <div className="custom-login-card">
          <div className="custom-logo-wrapper">
            <Image src={logo} className="h-24 w-auto object-contain mx-auto" alt="NexusFlow Logo" priority />
          </div>

          {verifying ? (
            <>
              <h1>Verify Email</h1>
              <p className="custom-subtitle">
                Enter the verification code sent to {email}
              </p>
              <form onSubmit={handleVerify}>
                <div className="custom-input-group">
                  <label>Verification Code</label>
                  <input 
                    type="text" 
                    placeholder="123456" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    autoComplete="one-time-code"
                    required
                  />
                </div>
                <button type="submit" disabled={pending} className="custom-login-btn disabled:opacity-70 mt-2">
                  {pending ? "Verifying..." : "Verify Code"}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setVerifying(false);
                    setVerificationMode(null);
                    setCode("");
                  }}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 cursor-pointer"
                >
                  {verificationMode === "client-trust" ? "Back to Sign In" : "Back to Sign Up"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1>{isSignUp ? "Create Account" : "Welcome Back"}</h1>
              <p className="custom-subtitle">
                {isSignUp ? "Sign up to begin using NexusFlow" : "Sign in to continue to NexusFlow"}
              </p>
              <form onSubmit={submit}>
                <div className="custom-input-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="custom-input-group">
                  <label>Password</label>
                  <div className="relative flex items-center">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••" 
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      required
                      className="!pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 w-9 h-9 flex items-center justify-center rounded-lg bg-[rgba(200,155,109,0.08)] border border-[rgba(200,155,109,0.15)] text-[#C89B6D] hover:bg-[rgba(200,155,109,0.15)] hover:border-[rgba(200,155,109,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(200,155,109,0.15)] transition-all duration-300 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
                          <path d="M2 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 22 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2 12Z" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth="1.8" />
                          <path d="M3 3L21 21" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5">
                          <path d="M2 12C4.5 7.5 8 5 12 5C16 5 19.5 7.5 22 12C19.5 16.5 16 19 12 19C8 19 4.5 16.5 2 12Z" stroke="currentColor" strokeWidth="1.8" />
                          <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {!isSignUp && (
                  <div className="custom-options">
                    <label className="custom-remember">
                      <input type="checkbox" defaultChecked className="size-4 rounded border-border accent-[color:var(--color-primary)]" />
                      <span>Remember me</span>
                    </label>
                    <a href="#">Forgot password?</a>
                  </div>
                )}

                <button type="submit" disabled={pending} className="custom-login-btn disabled:opacity-70 mt-4">
                  {pending ? (isSignUp ? "Signing Up..." : "Signing In...") : (isSignUp ? "Sign Up" : "Sign In")}
                </button>
                <div className="custom-divider">
                  <span>OR</span>
                </div>
                <button type="button" onClick={signInWithGoogle} className="custom-google-btn">
                  Continue with Google
                </button>
              </form>
              <p className="custom-footer-text">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline font-medium ml-1 cursor-pointer bg-transparent border-none p-0 inline"
                >
                  {isSignUp ? "Sign In" : "Create Account"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
