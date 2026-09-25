import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { env } from "@/config/env";
import type { ApiError, ApiResponse } from "@/types/api";
import type { AuthTokens } from "@/types/auth";

const api = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "pk_access_token";
const REFRESH_KEY = "pk_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set(tokens: AuthTokens) {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// Auth endpoints — never run the refresh interceptor on these
const AUTH_PATHS = ["/v1/auth/signup", "/v1/auth/signin", "/v1/auth/refresh"];

function isAuthRequest(config: InternalAxiosRequestConfig): boolean {
  return AUTH_PATHS.some((path) => config.url?.includes(path));
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Refresh on 401.
 *
 * Registered on BOTH the `api` instance and the global axios default, because
 * most feature APIs call plain axios with their own headers().
 * One refresh runs at a time; every request that hit 401 meanwhile waits for it
 * and is retried with the new token.
 */
let refreshInFlight: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const usedRefresh = tokenStore.getRefresh();
  if (!usedRefresh) return Promise.reject(new Error("No refresh token"));

  refreshInFlight = axios
    .post<ApiResponse<{ tokens?: AuthTokens } & Partial<AuthTokens>>>(
      `${env.API_BASE_URL}/v1/auth/refresh`,
      { refreshToken: usedRefresh }
    )
    .then(({ data }) => {
      // Backend returns { user, tokens: {...} }, same as signin
      const tokens = (data.data?.tokens ?? data.data) as AuthTokens;
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error("Refresh response had no tokens");
      }
      tokenStore.set(tokens);
      return tokens.accessToken;
    })
    .catch((err) => {
      // Another tab may have refreshed first (our token got rotated out):
      // if storage now holds a different refresh token, use its access token
      const current = tokenStore.getRefresh();
      const access = tokenStore.getAccess();
      if (current && current !== usedRefresh && access) return access;
      throw err;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

function sendToSignin() {
  tokenStore.clear();
  if (!window.location.pathname.startsWith("/signin")) {
    const back = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/signin?next=${back}`;
  }
}

function attachRefresh(instance: AxiosInstance) {
  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (error: AxiosError<ApiError>) => {
      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

      // Not a 401, already retried, or an auth call itself: let it through
      if (!original || error.response?.status !== 401 || original._retry || isAuthRequest(original)) {
        return Promise.reject(error);
      }
      original._retry = true;

      try {
        const token = await refreshAccessToken();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        // Retry through the same client so its own interceptors still apply
        return instance(original);
      } catch {
        sendToSignin();
        return Promise.reject(error);
      }
    }
  );
}

attachRefresh(api);
attachRefresh(axios);

/**
 * 402 handling. The backend returns 402 with data.code = TRIAL_EXPIRED or
 * INSUFFICIENT_CREDITS. We broadcast an event instead of importing the store,
 * which would create an import cycle.
 *
 * Registered on BOTH the `api` instance and the global axios default, because
 * feature APIs call plain axios with explicit headers.
 */
function handlePaymentRequired(error: AxiosError<any>) {
  if (error.response?.status !== 402) return;

  const code = error.response?.data?.data?.code;
  const message =
    error.response?.data?.message ?? "Your free trial has ended.";

  if (code === "TRIAL_EXPIRED") {
    window.dispatchEvent(new CustomEvent("pk:trial-expired", { detail: { message } }));
  } else {
    // Out of credits: balance changed or they need a top-up
    window.dispatchEvent(
      new CustomEvent("pk:credits-changed", {
        detail: {
          message,
          required: error.response?.data?.data?.required,
          available: error.response?.data?.data?.available,
        },
      })
    );
  }
}

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<any>) => {
    handlePaymentRequired(error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (res) => res,
  (error: AxiosError<any>) => {
    handlePaymentRequired(error);
    return Promise.reject(error);
  }
);

export default api;