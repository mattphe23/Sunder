// Privacy policy.
//
// App Store Guideline 5.1.1(i): every app must have a privacy policy, linked
// from its App Store Connect listing. Sunder had none, which is a hard stop at
// submission — the field cannot be left empty.
//
// ⚠ TWO THINGS MUST BE SET BEFORE SUBMITTING (see docs/APP-STORE-READINESS.md):
//
//   1. CONTACT below is a placeholder. Apple requires a working contact, and a
//      privacy policy with a dead address is worse than none. Point it at a
//      real inbox you are willing to publish.
//   2. This is written to match what the code actually does, not to be legal
//      advice. Read it against your own situation before you publish it —
//      particularly if the App Store age rating ends up 4+ or the app is
//      submitted to the Kids Category, which brings COPPA obligations this
//      text does not attempt to cover.
//
// Everything factual here was checked against the code:
//   - OAuth sign-in stores openId, name, email, loginMethod  (drizzle/schema)
//   - profiles / leaderboard_entries / matches                (game data)
//   - purchases + entitlements hold SKUs and Stripe ids only  (server/db.ts)
//   - no analytics SDK, no ad network, no third-party tracker (package.json)
//   - deletion really does erase all of it                    (db.deleteAccount)
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

/** Published contact address. MUST be a real, monitored inbox before launch. */
const CONTACT = "support@example.com";

const UPDATED = "August 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-bold text-white">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#141433] px-4 py-6 text-white">
      <div className="mx-auto max-w-2xl space-y-7">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold leading-tight">Privacy Policy</h1>
            <p className="text-xs text-white/50">Sunder: The Living Forge · last updated {UPDATED}</p>
          </div>
          <Link href="/">
            <span className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10">
              <ArrowLeft className="h-3.5 w-3.5" />Game
            </span>
          </Link>
        </header>

        <p className="text-sm leading-relaxed text-white/75">
          Sunder is a single-player and asynchronous multiplayer strategy game. You can play the whole game
          without an account. Signing in is optional, and exists so your record, your online duels and
          anything you have unlocked follow you between devices.
        </p>

        <Section title="What we collect">
          <p>
            <strong className="text-white/90">If you never sign in:</strong> nothing is sent to us. Your
            progress, settings and saved games are stored only on your device.
          </p>
          <p>
            <strong className="text-white/90">If you sign in:</strong> we store the account identifier and
            the name and email address supplied by the sign-in provider you chose, plus the game data tied
            to that account — your commander name and lifetime statistics, challenge leaderboard scores, and
            the state of any online duels you take part in.
          </p>
          <p>
            <strong className="text-white/90">If you buy something:</strong> we store which items the account
            owns and an identifier for the transaction. Payment card details never reach us; they are handled
            entirely by Stripe.
          </p>
        </Section>

        <Section title="What we do not do">
          <p>
            There is no advertising in Sunder, no analytics or attribution SDK, and no tracking of you across
            other apps or websites. We do not sell or share personal data with data brokers, and we do not
            build advertising profiles. Nothing in the game asks for your contacts, photos, microphone or
            location.
          </p>
        </Section>

        <Section title="Who else sees it">
          <p>
            <strong className="text-white/90">Your sign-in provider</strong> authenticates you and tells us
            your account identifier, name and email.
          </p>
          <p>
            <strong className="text-white/90">Stripe</strong> processes payments and holds the payment record.
            See Stripe&apos;s own privacy policy for what they retain.
          </p>
          <p>
            <strong className="text-white/90">Other players</strong> see your commander name — on the global
            leaderboard if you post a score, and in an online duel you join. Nothing else about you is shown
            to them.
          </p>
          <p>We also disclose data where the law requires it.</p>
        </Section>

        <Section title="Deleting your account">
          <p>
            You can delete your account from inside the game: open{" "}
            <strong className="text-white/90">Commander&apos;s Record</strong> on the main menu, or the{" "}
            <Link href="/store"><span className="cursor-pointer text-cyan-300 underline-offset-2 hover:underline">store page</span></Link>,
            and choose Delete account.
          </p>
          <p>
            This erases your profile, your leaderboard scores, your purchase records and your unlocks. Online
            duels you played in are not deleted, because another player shares them — instead your name and
            account are removed from them and the match is marked abandoned. Deletion is immediate and cannot
            be undone: unlocks are gone with the account, and buying again is the only way back.
          </p>
          <p>
            Deleting your account here does not delete the payment record held by Stripe, which we are not
            able to remove and which they retain for their own legal and accounting obligations.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            Account data is kept until you delete the account. Data on your device stays until you delete the
            app or clear it from the game&apos;s own settings.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Sunder is not directed at young children and we do not knowingly collect personal information
            from them. If you believe a child has created an account, contact us and we will delete it.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes materially we will update the date at the top of this page and note the
            change in the app&apos;s release notes.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about privacy, or a request to delete data you cannot reach from inside the app:{" "}
            <a href={`mailto:${CONTACT}`} className="text-cyan-300 underline-offset-2 hover:underline">{CONTACT}</a>
          </p>
        </Section>

        <p className="pb-6 text-center text-[11px] text-white/35">Sunder: The Living Forge</p>
      </div>
    </div>
  );
}
