// AI Playtest Lab — admin-only dashboard. Start headless LLM-driven playtest
// runs, watch progress live, and read structured balance/clarity/fun reports.
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FlaskConical, ArrowLeft, Bot, Swords, Bug, Lightbulb, Eye, Sparkles } from "lucide-react";

const TRIBE_NAMES = ["Auren", "Kharzul", "Sunwei", "Vessari"]; // roster slots 0-3

interface FeedbackReport {
  scores: { balance: number; clarity: number; fun: number; pacing: number };
  balance: string[];
  clarity: string[];
  fun: string[];
  bugs: string[];
  suggestions: string[];
  verdict: string;
}
interface MatchSummary {
  llmTribeName: string;
  turns: number;
  phase: string;
  winnerName: string | null;
  winPath: string | null;
  tribeScores: { name: string; alive: boolean; cities: number; units: number; stars: number; techs: number; score: number }[];
  logTail: string[];
  turnNotes: string[];
}

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 8 ? "text-emerald-300 border-emerald-500/40" : value >= 5 ? "text-amber-300 border-amber-500/40" : "text-red-300 border-red-500/40";
  return (
    <div className={`flex flex-col items-center rounded-lg border bg-white/5 px-3 py-2 ${tone}`}>
      <span className="text-xl font-bold leading-none">{value}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
}

function FindingList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
        {icon} {title}
      </h4>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="rounded-md bg-white/5 px-3 py-1.5 text-sm text-white/85">{s}</li>
        ))}
      </ul>
    </div>
  );
}

function RunDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: run } = trpc.playtest.get.useQuery(
    { id },
    { refetchInterval: (q) => (q.state.data?.status === "queued" || q.state.data?.status === "running" ? 2500 : false) },
  );
  if (!run) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
  const summary: MatchSummary | null = run.matchSummary ? JSON.parse(run.matchSummary) : null;
  const report: FeedbackReport | null = run.feedback ? JSON.parse(run.feedback) : null;
  const running = run.status === "queued" || run.status === "running";
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="text-white/70 hover:text-white">
        <ArrowLeft className="mr-1 h-4 w-4" /> All runs
      </Button>
      <Card className="border-white/10 bg-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-white">
            Run #{run.id}
            <Badge variant="outline" className={running ? "border-sky-400/50 text-sky-300" : run.status === "done" ? "border-emerald-400/50 text-emerald-300" : "border-red-400/50 text-red-300"}>
              {running && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{run.status}
            </Badge>
            <span className="text-sm font-normal text-white/50">
              {run.preset} · {run.size}×{run.size} · seed {run.seed} · LLM plays {TRIBE_NAMES[run.llmTribe] ?? `#${run.llmTribe}`} · {run.model}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-white/75">
          <p>Turns played: <b>{run.turnsPlayed}</b> / {run.maxTurns} · LLM actions: <b>{run.llmActions}</b> · fallback turns: <b>{run.fallbackActions}</b></p>
          {run.error && <p className="text-red-300">Error: {run.error}</p>}
          {running && <p className="text-sky-300/80">Match in progress — the model is playing its turns. This page refreshes automatically.</p>}
        </CardContent>
      </Card>

      {report && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-4 w-4 text-amber-300" /> Playtest report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2 sm:max-w-sm">
              <ScorePill label="Balance" value={report.scores.balance} />
              <ScorePill label="Clarity" value={report.scores.clarity} />
              <ScorePill label="Fun" value={report.scores.fun} />
              <ScorePill label="Pacing" value={report.scores.pacing} />
            </div>
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">{report.verdict}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <FindingList icon={<Swords className="h-3.5 w-3.5" />} title="Balance" items={report.balance} />
              <FindingList icon={<Eye className="h-3.5 w-3.5" />} title="Clarity" items={report.clarity} />
              <FindingList icon={<Sparkles className="h-3.5 w-3.5" />} title="Fun" items={report.fun} />
              <FindingList icon={<Bug className="h-3.5 w-3.5" />} title="Possible bugs" items={report.bugs} />
            </div>
            <FindingList icon={<Lightbulb className="h-3.5 w-3.5" />} title="Suggestions" items={report.suggestions} />
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-white">Match summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-white/75">
              Ended at turn {summary.turns} ({summary.phase}).{" "}
              {summary.winnerName ? <>Winner: <b className="text-white">{summary.winnerName}</b>{summary.winPath ? ` via ${summary.winPath}` : ""}.</> : "No winner within the turn budget."}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white/75">
                <thead className="text-white/45 uppercase tracking-wider">
                  <tr><th className="py-1 pr-3">Tribe</th><th className="py-1 pr-3">Alive</th><th className="py-1 pr-3">Cities</th><th className="py-1 pr-3">Units</th><th className="py-1 pr-3">Stars</th><th className="py-1 pr-3">Techs</th><th className="py-1">Score</th></tr>
                </thead>
                <tbody>
                  {summary.tribeScores.map((t) => (
                    <tr key={t.name} className={`border-t border-white/10 ${t.name === summary.llmTribeName ? "text-sky-200" : ""}`}>
                      <td className="py-1 pr-3">{t.name}{t.name === summary.llmTribeName && <Badge variant="outline" className="ml-1.5 border-sky-400/50 px-1 py-0 text-[9px] text-sky-300"><Bot className="mr-0.5 h-2.5 w-2.5" />LLM</Badge>}</td>
                      <td className="py-1 pr-3">{t.alive ? "yes" : "no"}</td>
                      <td className="py-1 pr-3">{t.cities}</td><td className="py-1 pr-3">{t.units}</td>
                      <td className="py-1 pr-3">{t.stars}</td><td className="py-1 pr-3">{t.techs}</td><td className="py-1">{t.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {summary.turnNotes.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/60">Model's in-game observations</h4>
                <ul className="space-y-1">
                  {summary.turnNotes.map((n, i) => <li key={i} className="rounded-md bg-sky-400/10 px-3 py-1.5 text-xs text-sky-100">{n}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PlaytestLab() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<number | null>(null);
  const [preset, setPreset] = useState("continents");
  const [size, setSize] = useState("11");
  const [llmTribe, setLlmTribe] = useState("0");
  const [maxTurns, setMaxTurns] = useState("15");

  const isAdmin = user?.role === "admin";
  const { data: runs } = trpc.playtest.list.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: (q) => (q.state.data?.some((r) => r.status === "queued" || r.status === "running") ? 3000 : 15000),
  });
  const start = trpc.playtest.start.useMutation({
    onSuccess: (run) => {
      utils.playtest.list.invalidate();
      setSelected(run.id);
    },
  });

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#141433]"><Loader2 className="h-6 w-6 animate-spin text-white/50" /></div>;
  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#141433] text-white/80">
        <FlaskConical className="h-8 w-8 text-white/40" />
        <p>The Playtest Lab is for the game's admin only.</p>
        <Link href="/"><Button variant="outline" className="border-white/20 text-white">Back to the game</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141433] px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="h-6 w-6 text-amber-300" />
            <div>
              <h1 className="text-lg font-bold leading-tight">AI Playtest Lab</h1>
              <p className="text-xs text-white/50">An LLM plays headless matches and files balance reports</p>
            </div>
          </div>
          <Link href="/"><Button variant="outline" size="sm" className="border-white/20 text-white"><ArrowLeft className="mr-1 h-4 w-4" />Game</Button></Link>
        </header>

        {selected != null ? (
          <RunDetail id={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-2"><CardTitle className="text-white">Start a new run</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-white/50">World</label>
                    <Select value={preset} onValueChange={setPreset}>
                      <SelectTrigger className="w-36 border-white/20 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="continents">Continents</SelectItem>
                        <SelectItem value="archipelago">Archipelago</SelectItem>
                        <SelectItem value="highlands">Highlands</SelectItem>
                        <SelectItem value="pangaea">Pangaea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-white/50">Size</label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger className="w-24 border-white/20 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9">9×9</SelectItem>
                        <SelectItem value="11">11×11</SelectItem>
                        <SelectItem value="13">13×13</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-white/50">LLM tribe</label>
                    <Select value={llmTribe} onValueChange={setLlmTribe}>
                      <SelectTrigger className="w-28 border-white/20 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRIBE_NAMES.map((n, i) => <SelectItem key={n} value={String(i)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wider text-white/50">Turn budget</label>
                    <Select value={maxTurns} onValueChange={setMaxTurns}>
                      <SelectTrigger className="w-24 border-white/20 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => start.mutate({ preset: preset as never, size: Number(size) as never, llmTribe: Number(llmTribe), maxTurns: Number(maxTurns) })}
                    disabled={start.isPending}
                    className="bg-amber-400 text-slate-900 hover:bg-amber-300"
                  >
                    {start.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Bot className="mr-1 h-4 w-4" />}
                    Run playtest
                  </Button>
                </div>
                <p className="mt-2 text-xs text-white/45">A run takes roughly 1-3 minutes: the model plays one tribe turn-by-turn against the scripted AI, then writes its report. Costs are bounded (one LLM call per turn).</p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/5">
              <CardHeader className="pb-2"><CardTitle className="text-white">Runs</CardTitle></CardHeader>
              <CardContent>
                {!runs || runs.length === 0 ? (
                  <p className="py-6 text-center text-sm text-white/45">No playtest runs yet — start one above.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {runs.map((r) => (
                      <li key={r.id}>
                        <button onClick={() => setSelected(r.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-left text-sm transition-colors hover:bg-white/5">
                          <span className="font-semibold text-white/90">#{r.id}</span>
                          <Badge variant="outline" className={r.status === "done" ? "border-emerald-400/50 text-emerald-300" : r.status === "failed" ? "border-red-400/50 text-red-300" : "border-sky-400/50 text-sky-300"}>
                            {(r.status === "queued" || r.status === "running") && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{r.status}
                          </Badge>
                          <span className="text-white/60">{r.preset} {r.size}×{r.size} · {TRIBE_NAMES[r.llmTribe] ?? r.llmTribe} · seed {r.seed}</span>
                          <span className="ml-auto text-xs text-white/45">
                            {r.status === "done" ? (r.winnerName ? `winner: ${r.winnerName}` : "no winner") : `turn ${r.turnsPlayed}/${r.maxTurns}`}
                            {" · "}{new Date(r.createdAt).toLocaleString()}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
