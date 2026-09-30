// Model Lab — the designer's acceptance harness.
// Every model must pass at 40px in color, grayscale, and eight rotational views
// before it can graduate from review-only status to a live board unit.
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { UnitType } from "@/game/core/types";
import {
  NERIVANE_ARCHER_PILOT,
  NERIVANE_DEFENDER_PILOT,
  NERIVANE_RIDER_AQUATIC_V2,
  NERIVANE_RIDER_PILOT,
  NERIVANE_WARRIOR_GOLDEN_V2,
  NERIVANE_WARRIOR_PILOT,
} from "@/game/render/importedModelRegistry";
import {
  renderImportedModel,
  type ImportedPortraitResult,
} from "@/game/render/importedPortraits";
import {
  createPortraitSession,
  NERIVANE_PORTRAIT_SET,
  PORTRAIT_EXPORT_SIZES,
} from "@/game/render/portraits";

const LABELS: Record<string, string> = {
  warrior: "Warrior",
  archer: "Archer",
  defender: "Defender",
  rider: "Rider",
  tidecaller: "Tidecaller",
  berserker: "Berserker",
  arcanist: "Arcanist",
  warden: "Warden",
  raider: "Raider",
  bulwark: "Bulwark",
  hero: "Hero",
};

// Dev harness: ?tribe=<TRIBE_DEFS index> renders another tribe's set.
const TRIBE = (() => {
  const tribe = parseInt(
    new URLSearchParams(window.location.search).get("tribe") ?? "4",
    10
  );
  return Number.isFinite(tribe) && tribe >= 0 && tribe <= 7 ? tribe : 4;
})();

const UNIQUES: Record<number, UnitType> = {
  0: "arcanist",
  1: "berserker",
  2: "warden",
  3: "raider",
  4: "tidecaller",
  5: "bulwark",
};
const ANGLES = Array.from(
  { length: 8 },
  (_, index) => (index / 8) * Math.PI * 2
);
const WARRIOR_SCENARIO_ASSET_URL = `https://app.scenario.com/assets?openAssetId=${NERIVANE_WARRIOR_PILOT.assetId}`;
const ARCHER_SCENARIO_ASSET_URL = `https://app.scenario.com/assets?openAssetId=${NERIVANE_ARCHER_PILOT.assetId}`;
const DEFENDER_SCENARIO_ASSET_URL = `https://app.scenario.com/assets?openAssetId=${NERIVANE_DEFENDER_PILOT.assetId}`;
const RIDER_SCENARIO_ASSET_URL = `https://app.scenario.com/assets?openAssetId=${NERIVANE_RIDER_PILOT.assetId}`;
const RIDER_V2_SCENARIO_ASSET_URL = `https://app.scenario.com/assets?openAssetId=${NERIVANE_RIDER_AQUATIC_V2.assetId}`;

interface Row {
  type: UnitType;
  master: string;
  angles: string[];
  exports: Record<number, string>;
}

function SmallReadabilityPair({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col items-center gap-1">
        <img
          src={src}
          alt={`${label} at 40 pixels`}
          style={{ width: 40, height: 40 }}
          className="rounded bg-[#101030]"
        />
        <span className="text-[10px] text-slate-400">40px color</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <img
          src={src}
          alt={`${label} in grayscale at 40 pixels`}
          style={{ width: 40, height: 40, filter: "grayscale(1)" }}
          className="rounded bg-[#101030]"
        />
        <span className="text-[10px] text-slate-400">40px gray</span>
      </div>
    </div>
  );
}

function RotationStrip({ angles, label }: { angles: string[]; label: string }) {
  return (
    <div className="flex flex-wrap items-end gap-1">
      {angles.map((angle, index) => (
        <div key={index} className="flex flex-col items-center gap-1">
          <img
            src={angle}
            alt={`${label} at ${index * 45} degrees`}
            style={{ width: 56, height: 56 }}
            className="rounded bg-[#101030]"
          />
          <span className="text-[10px] text-slate-500">{index * 45}°</span>
        </div>
      ))}
    </div>
  );
}

function BoardContextTile({ src, label }: { src: string; label: string }) {
  return (
    <div className="space-y-2">
      <div className="relative h-28 w-36 overflow-hidden rounded-xl border border-cyan-200/10 bg-gradient-to-b from-[#0a1734] via-[#102f4b] to-[#08152c]">
        <div
          className="absolute bottom-2 left-1/2 h-16 w-28 -translate-x-1/2 bg-gradient-to-br from-[#20706b] via-[#175750] to-[#103a43] shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
          style={{
            clipPath:
              "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#06091f] to-transparent" />
        <img
          src={src}
          alt={`${label} in approximate board context`}
          className="absolute bottom-3 left-1/2 h-16 w-16 -translate-x-1/2 object-contain drop-shadow-[0_5px_4px_rgba(0,0,0,0.75)]"
        />
        <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_9px_#55e6d5]" />
      </div>
      <p className="max-w-36 text-center text-[10px] leading-tight text-slate-400">
        {label}
      </p>
    </div>
  );
}

export default function ModelLab() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [p2Pilot, setP2Pilot] = useState<ImportedPortraitResult | null>(null);
  const [p2Archer, setP2Archer] = useState<ImportedPortraitResult | null>(null);
  const [p2Defender, setP2Defender] = useState<ImportedPortraitResult | null>(
    null
  );
  const [p2Rider, setP2Rider] = useState<ImportedPortraitResult | null>(null);
  const [p2RiderV2, setP2RiderV2] = useState<ImportedPortraitResult | null>(
    null
  );
  const [blenderStudy, setBlenderStudy] =
    useState<ImportedPortraitResult | null>(null);
  const [pilotError, setPilotError] = useState<string | null>(null);

  const setForTribe = useMemo(
    () =>
      NERIVANE_PORTRAIT_SET.map(type =>
        type === "tidecaller" ? UNIQUES[TRIBE] : type
      ).filter((type): type is UnitType => !!type),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = createPortraitSession();
      if (!session) {
        setFailed(true);
        return;
      }
      await session.capture(TRIBE, "warrior", { sizes: [64] });
      const output: Row[] = [];
      for (const type of setForTribe) {
        await new Promise(resolve => setTimeout(resolve, 10));
        if (cancelled) {
          session.dispose();
          return;
        }
        const master = await session.capture(TRIBE, type);
        const angles: string[] = [];
        for (const yaw of ANGLES) {
          const portrait = await session.capture(TRIBE, type, {
            yaw,
            sizes: [128],
          });
          angles.push(portrait.webp[128] ?? "");
        }
        output.push({
          type,
          master: master.masterPng,
          angles,
          exports: master.webp,
        });
        if (!cancelled) setRows([...output]);
      }
      session.dispose();
    })();
    return () => {
      cancelled = true;
    };
  }, [setForTribe]);

  useEffect(() => {
    if (!rows || rows.length !== setForTribe.length) return;
    let cancelled = false;
    (async () => {
      try {
        const rawResult = await renderImportedModel(NERIVANE_WARRIOR_PILOT);
        const goldenResult = await renderImportedModel(
          NERIVANE_WARRIOR_GOLDEN_V2
        );
        const archerResult = await renderImportedModel(NERIVANE_ARCHER_PILOT);
        const defenderResult = await renderImportedModel(
          NERIVANE_DEFENDER_PILOT
        );
        const riderResult = await renderImportedModel(NERIVANE_RIDER_PILOT);
        const riderV2Result = await renderImportedModel(
          NERIVANE_RIDER_AQUATIC_V2
        );
        if (!cancelled) {
          if (
            rawResult &&
            goldenResult &&
            archerResult &&
            defenderResult &&
            riderResult &&
            riderV2Result
          ) {
            setP2Pilot(rawResult);
            setBlenderStudy(goldenResult);
            setP2Archer(archerResult);
            setP2Defender(defenderResult);
            setP2Rider(riderResult);
            setP2RiderV2(riderV2Result);
          } else {
            setPilotError(
              "WebGL could not initialize the imported-model renderer."
            );
          }
        }
      } catch (error) {
        if (!cancelled)
          setPilotError(
            error instanceof Error
              ? error.message
              : "The imported GLB could not be rendered."
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows, setForTribe.length]);

  if (failed)
    return (
      <div className="p-8 text-red-400">
        WebGL unavailable — portraits cannot render in this browser.
      </div>
    );

  const baseline = rows?.find(row => row.type === "warrior");
  const baselineArcher = rows?.find(row => row.type === "archer");
  const baselineDefender = rows?.find(row => row.type === "defender");
  const baselineRider = rows?.find(row => row.type === "rider");
  return (
    <div className="min-h-screen space-y-8 bg-[#141433] p-6 text-slate-100">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">
            Model Lab — tribe {TRIBE} acceptance
          </h1>
          <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">
            Review harness only
          </span>
        </div>
        <p className="max-w-4xl text-sm text-slate-400">
          Every candidate shares the same orthographic framing, transparent
          background, feet baseline, 40px test, and eight-view rotation strip.
          Approved P2 models are locked visual targets; replacing the normal
          gameplay lineup remains a separate production step.
        </p>
      </header>

      {TRIBE === 4 && (
        <section className="space-y-5 rounded-2xl border border-cyan-300/20 bg-[#1c1c46] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Approved visual direction
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Nerivane Warrior: Scenario P2 v1 approved
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                The Scenario P2 v1 model is the locked visual target for its
                tapered silhouette, armor layering, mask-and-crest relationship,
                and character. Blender v2 is retained below only as a rejected
                optimization study and must not steer future unit design.
              </p>
            </div>
            <a
              href={WARRIOR_SCENARIO_ASSET_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                Scenario asset
              </Button>
            </a>
          </div>

          {!baseline && (
            <div className="text-sm text-slate-400">
              Rendering procedural baseline…
            </div>
          )}
          {baseline && (!p2Pilot || !blenderStudy) && !pilotError && (
            <div className="text-sm text-slate-400">
              Loading and framing imported GLBs…
            </div>
          )}
          {pilotError && (
            <div className="rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
              Imported-model preview failed: {pilotError}
            </div>
          )}

          {baseline && p2Pilot && blenderStudy && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    name: "Current procedural Warrior",
                    source: baseline.master,
                    status: "Current live model",
                    statusClass: "bg-slate-300/10 text-slate-300",
                  },
                  {
                    name: NERIVANE_WARRIOR_PILOT.name,
                    source: p2Pilot.masterPng,
                    status: "Approved visual target",
                    statusClass: "bg-cyan-300/15 text-cyan-200",
                  },
                  {
                    name: NERIVANE_WARRIOR_GOLDEN_V2.name,
                    source: blenderStudy.masterPng,
                    status: "Rejected study",
                    statusClass: "bg-rose-300/10 text-rose-200",
                  },
                ].map(item => (
                  <article
                    key={item.name}
                    className="rounded-xl bg-[#101030] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.statusClass}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end gap-6">
                      <img
                        src={item.source}
                        alt={item.name}
                        className="h-48 w-48 rounded-lg bg-[#0b0b27] object-contain"
                      />
                      <SmallReadabilityPair
                        src={item.source}
                        label={item.name}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4 rounded-xl bg-[#101030] p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current procedural rotation
                  </p>
                  <RotationStrip
                    angles={baseline.angles}
                    label="Current procedural Warrior"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Approved P2 v1 rotation
                  </p>
                  <RotationStrip
                    angles={p2Pilot.angles}
                    label="Approved Scenario P2 Warrior"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Rejected Blender v2 study
                  </p>
                  <RotationStrip
                    angles={blenderStudy.angles}
                    label="Rejected Blender Warrior v2 study"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#101030] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Approximate occupied-hex scale
                </p>
                <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                  <BoardContextTile src={baseline.master} label="Procedural" />
                  <BoardContextTile
                    src={p2Pilot.masterPng}
                    label="Approved P2 v1"
                  />
                  <BoardContextTile
                    src={blenderStudy.masterPng}
                    label="Rejected Blender study"
                  />
                </div>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Approved triangles</dt>
                  <dd className="font-semibold">
                    {NERIVANE_WARRIOR_PILOT.triangles.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Approved GLB</dt>
                  <dd className="font-semibold">
                    {(NERIVANE_WARRIOR_PILOT.sourceBytes / 1024 / 1024).toFixed(
                      2
                    )}{" "}
                    MB
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Study triangles</dt>
                  <dd className="font-semibold">
                    {NERIVANE_WARRIOR_GOLDEN_V2.triangles.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Study GLB</dt>
                  <dd className="font-semibold">
                    {(NERIVANE_WARRIOR_GOLDEN_V2.sourceBytes / 1024).toFixed(1)}{" "}
                    KB
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Study runtime</dt>
                  <dd className="font-semibold">
                    {NERIVANE_WARRIOR_GOLDEN_V2.runtimePrimitives} draw calls ·
                    no textures
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-semibold text-emerald-300">
                    P2 v1 approved
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
      )}

      {TRIBE === 4 && (
        <section className="space-y-5 rounded-2xl border border-amber-300/20 bg-[#1c1c46] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Approved second class
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Nerivane Archer: Scenario P2 v1 approved
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                The second P2 unit tests whether the approved Warrior language
                repeats across a distinct class. It preserves the faceted mask,
                teal armor, pale crest, and fractured base while using the bow
                and quiver as the Archer silhouette. It passed visual review and
                is now the locked Archer target.
              </p>
            </div>
            <a
              href={ARCHER_SCENARIO_ASSET_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                Scenario asset
              </Button>
            </a>
          </div>

          {(!baselineArcher || !p2Archer) && !pilotError && (
            <div className="text-sm text-slate-400">
              Rendering procedural and imported Archer candidates…
            </div>
          )}
          {pilotError && (
            <div className="rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
              Imported-model preview failed: {pilotError}
            </div>
          )}

          {baselineArcher && p2Archer && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    name: "Current procedural Archer",
                    source: baselineArcher.master,
                    status: "Current live model",
                    statusClass: "bg-slate-300/10 text-slate-300",
                  },
                  {
                    name: NERIVANE_ARCHER_PILOT.name,
                    source: p2Archer.masterPng,
                    status: "Approved visual target",
                    statusClass: "bg-cyan-300/15 text-cyan-200",
                  },
                ].map(item => (
                  <article
                    key={item.name}
                    className="rounded-xl bg-[#101030] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.statusClass}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end gap-6">
                      <img
                        src={item.source}
                        alt={item.name}
                        className="h-48 w-48 rounded-lg bg-[#0b0b27] object-contain"
                      />
                      <SmallReadabilityPair
                        src={item.source}
                        label={item.name}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4 rounded-xl bg-[#101030] p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current procedural Archer rotation
                  </p>
                  <RotationStrip
                    angles={baselineArcher.angles}
                    label="Current procedural Archer"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                    P2 Archer v1 rotation
                  </p>
                  <RotationStrip
                    angles={p2Archer.angles}
                    label="Scenario P2 Archer v1"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#101030] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Approximate occupied-hex scale
                </p>
                <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                  <BoardContextTile
                    src={baselineArcher.master}
                    label="Procedural Archer"
                  />
                  <BoardContextTile
                    src={p2Archer.masterPng}
                    label="P2 Archer v1"
                  />
                </div>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Triangles</dt>
                  <dd className="font-semibold">
                    {NERIVANE_ARCHER_PILOT.triangles.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">GLB</dt>
                  <dd className="font-semibold">
                    {(NERIVANE_ARCHER_PILOT.sourceBytes / 1024 / 1024).toFixed(
                      2
                    )}{" "}
                    MB
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Runtime</dt>
                  <dd className="font-semibold">
                    {NERIVANE_ARCHER_PILOT.runtimePrimitives} draw call
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Texture</dt>
                  <dd className="font-semibold">
                    {NERIVANE_ARCHER_PILOT.textureResolution}px PBR
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-semibold text-cyan-300">
                    Approved visual target
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
      )}

      {TRIBE === 4 && (
        <section className="space-y-5 rounded-2xl border border-emerald-300/20 bg-[#1c1c46] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Third approved P2 class
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Nerivane Defender: Scenario P2 v1
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                The third approved P2 unit extends the locked Nerivane faction
                language to a broad defensive silhouette. Its shield remains
                unmistakable at 40 pixels while the faceted mask, pale crest,
                teal armor, and fractured base keep it in the same family as the
                approved Warrior and Archer.
              </p>
            </div>
            <a
              href={DEFENDER_SCENARIO_ASSET_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                Scenario asset
              </Button>
            </a>
          </div>

          {(!baselineDefender || !p2Defender) && !pilotError && (
            <div className="text-sm text-slate-400">
              Rendering procedural and imported Defender candidates…
            </div>
          )}
          {pilotError && (
            <div className="rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
              Imported-model preview failed: {pilotError}
            </div>
          )}

          {baselineDefender && p2Defender && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {[
                  {
                    name: "Current procedural Defender",
                    source: baselineDefender.master,
                    status: "Current live model",
                    statusClass: "bg-slate-300/10 text-slate-300",
                  },
                  {
                    name: NERIVANE_DEFENDER_PILOT.name,
                    source: p2Defender.masterPng,
                    status: "Approved target",
                    statusClass: "bg-emerald-300/15 text-emerald-200",
                  },
                ].map(item => (
                  <article
                    key={item.name}
                    className="rounded-xl bg-[#101030] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.statusClass}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end gap-6">
                      <img
                        src={item.source}
                        alt={item.name}
                        className="h-48 w-48 rounded-lg bg-[#0b0b27] object-contain"
                      />
                      <SmallReadabilityPair
                        src={item.source}
                        label={item.name}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4 rounded-xl bg-[#101030] p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current procedural Defender rotation
                  </p>
                  <RotationStrip
                    angles={baselineDefender.angles}
                    label="Current procedural Defender"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    P2 Defender v1 rotation
                  </p>
                  <RotationStrip
                    angles={p2Defender.angles}
                    label="Scenario P2 Defender v1"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#101030] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Approximate occupied-hex scale
                </p>
                <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                  <BoardContextTile
                    src={baselineDefender.master}
                    label="Procedural Defender"
                  />
                  <BoardContextTile
                    src={p2Defender.masterPng}
                    label="P2 Defender v1"
                  />
                </div>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Triangles</dt>
                  <dd className="font-semibold">
                    {NERIVANE_DEFENDER_PILOT.triangles.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">GLB</dt>
                  <dd className="font-semibold">
                    {(
                      NERIVANE_DEFENDER_PILOT.sourceBytes /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Runtime</dt>
                  <dd className="font-semibold">
                    {NERIVANE_DEFENDER_PILOT.runtimePrimitives} draw call
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Texture</dt>
                  <dd className="font-semibold">
                    {NERIVANE_DEFENDER_PILOT.textureResolution}px PBR
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-semibold text-emerald-300">
                    User approved
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
      )}

      {TRIBE === 4 && (
        <section className="space-y-5 rounded-2xl border border-violet-300/20 bg-[#1c1c46] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                Fourth P2 class — aquatic v2 approved
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                Nerivane Rider: P2 v1 versus aquatic v2
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                V1 established the stronger mounted direction. Aquatic v2 keeps
                the approved rider, spear, palette, and fractured base while
                replacing the stockier mount with a longer marine body, broad
                lateral fins, and a tapered tail. Compare silhouette and
                rider-versus-mount separation at 40 pixels and on one hex.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={RIDER_SCENARIO_ASSET_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm">
                  V1 asset
                </Button>
              </a>
              <a
                href={RIDER_V2_SCENARIO_ASSET_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="outline" size="sm">
                  Aquatic v2 asset
                </Button>
              </a>
            </div>
          </div>

          {(!baselineRider || !p2Rider || !p2RiderV2) && !pilotError && (
            <div className="text-sm text-slate-400">
              Rendering procedural and imported Rider comparisons…
            </div>
          )}
          {pilotError && (
            <div className="rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
              Imported-model preview failed: {pilotError}
            </div>
          )}

          {baselineRider && p2Rider && p2RiderV2 && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    name: "Current procedural Rider",
                    source: baselineRider.master,
                    status: "Current live model",
                    statusClass: "bg-slate-300/10 text-slate-300",
                  },
                  {
                    name: NERIVANE_RIDER_PILOT.name,
                    source: p2Rider.masterPng,
                    status: "Retained study",
                    statusClass: "bg-violet-300/15 text-violet-200",
                  },
                  {
                    name: NERIVANE_RIDER_AQUATIC_V2.name,
                    source: p2RiderV2.masterPng,
                    status: "Approved visual target",
                    statusClass: "bg-cyan-300/15 text-cyan-200",
                  },
                ].map(item => (
                  <article
                    key={item.name}
                    className="rounded-xl bg-[#101030] p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.statusClass}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end gap-6">
                      <img
                        src={item.source}
                        alt={item.name}
                        className="h-48 w-48 rounded-lg bg-[#0b0b27] object-contain"
                      />
                      <SmallReadabilityPair
                        src={item.source}
                        label={item.name}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <div className="space-y-4 rounded-xl bg-[#101030] p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Current procedural Rider rotation
                  </p>
                  <RotationStrip
                    angles={baselineRider.angles}
                    label="Current procedural Rider"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-300">
                    P2 Rider v1 rotation
                  </p>
                  <RotationStrip
                    angles={p2Rider.angles}
                    label="Scenario P2 Rider v1"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Aquatic Rider v2 rotation
                  </p>
                  <RotationStrip
                    angles={p2RiderV2.angles}
                    label="Scenario P2 aquatic Rider v2"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#101030] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Approximate occupied-hex scale
                </p>
                <div className="flex flex-wrap justify-center gap-6 sm:justify-start">
                  <BoardContextTile
                    src={baselineRider.master}
                    label="Procedural Rider"
                  />
                  <BoardContextTile
                    src={p2Rider.masterPng}
                    label="P2 Rider v1"
                  />
                  <BoardContextTile
                    src={p2RiderV2.masterPng}
                    label="Aquatic Rider v2"
                  />
                </div>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">V1 triangles</dt>
                  <dd className="font-semibold">
                    {NERIVANE_RIDER_PILOT.triangles.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">V1 GLB</dt>
                  <dd className="font-semibold">
                    {(NERIVANE_RIDER_PILOT.sourceBytes / 1024 / 1024).toFixed(
                      2
                    )}{" "}
                    MB
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">V2 triangles</dt>
                  <dd className="font-semibold">
                    {NERIVANE_RIDER_AQUATIC_V2.triangles.toLocaleString()}
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">V2 GLB</dt>
                  <dd className="font-semibold">
                    {(
                      NERIVANE_RIDER_AQUATIC_V2.sourceBytes /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">V2 runtime</dt>
                  <dd className="font-semibold">
                    {NERIVANE_RIDER_AQUATIC_V2.runtimePrimitives} draw call
                  </dd>
                </div>
                <div className="rounded-lg bg-[#101030] p-3">
                  <dt className="text-slate-500">Decision</dt>
                  <dd className="font-semibold text-cyan-300">
                    Aquatic v2 approved
                  </dd>
                </div>
              </dl>
            </>
          )}
        </section>
      )}

      {!rows && <div className="text-slate-400">Rendering models…</div>}
      {rows?.map(row => (
        <section
          key={row.type}
          className="space-y-3 rounded-xl bg-[#1c1c46] p-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {LABELS[row.type] ?? row.type}
            </h2>
            <div className="flex gap-2">
              {PORTRAIT_EXPORT_SIZES.map(size => (
                <a
                  key={size}
                  href={row.exports[size]}
                  download={`nerivane-${row.type}-${size}.webp`}
                >
                  <Button variant="outline" size="sm">
                    {size}px
                  </Button>
                </a>
              ))}
              <a href={row.master} download={`nerivane-${row.type}-1024.png`}>
                <Button size="sm">Master PNG</Button>
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <img
              src={row.master}
              alt={`${LABELS[row.type] ?? row.type} master render`}
              className="h-40 w-40 rounded-lg bg-[#101030]"
            />
            <SmallReadabilityPair
              src={row.master}
              label={LABELS[row.type] ?? row.type}
            />
            <RotationStrip
              angles={row.angles}
              label={LABELS[row.type] ?? row.type}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
