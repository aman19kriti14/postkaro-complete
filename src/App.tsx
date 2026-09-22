import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { useAuthStore } from "@/stores/auth.store";
import { ToastContainer, toast } from "./{api,components/{ui,guards},config,features/Toast";


export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Trial ended or out of credits — the axios interceptor fires these
  useEffect(() => {
    const onExpired = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.error(detail?.message ?? "Your free trial has ended.");
    };
    const onCredits = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) toast.error(detail.message);
    };

    window.addEventListener("pk:trial-expired", onExpired);
    window.addEventListener("pk:credits-changed", onCredits);
    return () => {
      window.removeEventListener("pk:trial-expired", onExpired);
      window.removeEventListener("pk:credits-changed", onCredits);
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}