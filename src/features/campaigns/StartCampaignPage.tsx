import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flowApi, flowError } from "./flowApi";

export default function StartCampaignPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const started = useRef(false); // React strict mode runs effects twice

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        flowApi
            .createDraft()
            .then((f) => navigate(`/campaigns/${f.id}/build`, { replace: true }))
            .catch((err) => setError(flowError(err, "Couldn't start a campaign")));
    }, [navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-100 font-serif text-neutral-600">
            {error ?? "Starting a new campaign…"}
        </div>
    );
}