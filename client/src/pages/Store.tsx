// Sunder Store — three-tier monetization storefront.
// Free base game → individual skins/tribes/map packs/story chapters → Ultimate.
import { useEffect, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { useEntitlements } from "@/hooks/useEntitlements";
import { PRODUCTS, formatPrice, ultimateSavings, type Product } from "@shared/products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SkinPreview from "@/components/SkinPreview";
import { AccountPanel } from "@/game/ui/AccountPanel";
import { ArrowLeft, Check, Crown, Loader2, Lock, Map as MapIcon, Palette, ScrollText, Shield, Sparkles } from "lucide-react";

const KIND_META: Record<string, { title: string; blurb: string; icon: React.ReactNode }> = {
  skin: { title: "Tribe Skins", blurb: "Costume variants for the six standard tribes — new colors, same tactics.", icon: <Palette className="h-4 w-4" /> },
  tribe: { title: "Premium Tribes", blurb: "New factions with unique passives and signature units.", icon: <Shield className="h-4 w-4" /> },
  maps: { title: "Map Packs", blurb: "AI-forged, hand-curated worlds for quick matches.", icon: <MapIcon className="h-4 w-4" /> },
  story: { title: "Story Mode", blurb: "A campaign apart — conquer the Shatterlands chapter by chapter.", icon: <ScrollText className="h-4 w-4" /> },
};

function useCheckout() {
  const checkout = trpc.store.checkout.useMutation({
    onSuccess: ({ url }) => {
      toast("Opening secure checkout…", { description: "Complete your purchase in the new tab, then come back here." });
      window.open(url, "_blank");
    },
    onError: (e) => toast.error(e.message),
  });
  return checkout;
}

function ProductCard({ p, owned, onBuy, buying }: { p: Product; owned: boolean; onBuy: () => void; buying: boolean }) {
  return (
    <div className="relative flex flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-transform hover:-translate-y-0.5" style={{ boxShadow: `inset 0 2px 0 ${p.accent}33` }}>
      <div className="mb-2 h-1.5 w-10 rounded-full" style={{ background: p.accent }} />
      {p.kind === "skin" && <SkinPreview skinKey={p.grants[0]} accent={p.accent} />}
      <h3 className="font-bold text-white">{p.name}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-white/55">{p.tagline}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-sm font-bold text-white/90">{formatPrice(p.priceCents)}</span>
        {owned ? (
          <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15"><Check className="mr-1 h-3 w-3" />Owned</Badge>
        ) : (
          <Button size="sm" onClick={onBuy} disabled={buying} className="h-8 bg-white/10 text-white hover:bg-white/20">
            {buying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="mr-1 h-3 w-3" />}
            Unlock
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Store() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const ents = useEntitlements();
  const checkout = useCheckout();
  const utils = trpc.useUtils();
  const search = useSearch();

  // Purchase-return banner: ?purchase=success&sku=...
  useEffect(() => {
    const params = new URLSearchParams(search);
    const result = params.get("purchase");
    if (result === "success") {
      toast.success("Purchase complete!", { description: "Your unlock is being delivered — it appears below within a few seconds." });
      // webhook fulfillment is async; poll ownership a few times
      const t1 = setTimeout(() => utils.store.mine.invalidate(), 2500);
      const t2 = setTimeout(() => utils.store.mine.invalidate(), 7000);
      window.history.replaceState(null, "", "/store");
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (result === "cancelled") {
      toast("Checkout cancelled", { description: "No charge was made." });
      window.history.replaceState(null, "", "/store");
    }
  }, [search, utils]);

  const ultimate = PRODUCTS.find((p) => p.sku === "bundle_ultimate")!;
  const ownUltimate = ents.hasAll(ultimate.grants);
  const savings = useMemo(ultimateSavings, []);
  const groups = useMemo(() => {
    const g: Record<string, Product[]> = {};
    for (const p of PRODUCTS) if (p.kind !== "bundle") (g[p.kind] ??= []).push(p);
    return g;
  }, []);

  const buy = (sku: string) => {
    if (!isAuthenticated) {
      toast("Sign in to purchase", { description: "Your unlocks are tied to your account so they roam devices." });
      startLogin();
      return;
    }
    checkout.mutate({ sku });
  };

  return (
    <div className="min-h-screen bg-[#141433] px-4 py-6 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-amber-300" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Sunder Store</h1>
              <p className="text-xs text-white/50">The base game is free forever — these are the extras.</p>
            </div>
          </div>
          <Link href="/"><Button variant="outline" size="sm" className="border-white/20 text-white"><ArrowLeft className="mr-1 h-4 w-4" />Game</Button></Link>
        </header>

        {/* Ultimate hero card */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/15 via-transparent to-transparent p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-md">
              <h2 className="flex items-center gap-2 text-xl font-extrabold text-amber-200"><Crown className="h-5 w-5" /> {ultimate.name}</h2>
              <p className="mt-1 text-sm text-white/70">{ultimate.tagline}</p>
              <p className="mt-2 text-xs text-amber-200/70">
                Everything bought separately: <s>{formatPrice(savings.total)}</s> — Ultimate is {formatPrice(savings.bundle)}.
              </p>
            </div>
            {ownUltimate ? (
              <Badge className="bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-500/15"><Check className="mr-1 h-4 w-4" />You own everything</Badge>
            ) : (
              <Button onClick={() => buy(ultimate.sku)} disabled={checkout.isPending} className="bg-amber-400 px-6 text-base font-bold text-slate-900 hover:bg-amber-300">
                {checkout.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Crown className="mr-1.5 h-4 w-4" />}
                {formatPrice(ultimate.priceCents)}
              </Button>
            )}
          </div>
        </section>

        {(authLoading || ents.loading) && (
          <p className="flex items-center gap-2 text-sm text-white/50"><Loader2 className="h-4 w-4 animate-spin" />Checking your unlocks…</p>
        )}

        {(["story", "tribe", "maps", "skin"] as const).map((kind) => (
          <section key={kind}>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-white/60">{KIND_META[kind].icon}</span>
              <h2 className="font-bold text-white">{KIND_META[kind].title}</h2>
              <span className="text-xs text-white/40">{KIND_META[kind].blurb}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groups[kind]?.map((p) => (
                <ProductCard key={p.sku} p={p} owned={ents.hasAll(p.grants)} onBuy={() => buy(p.sku)} buying={checkout.isPending && checkout.variables?.sku === p.sku} />
              ))}
            </div>
          </section>
        ))}

        {isAuthenticated && ents.purchases.length > 0 && (
          <section>
            <h2 className="mb-2 font-bold text-white">Purchase history</h2>
            <ul className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
              {ents.purchases.map((pu) => {
                const prod = PRODUCTS.find((p) => p.sku === pu.sku);
                return (
                  <li key={pu.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="text-white/85">{prod?.name ?? pu.sku}</span>
                    <span className="text-xs text-white/45">{prod ? formatPrice(prod.priceCents) : ""} · {new Date(pu.createdAt).toLocaleDateString()}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Restore and account deletion also live in the Commander's Record on
            the main menu; they are repeated here because this is the screen an
            App Review tester opens when checking purchase handling, and a
            restore mechanism they cannot find is a restore mechanism that does
            not exist as far as Guideline 3.1.1 is concerned. */}
        <section>
          <h2 className="mb-2 font-bold text-white">Your account</h2>
          <div className="max-w-md"><AccountPanel /></div>
        </section>

        <p className="pb-4 text-center text-[11px] text-white/35">
          Payments are processed securely by Stripe. All purchases are one-time — no subscriptions.
        </p>
      </div>
    </div>
  );
}
