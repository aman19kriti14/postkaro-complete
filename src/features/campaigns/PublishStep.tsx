import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import type { CampaignFlow } from "./flowApi";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const slot = (date: string | null, time: string | null) =>
    date ? `${date.slice(8, 10)} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""} · ${time ?? ""}` : "—";

export function PublishStep({ flow }: { flow: CampaignFlow }) {
    const navigate = useNavigate();
    const scheduled = flow.posts
        .filter((p) => p.approved)
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    const leftAsDrafts = flow.posts.length - scheduled.length;

    const steps = [
        flow.autoPublish
            ? ["Posts go out at their slots", "You get a note in the morning if anything needs attention."]
            : ["You get a reminder at each slot", "Open the post and publish it by hand when you're ready."],
        ["Results collect on the campaign page", "Reach, engagement and clicks per post as they come in."],
        ["The studio learns from this run", "Formats that perform get suggested more often."],
    ];

    return (
        <>
            <h1 className="font-serif text-5xl text-black">Campaign is scheduled.</h1>
            <p className="mb-8 mt-4 max-w-3xl font-serif text-lg leading-relaxed text-neutral-600">
                Approved posts are on the calendar
                {flow.autoPublish ? " and will publish at their slots." : ". You'll be reminded at each slot."}
            </p>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Summary */}
                <section className="h-fit border border-[#C8102E] bg-[#C8102E]/[0.04] p-6 lg:p-8">
                    <div className="flex items-center gap-4 border-b border-[#C8102E]/20 pb-5">
                        <Check className="h-8 w-8 text-[#C8102E]" />
                        <h2 className="font-serif text-3xl text-black">Campaign is live</h2>
                    </div>

                    <ul className="divide-y divide-neutral-200">
                        {scheduled.map((p) => (
                            <li key={p.id} className="flex items-center gap-6 py-5">
                                <span className="w-24 shrink-0 font-serif text-[#C8102E]">{slot(p.date, p.time)}</span>
                                <span className="flex-1 font-serif text-xl text-black">{p.title || "Untitled post"}</span>
                                <span className="border border-[#C8102E] px-3 py-1 font-serif text-sm uppercase tracking-[0.15em] text-[#C8102E]">
                                    Scheduled
                                </span>
                            </li>
                        ))}
                    </ul>

                    <p className="border-t border-neutral-200 pt-5 font-serif text-lg leading-relaxed text-neutral-700">
                        {flow.autoPublish
                            ? "Postkaro will publish each post at its slot and collect results as they come in."
                            : "Postkaro will remind you at each slot so you can publish by hand."}{" "}
                        You can still edit or pull any post before it goes out.
                        {leftAsDrafts > 0 &&
                            ` ${leftAsDrafts} unapproved ${leftAsDrafts === 1 ? "post stays" : "posts stay"} in drafts.`}
                    </p>
                </section>

                {/* What happens next */}
                <aside className="h-fit border border-neutral-200 bg-white p-6 lg:p-8">
                    <h2 className="border-b border-neutral-200 pb-5 font-serif text-3xl text-black">What happens next</h2>
                    <ol className="mt-6 space-y-6">
                        {steps.map(([title, detail], i) => (
                            <li key={title} className="flex gap-5">
                                <span className="font-serif text-xl text-[#C8102E]">{String(i + 1).padStart(2, "0")}</span>
                                <div>
                                    <p className="font-serif text-xl text-black">{title}</p>
                                    <p className="mt-1 font-serif text-neutral-600">{detail}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-8 flex flex-wrap gap-3 border-t border-neutral-200 pt-6">
                        <button
                            type="button"
                            onClick={() => navigate("/calendar")}
                            className="border border-[#C8102E] px-6 py-3 font-serif text-lg text-[#C8102E] underline underline-offset-4 hover:bg-[#C8102E]/5"
                        >
                            Open calendar
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/campaigns/${flow.id}`)}
                            className="border border-neutral-300 px-6 py-3 font-serif text-lg text-black hover:border-black"
                        >
                            Open campaign
                        </button>
                    </div>
                </aside>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <p className="font-serif text-lg text-neutral-600">Campaign scheduled.</p>
                <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="border border-[#C8102E] bg-white px-8 py-3.5 font-serif text-xl text-[#C8102E] hover:bg-[#C8102E]/5"
                >
                    Back to dashboard
                </button>
            </div>
        </>
    );
}