import { Logo } from "@/{api,components/{ui,guards},config,features/Logo";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";


interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignin = location.pathname === "/signin";

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-neutral-900 p-10 text-white">
        <Logo variant="dark" height={36} />

        <div className="space-y-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary-500">
            AI Content Studio
          </p>
          <h1 className="text-[2.5rem] leading-[1.1] font-[var(--font-display)] text-white">
            Plan, create and publish everything from one&nbsp;desk.
          </h1>

          <div className="w-16 h-px bg-neutral-700" />

          <div className="space-y-5 text-[15px] leading-relaxed text-neutral-300">
            <div className="flex gap-4">
              <span className="text-primary-500 font-semibold tabular-nums shrink-0">01</span>
              <span>Write posts, images and short videos with AI in your own voice.</span>
            </div>
            <div className="flex gap-4">
              <span className="text-primary-500 font-semibold tabular-nums shrink-0">02</span>
              <span>One calendar for Instagram, Facebook, LinkedIn, YouTube and X.</span>
            </div>
            <div className="flex gap-4">
              <span className="text-primary-500 font-semibold tabular-nums shrink-0">03</span>
              <span>See what worked and post more of it.</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-neutral-500">
          Trusted by creators and small businesses across India.
        </p>
      </div>

      {/* Right: Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-white">
        <div className="lg:hidden mb-8">
          <Logo variant="light" height={32} />
        </div>

        <div className="w-full max-w-[420px] space-y-6">
          <div className="flex border border-neutral-200 rounded-[var(--radius-md)] overflow-hidden">
            <button
              onClick={() => navigate("/signup")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer ${!isSignin
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-50 text-neutral-400 hover:text-neutral-600"
                }`}
            >
              Create account
            </button>
            <button
              onClick={() => navigate("/signin")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors cursor-pointer border-l border-neutral-200 ${isSignin
                  ? "bg-white text-neutral-900"
                  : "bg-neutral-50 text-neutral-400 hover:text-neutral-600"
                }`}
            >
              Sign in
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}