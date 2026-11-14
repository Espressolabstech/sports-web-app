import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import courtHero from "../../../assets/court-hero.jpg";
import { Button } from "../../../components/ui/button";
import { confirmTeamPayment, registerTeam } from "../../../api/adapters/team";
import { registrationCloses, type TeamEvent } from "../../../lib/team/teamEvent";
import { champion, enteredTeams, teamFee, teamLabel } from "../../../lib/team/teamTournament";
import { competitions, competitionData } from "../../../lib/team/teamCompetitions";
import { TeamMatchGrid } from "./TeamMatchGrid";
import TeamResults from "./TeamResults";
import { passKey, usePublicTeamEvent } from "./team-data";
import { TeamInput, TeamChipSelect, TeamShell, TeamTabs, muted, panel, primary } from "./team-ui";

/** Wall clock for "registration closes" checks, refreshed every 30 s. */
function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const blank = <div className="min-h-screen bg-[hsl(var(--event-ink))]" />;

export function TeamLanding({ event }: { event: TeamEvent }) {
  const navigate = useNavigate(); const data = event.teamTournament;
  const now = useNow();
  const closes = registrationCloses(event);
  const closed = data.started || event.phase !== "published" || now >= closes.getTime();
  const days = data.days ?? 1;
  const start = event.dateISO ? parseISO(event.dateISO) : null;
  const end = start ? addDays(start, days - 1) : null;
  const cohorts = data.cohorts ?? [];
  const teams = enteredTeams(data).length;
  const full = teams >= event.capacity;
  const accent = "text-[hsl(var(--event-accent))]";
  const go = () => navigate(`/events/${event.slug}/${closed ? "live" : "register"}`);
  const words = event.title.trim().split(/\s+/); const lastWord = words.pop();
  const info: [typeof CalendarDays, string, string, string][] = [
    [CalendarDays, "Dates", start ? (days > 1 && end ? `${format(start, "d")}–${format(end, "d MMM")}` : format(start, "d MMM yyyy")) : "TBA", `${event.time}–${event.endTime}`],
    [Users, "Entry", `₹${event.priceInr.toLocaleString("en-IN")}`, "Per team of two"],
    [MapPin, "Venue", event.venueName || "TBA", event.venueArea || "See you on court"],
  ];
  return <TeamShell title={event.title} back="/events">
    <section className="relative -mx-4 -mt-5 flex min-h-[62dvh] flex-col justify-end overflow-hidden bg-[hsl(var(--event-ink))] px-5 pb-7 pt-16">
      <img src={event.posterUrl || courtHero} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--event-ink)/0.3)] via-[hsl(var(--event-ink)/0.6)] to-[hsl(var(--event-ink))]" />
      <div className="relative">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]"><span className={`h-2 w-2 rounded-full ${closed ? "bg-[hsl(var(--event-on-ink-muted))]" : "bg-[hsl(var(--event-accent))]"}`} />{closed ? (data.started ? "Tournament live" : "Registration closed") : "Team registrations open"}<span className={muted}>/ {event.sport}</span></p>
        <h2 className="mt-5 break-words text-[44px] font-black uppercase leading-[0.92] tracking-tight">{words.join(" ")} {words.length > 0 && <br />}<span className={accent}>{lastWord}</span></h2>
        {cohorts.length > 0 && <div className="mt-5"><p className={`mb-2 text-[11px] uppercase tracking-[0.12em] ${muted}`}>Cohorts</p><div className="flex flex-wrap gap-2">{cohorts.map(c => <span key={c} className="flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--event-on-ink)/0.35)] px-3 text-xs font-bold uppercase tracking-wide"><Trophy className="h-3.5 w-3.5" />{c}</span>)}</div></div>}
        {start && <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-[hsl(var(--event-on-ink)/0.2)] bg-[hsl(var(--event-ink)/0.5)] px-4 py-3"><span className="text-4xl font-black leading-none">{format(start, "dd")}{days > 1 && end && <><span className={`mx-1 font-light ${accent}`}>/</span>{format(end, "dd")}</>}</span><span className="text-[11px] font-semibold uppercase tracking-[0.2em]">{format(start, "MMMM yyyy")}</span></div>}
        <Button className={`mt-6 h-14 w-full justify-between rounded-xl px-6 text-base font-bold ${primary}`} onClick={go}>{closed ? "View scores" : full ? "Registration full" : "Register your team"}<ArrowRight className="h-5 w-5" /></Button>
      </div>
    </section>
    <section className="grid grid-cols-2 gap-y-6 border-b border-[hsl(var(--event-on-ink)/0.12)] pb-6">{info.map(([Icon, label, value, sub], i) => <div key={label} className={`flex gap-2.5 ${i % 2 ? "border-l border-[hsl(var(--event-on-ink)/0.12)] pl-3" : "pr-2"}`}><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${accent}`} /><div className="min-w-0"><p className={`text-[10px] uppercase tracking-wider ${muted}`}>{label}</p><p className="mt-1 break-words text-[15px] font-bold leading-tight">{value}</p><p className={`mt-1 text-xs ${muted}`}>{sub}</p></div></div>)}</section>
    {event.description && <section className="pt-5"><h3 className={`mb-2 text-[11px] uppercase tracking-[0.12em] ${muted}`}>About</h3><p className="text-[15px] leading-relaxed text-[hsl(var(--event-on-ink)/0.85)]">{event.description}</p></section>}
  </TeamShell>;
}

export function TeamPlayerView({ event, updatedAt }: { event: TeamEvent; updatedAt: number }) {
  const [tab, setTab] = useState("matchups");
  const [selected, setSelected] = useState("");
  const root = event.teamTournament;
  const list = competitions(root), current = list.find(c => c.id === selected) ?? list[0];
  if (!current) return null;
  const data = competitionData(root, current);
  const winner = champion(data);
  const active = list.some(c => c.data.matches.some(m => m.state === "active"));
  return <TeamShell title={event.title} back={`/events/${event.slug}`}>
    <div className={`flex items-center justify-between gap-2 text-[11px] ${muted}`}>
      <span className="flex items-center gap-2 font-medium"><span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[hsl(var(--event-success))] motion-safe:animate-pulse" : "bg-[hsl(var(--event-quiet))]"}`} />{winner ? "Finished" : data.started ? "Live scores" : "Not started"}</span>
      <span className="tabular-nums">Updated {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
    {list.length > 1 && <div className="flex min-w-0 items-center gap-3"><span className={`shrink-0 text-xs ${muted}`}>Cohort</span><div className="min-w-0 flex-1"><TeamChipSelect compact value={current.id} onChange={setSelected} options={list.map(c => ({ value: c.id, label: c.levels.join(" / ") }))} /></div></div>}
    <TeamTabs<string> value={tab} onChange={setTab} tabs={[["matchups", "Matchups"], ["scoring", "Scoring"]]} />
    {winner && <div className="flex items-center gap-3 border-b border-[hsl(var(--event-success)/0.3)] pb-4"><Trophy className="h-6 w-6 shrink-0 text-[hsl(var(--event-success-text))]" /><div className="min-w-0"><p className={`text-xs ${muted}`}>Champions</p><p className="mt-1 break-words text-base font-semibold">{teamLabel(data.teams.find(t => t.id === winner))}</p></div></div>}
    {tab === "scoring" ? <TeamResults data={data} /> : <TeamMatchGrid key={current.id} data={data} root={root} courts={event.courts} showCourts readOnly onScore={() => {}} />}
  </TeamShell>;
}

/** Team sign-up: details → summary → Razorpay payment. The team only exists once the fee is paid. */
export function TeamRegistration({ event }: { event: TeamEvent }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow();
  const [name, setName] = useState("");
  const cohorts = event.teamTournament.cohorts ?? [];
  const [cohort, setCohort] = useState(cohorts.length === 1 ? cohorts[0] : "");
  const [members, setMembers] = useState([{ name: "", phone: "" }, { name: "", phone: "" }]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (index: number, key: "name" | "phone", value: string) => setMembers(m => m.map((p, i) => i === index ? { ...p, [key]: value } : p));
  const fee = teamFee(event.priceInr);
  const errorText = (e: unknown, fallback: string) => (e as { message?: string } | null)?.message || fallback;

  const details = () => {
    if (event.phase !== "published" || event.teamTournament.started || now >= registrationCloses(event).getTime()) throw new Error("Registration is closed.");
    if (cohorts.length > 1 && !cohort) throw new Error("Choose your skill cohort.");
    if (members.some(p => p.name.trim().length < 2 || !/^[0-9]{10}$/.test(p.phone))) throw new Error("Enter both players’ names and valid mobile numbers.");
    if (members[0].phone === members[1].phone) throw new Error("A player can register only once in this tournament.");
  };
  const done = async (teamId: string) => {
    localStorage.setItem(passKey(event.slug), teamId);
    await queryClient.invalidateQueries({ queryKey: ["public-team-event", event.slug] });
    navigate(`/events/${event.slug}/pass`, { replace: true });
  };
  const submit = async () => {
    if (busy) return;
    try {
      details();
      if (step === 0) { setError(""); setStep(1); return; }
      setBusy(true); setError("");
      const { data } = await registerTeam(event.slug, { cohort: cohort || undefined, name: name.trim(), players: members.map(p => ({ name: p.name.trim(), phone: p.phone })) });
      if (!data.pending || !data.razorpay) { if (data.teamId) await done(data.teamId); return; }
      const rzp = new window.Razorpay({
        key: data.razorpay.keyId, amount: data.razorpay.amount, currency: data.razorpay.currency, order_id: data.razorpay.orderId,
        name: event.title, description: `Team entry fee · ${event.sport}`,
        handler: async response => {
          setBusy(true);
          try {
            const paid = await confirmTeamPayment(event.slug, { razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature });
            await done(paid.data.teamId);
          } catch (e) { setError(errorText(e, "Payment verification failed. Please contact the host with your payment ID.")); } finally { setBusy(false); }
        },
        modal: { ondismiss: () => setBusy(false) },
        theme: { color: "#cff136" },
      });
      rzp.open();
    } catch (e) { setError(errorText(e, "Check your team details.")); setBusy(false); }
  };
  return <TeamShell title={step === 0 ? "Register your team" : "Confirm team entry"} back={step === 0 ? `/events/${event.slug}` : `/events/${event.slug}/register`}>
    {step === 0 ? <div className="space-y-5">{cohorts.length > 1 && <div><p className="text-[13px] font-medium">Skill cohort</p><div className="mt-2 grid grid-cols-3 gap-2">{cohorts.map(c => <Button key={c} type="button" variant={cohort === c ? "default" : "event"} className={`h-11 px-1 text-xs ${cohort === c ? primary : ""}`} onClick={() => setCohort(c)}>{c}</Button>)}</div></div>}<TeamInput label="Team name (optional)" value={name} onChange={setName} />{members.map((p, i) => <div key={i} className="space-y-3 border-t border-[hsl(var(--event-on-ink)/0.12)] pt-4"><h2 className="text-base font-semibold">{i === 0 ? "Registering player" : "Partner"}</h2><TeamInput label={`Player ${i + 1} full name`} value={p.name} onChange={v => update(i, "name", v)} /><TeamInput label={`Player ${i + 1} mobile number`} type="tel" value={p.phone} onChange={v => update(i, "phone", v.replace(/\D/g, "").slice(0, 10))} /></div>)}</div> : <div className={panel}><h2 className="font-semibold">{name || members.map(p => p.name).join(" / ")}</h2><p className={`mt-2 text-sm ${muted}`}>{members.map(p => p.name).join(" · ")}{cohort ? ` · ${cohort}` : ""}</p><div className="mt-5 flex justify-between"><span>Team entry fee</span><strong>₹{fee.toLocaleString("en-IN")}</strong></div></div>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    <Button onClick={submit} disabled={busy} className={`mt-5 h-14 w-full ${primary}`}>{step === 0 ? "Continue" : fee > 0 ? `Pay ₹${fee.toLocaleString("en-IN")} · Register team` : "Register team"}</Button>
  </TeamShell>;
}

export function TeamPass({ event }: { event: TeamEvent }) {
  const navigate = useNavigate();
  const id = localStorage.getItem(passKey(event.slug));
  const team = event.teamTournament.teams.find(t => t.id === id);
  return <TeamShell title="Your team pass" back={`/events/${event.slug}`}>{team ? <div className={panel}><p className={`text-xs uppercase ${muted}`}>{team.cancelled ? "Cancelled" : team.waitlisted ? "Waitlisted" : team.paid ? "Confirmed" : "Payment pending"}</p><h2 className="mt-3 break-words text-xl font-bold">{teamLabel(team)}</h2>{team.players.map((p, i) => <p key={i} className="mt-2 text-sm">{p.name}</p>)}<p className={`mt-5 text-xs ${muted}`}>Team reference · {team.id.slice(0, 8).toUpperCase()}</p><p className="mt-3 text-sm">{event.title} · {event.dateISO} · {event.time}</p></div> : <p>No team registration on this device.</p>}<Button className={`h-12 w-full ${primary}`} onClick={() => navigate(`/events/${event.slug}/live`)}>View tournament scores</Button></TeamShell>;
}

/** Route screens for a team tournament's player links. */
export function TeamScreen({ view }: { view: "landing" | "register" | "pass" | "live" }) {
  const { slug } = useParams();
  const { data: event, isLoading, dataUpdatedAt } = usePublicTeamEvent(slug);
  if (isLoading || !event) return blank;
  if (view === "register") return <TeamRegistration key={slug} event={event} />;
  if (view === "pass") return <TeamPass event={event} />;
  if (view === "live") return <TeamPlayerView key={slug} event={event} updatedAt={dataUpdatedAt} />;
  return <TeamLanding event={event} />;
}
