import { createBrowserRouter } from "react-router-dom";
import { AuthGuard, GuestGuard } from "@/components/guards/AuthGuard";
import { SignupPage } from "@/features/auth/pages/SignupPage";
import { SigninPage } from "@/features/auth/pages/SigninPage";
import { OnboardingPage } from "@/features/onboarding/pages/OnboardingPage";
import { ConnectAccountsPage } from "@/features/onboarding/pages/ConnectAccountsPage";
import { CreatePostPage } from "@/features/posts/pages/CreatePostPage";
import DraftsPage from "@/features/drafts/DraftsPage";
import CampaignsPage from "@/features/campaigns/CampaignsPage";
import CalendarPage from "@/features/Calendar/CalendarPage";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";

import CampaignDetailPage from "@/features/campaigns/CampaignDetailPage";
import StartCampaignPage from "@/features/campaigns/StartCampaignPage";
import CampaignBuilderPage from "@/features/campaigns/CampaignBuilderPage";
import { AiStudioPage } from "@/features/ai-studio/AiStudioPage";
import { AppLayout } from "@/{api,components/layout/AppLayout";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

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
      // Signup flow only — no sidebar by design
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/connect-accounts", element: <ConnectAccountsPage /> },

      // Everything else
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/calendar", element: <CalendarPage /> },
          { path: "/drafts", element: <DraftsPage /> },
          { path: "/create", element: <CreatePostPage /> },
          { path: "/campaigns", element: <CampaignsPage /> },
          { path: "/campaigns/new", element: <StartCampaignPage /> },
          { path: "/campaigns/start", element: <StartCampaignPage /> },
          { path: "/campaigns/:id", element: <CampaignDetailPage /> },
          { path: "/campaigns/:id/build", element: <CampaignBuilderPage /> },
          { path: "/ai-studio", element: <AiStudioPage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
          { path: "/settings", element: <SettingsPage /> },
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