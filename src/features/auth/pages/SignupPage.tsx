import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthLayout } from "../components/AuthLayout";
import { signupSchema, type SignupFormData } from "../schemas/auth.schema";
import { useAuthStore } from "@/stores/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/{api,components/{ui,guards},config,features/Toast";


export function SignupPage() {
  const navigate = useNavigate();
  const { signup, isLoading, error, fieldErrors, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
  });

  useEffect(() => {
    if (fieldErrors.email) setFieldError("email", { message: fieldErrors.email });
    if (fieldErrors.fullName) setFieldError("name", { message: fieldErrors.fullName });
    if (fieldErrors.password) setFieldError("password", { message: fieldErrors.password });
  }, [fieldErrors, setFieldError]);

  const password = watch("password", "");
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const showPasswordHints = password.length > 0 && !errors.password?.message?.includes("required");

  async function onSubmit(data: SignupFormData) {
    try {
      await signup({ fullName: data.name, email: data.email, password: data.password });
      toast.success("Account created! Let's connect your social accounts.");
      navigate("/onboarding");
    } catch {
      // Error already in store
    }
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <h2 className="text-2xl font-medium text-neutral-900 font-[var(--font-display)]">
          Start posting smarter
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Free to try. Connect your channels in under two minutes.
        </p>
      </div>

      <div className="space-y-3">
        <button type="button" className="w-full flex items-center justify-center gap-2.5 h-11 px-4 rounded-[var(--radius-md)] border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        <button type="button" className="w-full flex items-center justify-center gap-2.5 h-11 px-4 rounded-[var(--radius-md)] border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="16" height="14" rx="2" />
            <path d="M2 5l8 6 8-6" />
          </svg>
          Continue with email link
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-neutral-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {error && !fieldErrors.email && (
        <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2" role="alert">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zM8 11a.75.75 0 100-1.5A.75.75 0 008 11z" />
          </svg>
          <div className="flex-1">
            <span>{error}</span>
            <button onClick={clearError} className="ml-2 underline text-red-600 hover:text-red-800 text-xs">Dismiss</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Name or brand" placeholder="Aarav Mehta" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <Input label="Email" type="email" placeholder="you@studio.in" autoComplete="email" error={errors.email?.message} {...register("email", { onChange: () => { if (fieldErrors.email) clearError(); } })} />
        <div>
          <Input label="Password" type="password" placeholder="At least 8 characters" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
          {showPasswordHints && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {[
                { key: "length", label: "8+ chars", met: passwordChecks.length },
                { key: "uppercase", label: "Uppercase", met: passwordChecks.uppercase },
                { key: "lowercase", label: "Lowercase", met: passwordChecks.lowercase },
                { key: "number", label: "Number", met: passwordChecks.number },
              ].map(({ key, label, met }) => (
                <span key={key} className={`text-xs flex items-center gap-1 ${met ? "text-green-600" : "text-neutral-400"}`}>
                  {met ? "✓" : "○"} {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" fullWidth size="lg" variant="outline" isLoading={isLoading}>
          {isLoading ? "Creating account…" : "Create my account"}
        </Button>
      </form>
    </AuthLayout>
  );
}