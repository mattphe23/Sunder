// Account controls — restore purchases, and delete the account.
//
// Both exist because of App Store review, and both are the kind of thing that
// is easy to leave until submission and then discover is a blocker:
//
//   Guideline 3.1.1     "you should make sure you have a restore mechanism for
//                        any restorable in-app purchases". Sunder's unlocks
//                        live on the account rather than on the device, so
//                        signing in already restores them — but a reviewer
//                        cannot see a mechanism that has no button, and a
//                        player who reinstalls has no way to know. The button
//                        is the mechanism as far as review is concerned.
//
//   Guideline 5.1.1(v)  "If your app supports account creation, you must also
//                        offer account deletion within the app." Not a support
//                        email, not a link to a web form — in the app.
//
// The deletion flow asks the player to type DELETE. That is not security (the
// server has its own guard); it is to make sure nobody gives up their unlocks
// with a mis-tap, because the unlocks really do go.
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Loader2, RotateCcw, ShieldAlert, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEntitlements } from "@/hooks/useEntitlements";
import { startLogin } from "@/const";

/** The policy has to be reachable from inside the app, not only from the
 *  App Store listing — a reviewer looks for it where account controls live. */
function PrivacyLink() {
  return (
    <Link href="/privacy">
      <span className="mt-2 block cursor-pointer text-center text-[10px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline">
        Privacy policy
      </span>
    </Link>
  );
}

export function AccountPanel() {
  const { isAuthenticated, user } = useAuth();
  const ents = useEntitlements();
  const utils = trpc.useUtils();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");

  const del = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted", {
        description: "Your profile, scores and unlocks have been removed.",
      });
      // Nothing on this page is meaningful once the account is gone, and the
      // session cookie is already cleared server-side — reload into signed-out.
      setTimeout(() => window.location.reload(), 1200);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Sign in to sync your record across devices and to restore anything you have unlocked.
        </p>
        <button
          onClick={() => startLogin()}
          className="mt-2 min-h-[44px] w-full rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200 transition-colors hover:bg-cyan-400/20 active:scale-[0.98]"
        >
          Sign in
        </button>
        <PrivacyLink />
      </div>
    );
  }

  async function restore() {
    // Entitlements are server-held, so "restore" is an authoritative refetch
    // rather than a receipt replay. Report the real count either way: silence
    // on a restore that found nothing reads as a broken button.
    const before = ents.keys.length;
    await utils.store.mine.invalidate();
    const fresh = await utils.store.mine.fetch();
    const n = fresh?.entitlements?.length ?? 0;
    if (n === 0) toast("Nothing to restore", { description: "This account has no purchases yet." });
    else if (n > before) toast.success(`Restored ${n - before} unlock${n - before === 1 ? "" : "s"}.`);
    else toast.success(`All ${n} unlock${n === 1 ? "" : "s"} are already active.`);
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Account</p>
        <p className="mt-1 truncate font-mono text-[11px] text-slate-300">{user?.email || user?.name || "Signed in"}</p>
        <button
          onClick={restore}
          className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/10 active:scale-[0.98]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore purchases
        </button>
      </div>

      <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] p-3">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md px-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300 transition-colors hover:bg-rose-500/10 active:scale-[0.98]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete account
          </button>
        ) : (
          <div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-rose-200">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This permanently deletes your commander profile, leaderboard scores, online matches and{" "}
                <strong className="font-bold">every unlock you have purchased</strong>. It cannot be undone, and buying
                again is the only way back.
              </span>
            </p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="mt-2.5 min-h-[44px] w-full rounded-md border border-rose-400/30 bg-black/25 px-3 font-mono text-sm text-rose-100 outline-none placeholder:text-rose-300/40 focus:border-rose-400/70"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => { setConfirming(false); setTyped(""); }}
                className="min-h-[44px] flex-1 rounded-md border border-white/10 bg-white/5 px-3 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200 transition-colors hover:bg-white/10 active:scale-[0.98]"
              >
                Keep my account
              </button>
              <button
                disabled={typed.trim().toUpperCase() !== "DELETE" || del.isPending}
                onClick={() => del.mutate({ confirm: "DELETE" })}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-md bg-rose-500 px-3 font-display text-[11px] font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-500/25 disabled:text-rose-200/50 active:scale-[0.98]"
              >
                {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
      <PrivacyLink />
    </div>
  );
}
