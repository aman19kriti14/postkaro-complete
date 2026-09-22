import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

const unwrap = <T,>(body: any): T => (body && "data" in body && body.data !== undefined ? body.data : body);

// ---------- types (match BillingDtos.java) ----------

export type PlanCode = "TRIAL" | "STARTER" | "GROWTH" | "PRO" | "AGENCY";
export type SubStatus = "TRIALING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export interface PlanOption {
    code: Exclude<PlanCode, "TRIAL">;
    priceInr: number;
    monthlyCredits: number;
    accountLimit: number;
}

export interface BillingStatus {
    plan: PlanCode;
    status: SubStatus;
    active: boolean;
    trialEndsAt: string | null;
    currentPeriodEnd: string;
    daysLeft: number;
    monthlyCredits: number;
    topupCredits: number;
    totalCredits: number;
    usedThisPeriod: number;
    accountLimit: number;
    plans: PlanOption[];
    costs: Record<string, number>;
}

export interface CreditEntry {
    id: string;
    action: string;
    label: string;
    amount: number;
    balanceAfter: number;
    note: string | null;
    createdAt: string;
}

export interface UpgradeRequestView {
    id: string;
    kind: "PLAN" | "TOPUP";
    plan: string | null;
    credits: number;
    status: "PENDING" | "DONE" | "CANCELLED";
    createdAt: string;
}

// ---------- calls ----------

export async function fetchBillingStatus(): Promise<BillingStatus> {
    const { data } = await axios.get(`${BASE}/v1/billing/status`, { headers: headers() });
    return unwrap<BillingStatus>(data);
}

export async function fetchTransactions(page = 0, size = 20): Promise<CreditEntry[]> {
    const { data } = await axios.get(`${BASE}/v1/billing/transactions?page=${page}&size=${size}`, {
        headers: headers(),
    });
    return unwrap<CreditEntry[]>(data);
}

export async function fetchMyRequests(): Promise<UpgradeRequestView[]> {
    const { data } = await axios.get(`${BASE}/v1/billing/requests`, { headers: headers() });
    return unwrap<UpgradeRequestView[]>(data);
}

export async function requestPlan(plan: string, message?: string): Promise<UpgradeRequestView> {
    const { data } = await axios.post(
        `${BASE}/v1/billing/request-upgrade`,
        { plan, message: message ?? null },
        { headers: headers() }
    );
    return unwrap<UpgradeRequestView>(data);
}

export async function requestTopup(credits: number, message?: string): Promise<UpgradeRequestView> {
    const { data } = await axios.post(
        `${BASE}/v1/billing/request-upgrade`,
        { credits, message: message ?? null },
        { headers: headers() }
    );
    return unwrap<UpgradeRequestView>(data);
}