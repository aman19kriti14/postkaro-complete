import { createBrowserRouter } from "react-router-dom";
import { AuthGuard, GuestGuard } from "@/components/guards/AuthGuard";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { SigninPage } from "@/features/auth/pages/SigninPage";
import { OnboardingPage } from "@/features/onboarding/pages/OnboardingPage";
import { ConnectAccountsPage } from "@/features/onboarding/pages/ConnectAccountsPage";
import { CreatePostPage } from "@/features/posts/pages/CreatePostPage";
import DraftsPage from "@/features/drafts/DraftsPage";
import CampaignsPage from "@/features/campaigns/CampaignsPage";

import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { AppLayout } from "@/{api,components/layout/AppLayout";
import NewCampaignPage from "@/features/campaigns/NewCampaignPage";
import CampaignDetailPage from "@/features/campaigns/CampaignDetailPage";

export const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [
      { path: "/signup", element: <SignupPage /> },
      { path: "/signin", element: <SigninPage /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/connect-accounts", element: <ConnectAccountsPage /> },
      { path: "/create", element: <CreatePostPage /> },
      { path: "/create", element: <CreatePostPage /> },
      { path: "/campaigns/new", element: <NewCampaignPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/drafts", element: <DraftsPage /> },
          { path: "/campaigns", element: <CampaignsPage /> },

          { path: "/campaigns/:id", element: <CampaignDetailPage /> },

        ],
      },
    ],
  },
  {
    path: "/",
    element: <GuestGuard />,
    children: [{ index: true, element: <SignupPage /> }],
  },
  {
    path: "*",
    element: (
      <div className="min-h-screen flex items-center justify-center text-neutral-500">
        Page not found
      </div>
    ),
  },
]);