export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  connectedAccounts: ConnectedAccount[];
  createdAt: string;
}

export interface ConnectedAccount {
  id: string;
  platform: SocialPlatform;
  platformUserId: string;
  platformUsername: string;
  platformDisplayName: string;
  avatarUrl: string | null;
  accessTokenExpiresAt: string | null;
  connectedAt: string;
  isActive: boolean;
}

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "youtube"
  | "twitter"
  | "linkedin"
  | "pinterest"
  | "threads"
  | "bluesky"
  | "mastodon"
  | "whatsapp"
  | "google_business";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
