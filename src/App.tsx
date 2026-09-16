import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";
import { useAuthStore } from "@/stores/auth.store";
import { ToastContainer } from "./{api,components/{ui,guards},config,features/Toast";


export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  );
}