import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

/**
 * Maldives Tuna Dashboard
 * - Visualizes local vs global skipjack prices (MVR/kg)
 * - Shows government subsidy (MVR, millions) and MIFCO revenue (MVR, millions)
 * - Includes year-over-year changes and notes
 *
 * Data sources (summarized):
 *  - MMA Table 4.1 (Fish Prices & Production, 2019–2025): local & global prices, catch/exports
 *  - MIFCO audited financial statements 2023–2024: revenue, subsidy treatment
 *  - MoF budget: subsidies 2025 (budget); 2026 proposal (not charted)
 *  - 2025 price = YTD; revenue/subsidy not yet audited
 */

// ---------- Hard-coded summary data (keep simple & transparent) ----------
// Local skipjack purchase price (MVR/kg)
// MMA 'Local companies purchase price' — sector average
const localPrice = {
  2021: 14.0,
  2022: 15.0,
  2023: 23.0,
  2024: 14.0,
  2025: 14.0, // Jan–Oct (MMA annual YTD)
};

// International (Bangkok) skipjack (MVR/kg)
const globalPrice = {
  2021: 25.4,
  2022: 26.2,
  2023: 22.4,
  2024: 23.1,
  2025: 24.1, // Jan–Oct avg
};

// MIFCO quay price (policy/realised) (MVR/kg) — for SKJ purchases
// Defaults mirror sector average unless policy diverged; adjust as better data comes in
const mifcoLocalPrice = {
  2021: 14.0,
  2022: 15.0,
  2023: 25.0, // fixed price policy announced Sep 2023
  2024: 14.0, // weekly market‑linked regime
  2025: 16.0, // minimum from Dec 14, 2025 (YTD avg may differ)
};

// MIFCO revenue (MVR) — audited where available; 2021–22 are public company figures
const revenueMvr = {
  2021: 1199676000, // ≈ USD 77.8m @ 15.42
  2022: 1634520000, // ≈ USD 106m @ 15.42
  2023: 2008805560, // audited comparative
  2024: 1075554268, // audited
  2025: null, // not yet published
};

// Net profit / (loss) after tax (MVR)
const netProfitMvr = {
  2021: null,
  2022: null,
  2023: 298329409, // profit for the year (audited)
  2024: -165639426, // loss for the year (audited)
  2025: null,
};

// Subsidy / Govt support to MIFCO (MVR)
const subsidyMvr = {
  2021: null, // not published
  2022: null, // loan write-off in 2022 (not a recurring subsidy line)
  2023: 250000000, // grant in Other Income
  2024: 404356780, // approved; 389,518,216 disbursed in-year
  2025: 341814184, // budget allocation (not actual)
};

// Sector fish purchases (all companies), metric tonnes — MMA Table 4.1
const purchasesTonnes = {
  2021: 88313,
  2022: 81033,
  2023: 96120,
  2024: 53232,
  2025: null,
};

// MIFCO purchases (proxy, see note):
// 2022 & 2023 use MIFCO frozen export volumes as a proxy for purchases.
// 2024 uses reported purchases over Nov 17, 2023–Nov 15, 2024 (~50,588 t) as an annual proxy.
const mifcoPurchasesTonnes = {
  2021: null,
  2022: 55989,
  2023: 62352,
  2024: 50588,
  2025: null,
};

// Fresh/chilled/frozen tuna exports (all exporters), metric tonnes — MMA
const exportsTonnes = {
  2021: 66480,
  2022: 65580,
  2023: 64350,
  2024: 31730,
  2025: null,
};

// Total fish catch (all species), metric tonnes — MMA Table 4.1
const totalCatchTonnes = {
  2021: 144993,
  2022: 155205,
  2023: 160683,
  2024: 107666,
  2025: null,
};

// Build a unified dataset for the chart & tables
const years = [2021, 2022, 2023, 2024, 2025];

function buildRows() {
  return years.map((y) => { /* row builder start */
    const local = localPrice[y];
    const global = globalPrice[y];
    const revenue = revenueMvr[y];
    const netProfit = netProfitMvr[y];
    const subsidy = subsidyMvr[y];
    const purchT = purchasesTonnes[y];
    const mifcoLocal = mifcoLocalPrice[y];
    const exportT = exportsTonnes[y];
    const catchT = totalCatchTonnes[y];
    const mifcoPurchT = mifcoPurchasesTonnes[y];
    // Approx cash paid to boats (MVR m) = local price * purchases (kg) / 1e6
    const cashToBoatsMvrM = local != null && purchT != null ? Number(((local * purchT * 1000) / 1_000_000).toFixed(1)) : null;
    const priceGap = local != null && global != null ? Number((global - local).toFixed(1)) : null;
    const priceGapMifco = mifcoLocal != null && global != null ? Number((global - mifcoLocal).toFixed(1)) : null;

    return {
      year: String(y),
      localPrice: local ?? null,
      mifcoLocalPrice: mifcoLocal ?? null,
      globalPrice: global ?? null,
      priceGap,
      priceGapPct: priceGap != null && local != null ? Number(((priceGap / local) * 100).toFixed(1)) : null,
      priceGapMifco,
      priceGapMifcoPct: priceGapMifco != null && mifcoLocal != null ? Number(((priceGapMifco / mifcoLocal) * 100).toFixed(1)) : null,
      revenueMvr: revenue,
      netProfitMvr: netProfit,
      revenueMvrMillions: revenue != null ? Number((revenue / 1_000_000).toFixed(1)) : null,
      netProfitMvrMillions: netProfit != null ? Number((netProfit / 1_000_000).toFixed(1)) : null,
      subsidyMvr: subsidy,
      subsidyMvrMillions: subsidy != null ? Number((subsidy / 1_000_000).toFixed(1)) : null,
      purchasesKt: purchT != null ? Number((purchT / 1000).toFixed(1)) : null,
      exportsKt: exportT != null ? Number((exportT / 1000).toFixed(1)) : null,
      cashToBoatsMvrM: cashToBoatsMvrM,
      totalCatchKt: catchT != null ? Number((catchT / 1000).toFixed(1)) : null,
      mifcoPurchasesKt: mifcoPurchT != null ? Number((mifcoPurchT / 1000).toFixed(1)) : null,
      mifcoShareOfCatchPct: mifcoPurchT != null && catchT != null ? Number(((mifcoPurchT / catchT) * 100).toFixed(1)) : null,
      notes:
        y === 2025
          ? "2025 prices YTD; revenue not yet published; subsidy is budgeted"
          : y === 2024
          ? "Subsidy recorded net against cost of sales (MVR 4/kg scheme)"
          : y === 2023
          ? "Grant recorded in Other Income; fixed price policy in effect (Sep)"
          : undefined,
    };
  });
}

function yoy(curr: number | null, prev: number | null) {
  if (curr == null || prev == null) return null;
  if (prev === 0) return null;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}

function useRowsWithYoY() {
  const rows = useMemo(() => buildRows(), []);
  return useMemo(() => {
    return rows.map((row, idx) => {
      const prev = idx > 0 ? rows[idx - 1] : undefined;
      return {
        ...row,
        yoyLocal: yoy(row.localPrice, prev?.localPrice ?? null),
        yoyGlobal: yoy(row.globalPrice, prev?.globalPrice ?? null),
        yoyRevenue: yoy(row.revenueMvrMillions, prev?.revenueMvrMillions ?? null),
        yoyNetProfit: yoy(row.netProfitMvrMillions, prev?.netProfitMvrMillions ?? null),
        yoySubsidy: yoy(row.subsidyMvrMillions, prev?.subsidyMvrMillions ?? null),
      };
    });
  }, [rows]);
}

// ---------- UI Helpers ----------
const Stat = ({ label, value, suffix = "", highlight = false }: { label: string; value: React.ReactNode; suffix?: string; highlight?: boolean }) => (
  <div className="flex flex-col">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-xl font-semibold ${highlight ? "text-primary" : ""}`}>{value}{suffix}</span>
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground border border-border">{children}</span>
);

// ---------- Main Component ----------
export default function MaldivesTunaDashboard() {
  const data = useRowsWithYoY();
  const [showRevenue, setShowRevenue] = useState(true);
  const [showSubsidy, setShowSubsidy] = useState(true);
  const [showGlobal, setShowGlobal] = useState(true);
  const [showMifcoPrice, setShowMifcoPrice] = useState(true);

  const latest = data[data.length - 2]; // 2025 has partials; use 2024 for headline
  const prev = data[data.length - 3];   // 2023
  const priceCollapse = yoy(latest?.localPrice ?? null, prev?.localPrice ?? null); // 2024 vs 2023

  // --- Impact headline metrics ---
  const revenueDrop = latest?.revenueMvrMillions != null && prev?.revenueMvrMillions != null
    ? Number((((latest.revenueMvrMillions - prev.revenueMvrMillions) / prev.revenueMvrMillions) * 100).toFixed(1))
    : null;
  const subsidyYoY = latest?.subsidyMvrMillions != null && prev?.subsidyMvrMillions != null
    ? Number((((latest.subsidyMvrMillions - prev.subsidyMvrMillions) / prev.subsidyMvrMillions) * 100).toFixed(1))
    : null;
  const purchasesDrop = latest?.purchasesKt != null && prev?.purchasesKt != null
    ? Number((((latest.purchasesKt - prev.purchasesKt) / prev.purchasesKt) * 100).toFixed(1))
    : null;
  const exportsDrop = latest?.exportsKt != null && prev?.exportsKt != null
    ? Number((((latest.exportsKt - prev.exportsKt) / prev.exportsKt) * 100).toFixed(1))
    : null;

  // --- Revenue loss in MVR (billions) and average annual growth 2021→2023 ---
  const rev21 = data.find((r) => r.year === "2021")?.revenueMvrMillions ?? null;
  const rev22 = data.find((r) => r.year === "2022")?.revenueMvrMillions ?? null;
  const rev23 = data.find((r) => r.year === "2023")?.revenueMvrMillions ?? null;
  const rev24 = data.find((r) => r.year === "2024")?.revenueMvrMillions ?? null;

  const revenueLossMvrM = rev23 != null && rev24 != null ? Number((rev23 - rev24).toFixed(1)) : null; // in millions
  const revenueLossMvrBn = revenueLossMvrM != null ? Number((revenueLossMvrM / 1000).toFixed(2)) : null; // in billions

  const yoy21to22 = rev21 != null && rev22 != null ? (rev22 - rev21) / rev21 : null;
  const yoy22to23 = rev22 != null && rev23 != null ? (rev23 - rev22) / rev22 : null;
  const avgYoYPct = yoy21to22 != null && yoy22to23 != null ? Number((((yoy21to22 + yoy22to23) / 2) * 100).toFixed(1)) : null;
  const cagrPct = rev21 != null && rev23 != null ? Number(((Math.pow(rev23 / rev21, 1 / 2) - 1) * 100).toFixed(1)) : null;
  const avgAnnualIncreaseMvrM = rev21 != null && rev23 != null ? Number((((rev23 - rev21) / 2).toFixed(1))) : null;

  // Avg gap excluding 2023 (industry-normal vs shock year)
  const avgGapEx2023 = (() => {
    const rows = data.filter((r) => r.year !== "2023");
    const gaps = rows.map((r) => (r.priceGap != null ? r.priceGap : null)).filter((x) => x != null);
    if (!gaps.length) return null;
    const avg = gaps.reduce((a, b) => (a as number) + (b as number), 0 as number) / gaps.length;
    return Number(avg.toFixed(1));
  })();

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-9 h-9 rounded-2xl bg-primary/10 grid place-items-center shadow-sm">
              <span className="text-primary font-bold">🐟</span>
            </motion.div>
            <div>
              <h1 className="text-xl font-semibold">Maldives Tuna — Industry Dashboard</h1>
              <p className="text-xs text-muted-foreground">Local vs global price • Subsidy & revenue • Purchases & exports</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="global" checked={showGlobal} onCheckedChange={setShowGlobal} />
              <Label htmlFor="global" className="text-sm">Global price</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="mifcoPrice" checked={showMifcoPrice} onCheckedChange={setShowMifcoPrice} />
              <Label htmlFor="mifcoPrice" className="text-sm">MIFCO price</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="revenue" checked={showRevenue} onCheckedChange={setShowRevenue} />
              <Label htmlFor="revenue" className="text-sm">Revenue</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="subsidy" checked={showSubsidy} onCheckedChange={setShowSubsidy} />
              <Label htmlFor="subsidy" className="text-sm">Subsidy</Label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 grid gap-6">
        {/* Hero analysis strip */}
        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-primary/10 via-background to-background">
              <div className="p-6 grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <h2 className="text-2xl font-semibold">The 2023 shock and its ripple effects</h2>
                  <p className="text-sm text-muted-foreground leading-6">
                    Revenue climbed from <strong>2021 → 2023</strong>, then the <strong>Sep 2023</strong> fixed-price policy (set to 25 MVR/kg,
                    averaging ~<strong>23 MVR/kg</strong> locally) pushed procurement above export parity. The <strong>2024</strong> switch to a weekly market-linked price at <strong>14 MVR/kg</strong>
                    was the <em>reset</em>—not the cause. The damage was already done in 2023: MIFCO revenue in 2024 fell <strong>{revenueDrop != null ? `${Math.abs(revenueDrop)}%` : "46%"}</strong> (from <strong>{rev23 != null ? `${rev23} MVR m` : "—"}</strong> <em>(2023)</em> to <strong>{rev24 != null ? `${rev24} MVR m` : "—"}</strong> <em>(2024)</em>; ≈ <strong>{revenueLossMvrBn != null ? `${revenueLossMvrBn} bn MVR loss` : "0.93 bn MVR loss"}</strong>) vs 2023 as volumes and cashflow tightened even with higher subsidies.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Pill>Revenue loss vs 2023: {revenueLossMvrBn != null ? `${revenueLossMvrBn} bn MVR loss` : "—"}</Pill>
                    <Pill className={revenueDrop != null ? (revenueDrop >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300") : ""}>
                      Revenue YoY {revenueDrop != null ? `${revenueDrop}%` : "—"}
                    </Pill>
                    <Pill className={subsidyYoY != null ? (subsidyYoY >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300") : ""}>
                      Subsidy YoY {subsidyYoY != null ? `${subsidyYoY}%` : "—"}
                    </Pill>
                    <Pill className={purchasesDrop != null ? (purchasesDrop >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300") : ""}>
                      Purchases YoY {purchasesDrop != null ? `${purchasesDrop}%` : "—"}
                    </Pill>
                    <Pill className={exportsDrop != null ? (exportsDrop >= 0 ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300") : ""}>
                      Exports YoY {exportsDrop != null ? `${exportsDrop}%` : "—"}
                    </Pill>
                    <Pill>Avg global–local gap ex‑2023: {avgGapEx2023 != null ? `${avgGapEx2023} MVR/kg` : "—"}</Pill>
                  </div>
                </div>
                <div className="rounded-2xl border bg-background/60 p-4 flex flex-col justify-center gap-2">
                  <div className="text-sm">Key takeaways</div>
                  <ul className="text-sm leading-6 list-disc pl-5">
                    <li><strong>Gap % = GP%</strong>: we interpret global–local gap as gross margin vs local cost.</li>
                    <li>2023 was the <em>exception</em>; excluding it, the average gap favours global over local.</li>
                    <li>Cash to boats swings with price × purchases; halts and late payments amplify pain.</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Local SKJ price (2024, MMA avg)</CardTitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <Stat label="MVR per kg" value={latest?.localPrice ?? "—"} highlight />
              <Pill>YoY {priceCollapse != null ? `${priceCollapse}%` : "—"}</Pill>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Global SKJ price (2024)</CardTitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <Stat label="MVR per kg" value={latest?.globalPrice ?? "—"} />
              <Pill>Gap vs local {latest?.priceGapPct != null ? `${latest.priceGapPct}%` : "—"}</Pill>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Revenue (2024)</CardTitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <Stat label="MVR millions" value={latest?.revenueMvrMillions ?? "—"} />
              <Pill>YoY {latest?.yoyRevenue != null ? `${latest.yoyRevenue}%` : "—"}</Pill>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Subsidy (2024)</CardTitle></CardHeader>
            <CardContent className="flex items-end justify-between">
              <Stat label="MVR millions" value={latest?.subsidyMvrMillions ?? "—"} />
              <Pill>YoY {latest?.yoySubsidy != null ? `${latest.yoySubsidy}%` : "—"}</Pill>
            </CardContent>
          </Card>
        </div>

        {/* Extra KPI: average MIFCO price over 2021–2024 */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">MIFCO average quay price (2021–2024)</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            {(() => {
              const vals = [2021,2022,2023,2024].map((y)=>mifcoLocalPrice[y]).filter((v)=>v!=null) as number[];
              const avg = vals.length ? Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)) : null;
              return <Stat label="MVR per kg" value={avg ?? "—"} highlight />
            })()}
            <Pill>Includes policy shift in 2023</Pill>
          </CardContent>
        </Card>

        {/* Chart */}
<Card className="rounded-2xl">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      Impact Timeline — Prices (MVR/kg) + Subsidy (MVR m)
      <Info className="w-4 h-4 text-muted-foreground" />
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
            yAxisId="left"
            domain={[
              Math.min(
                ...data.map(d => Math.min(d.localPrice ?? Infinity, d.globalPrice ?? Infinity))
              ) - 2,
              Math.max(
                ...data.map(d => Math.max(d.localPrice ?? -Infinity, d.globalPrice ?? -Infinity))
              ) + 2
            ]}
            tickCount={6}
            allowDataOverflow
            label={{ value: "Price (MVR/kg)", angle: -90, position: "insideLeft" }}
          />
            <YAxis yAxisId="right" orientation="right" label={{ value: "MVR millions (Subsidy)", angle: 90, position: "insideRight" }} />
            <Tooltip formatter={(value, name) => [value, name]} labelFormatter={(l) => `Year ${l}`} />
            <Legend />
            <ReferenceArea x1="2023" x2="2024" strokeOpacity={0} fill="rgba(99, 102, 241, 0.06)" />
            <Area yAxisId="left" type="monotone" dataKey="localPrice" name="Local price (MVR/kg)" fill="rgba(16,185,129,0.18)" stroke="rgba(16,185,129,1)" strokeWidth={3} />
            {showMifcoPrice && (
              <Line yAxisId="left" type="monotone" dataKey="mifcoLocalPrice" name="MIFCO price (MVR/kg)" stroke="#16a34a" strokeWidth={3} strokeDasharray="3 3" dot={{ r: 3 }} />
            )}
            {showGlobal && (
              <Line yAxisId="left" type="monotone" dataKey="globalPrice" name="Global price (MVR/kg)" stroke="#0ea5e9" strokeWidth={3} strokeDasharray="6 3" dot={{ r: 3 }} />
            )}
            <Line yAxisId="right" type="monotone" dataKey="subsidyMvrMillions" name="Subsidy (MVR m)" stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={3} dot={{ r: 3 }} />
          </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-muted-foreground mt-3">
      Diagnosis: <strong>2021–2023</strong> revenue up; <strong>Sep 2023</strong> fixed price set at 25 MVR/kg (avg ~23) over export parity → <strong>2024 revenue –46% YoY</strong> despite subsidies; <strong>net profit swung</strong> from <strong>+298 MVR m (2023)</strong> to <strong>–166 MVR m (2024)</strong> (audited).
      Local price is per kilogram. Size threshold was ≥1.5kg (Jul 2024), updated to ≥1kg from Dec 14, 2025. 
      <strong>All local prices shown are annual averages from MMA Table 4.1</strong> (e.g., Feb 2024 temporary fixed rate = 20 MVR/kg, but the 2024 annual average = 14).
    </p>
  </CardContent>
</Card>

        {/* Separate charts: Purchases & Total Catch */}
<div className="grid md:grid-cols-2 gap-4">
  <Card className="rounded-2xl">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">MIFCO purchases vs Total fish catch — k tonnes & share<Info className="w-4 h-4 text-muted-foreground" /></CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: "k tonnes", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: "MVR millions (Revenue)", angle: 90, position: "insideRight" }} />
            <Tooltip />
            <Legend />
            <ReferenceArea x1="2023" x2="2024" strokeOpacity={0} fill="rgba(255, 99, 132, 0.06)" />
            <Bar dataKey="mifcoPurchasesKt" name="MIFCO purchases (k t)" barSize={22} fill="#22c55e" />
            <Bar dataKey="totalCatchKt" name="Total catch (k t)" barSize={22} fill="#06b6d4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-3">MIFCO series is a <em>proxy</em>: 2022–23 use frozen export volume; 2024 uses reported purchases Nov 2023–Nov 2024 (~50.6k t). Share vs total catch is approximate.</p>
    </CardContent>
  </Card>

  <Card className="rounded-2xl">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">Revenue vs Tuna exports — MVR m & k tonnes<Info className="w-4 h-4 text-muted-foreground" /></CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis yAxisId="left" label={{ value: "k tonnes", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: "MVR millions (Revenue)", angle: 90, position: "insideRight" }} />
            <Tooltip />
            <Legend />
            <ReferenceArea x1="2023" x2="2024" strokeOpacity={0} fill="rgba(99, 102, 241, 0.06)" />
            <Bar yAxisId="left" dataKey="exportsKt" name="Tuna exports (k t)" barSize={24} fill="#06b6d4" />
            {showRevenue && (
              <Line yAxisId="right" type="monotone" dataKey="revenueMvrMillions" name="Revenue (MVR m)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Dual‑axis: exports (k t, left) vs MIFCO revenue (MVR m, right). Shows how the 2023 policy shock fed into 2024’s volume and topline drop.</p>
    </CardContent>
  </Card>
</div>

{/* Data table */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Yearly figures & deltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left">
                  <tr className="border-b">
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Local (MVR/kg)</th>
                    <th className="py-2 pr-4">MIFCO price (MVR/kg)</th>
                    <th className="py-2 pr-4">YoY</th>
                    <th className="py-2 pr-4">Global (MVR/kg)</th>
                    <th className="py-2 pr-4">YoY</th>
                    <th className="py-2 pr-4">Gap (MVR/kg)</th>
                    <th className="py-2 pr-4">Gap (%)</th>
                    <th className="py-2 pr-4">Revenue (MVR m)</th>
                    <th className="py-2 pr-4">YoY</th>
                    <th className="py-2 pr-4">Net profit (MVR m)</th>
                    <th className="py-2 pr-4">YoY</th>
                    <th className="py-2 pr-4">Subsidy (MVR m)</th>
                    <th className="py-2 pr-4">YoY</th>
                    <th className="py-2 pr-4">MIFCO purchases (k t)</th>
                    <th className="py-2 pr-4">MIFCO share of total catch</th>
                    <th className="py-2 pr-4">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.year} className="border-b hover:bg-muted/40">
                      <td className="py-2 pr-4 font-medium">{r.year}</td>
                      <td className="py-2 pr-4">{r.localPrice ?? "—"}</td>
                      <td className="py-2 pr-4">{r.mifcoLocalPrice ?? "—"}</td>
                      <td className="py-2 pr-4">{r.yoyLocal != null ? `${r.yoyLocal}%` : "—"}</td>
                      <td className="py-2 pr-4">{r.globalPrice ?? "—"}</td>
                      <td className="py-2 pr-4">{r.yoyGlobal != null ? `${r.yoyGlobal}%` : "—"}</td>
                      <td className="py-2 pr-4">{r.priceGap ?? "—"}</td>
                      <td className="py-2 pr-4">{r.priceGapPct != null ? `${r.priceGapPct}%` : "—"}</td>
                      <td className="py-2 pr-4">{r.revenueMvrMillions ?? "—"}</td>
                      <td className="py-2 pr-4">{r.yoyRevenue != null ? `${r.yoyRevenue}%` : "—"}</td>
                      <td className="py-2 pr-4">{r.netProfitMvrMillions ?? "—"}</td>
                      <td className="py-2 pr-4">{r.yoyNetProfit != null ? `${r.yoyNetProfit}%` : "—"}</td>
                      <td className="py-2 pr-4">{r.subsidyMvrMillions ?? "—"}</td>
                      <td className="py-2 pr-4">{r.yoySubsidy != null ? `${r.yoySubsidy}%` : "—"}</td>
                      <td className="py-2 pr-4">{r.mifcoPurchasesKt ?? "—"}</td>
                      <td className="py-2 pr-4">{r.mifcoShareOfCatchPct != null ? `${r.mifcoShareOfCatchPct}%` : "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{r.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Narrative */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Analysis: 2023 decision → 2024 collapse, and how to sustain the industry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <p>
              <strong>What happened:</strong> In <strong>Sep 2023</strong> the state buyer fixed the quay price at <strong>25 MVR/kg</strong> while the
              <em>international</em> skipjack benchmark (Bangkok) sat lower. That put procurement above export parity. In 2024 the policy switched to a
              <strong> weekly market-linked</strong> formula; local price reset to <strong>14 MVR/kg</strong> while the global index averaged ~<strong>23 MVR/kg</strong>.
            </p>
            <p>
              <strong>Industry impact (2024 vs 2023):</strong> revenue fell by about <strong>{revenueDrop != null ? `${Math.abs(revenueDrop)}%` : "46%"}</strong> — from <strong>{rev23 != null ? `${rev23} MVR m` : "—"}</strong> <em>(2023)</em> to <strong>{rev24 != null ? `${rev24} MVR m` : "—"}</strong> <em>(2024)</em> — a top‑line loss of roughly <strong>{revenueLossMvrBn != null ? `${revenueLossMvrBn} bn MVR` : "0.93 bn MVR"}</strong> (≈ {revenueLossMvrM != null ? `${revenueLossMvrM} MVR m` : "933 MVR m"}). Purchases dropped ~<strong>{purchasesDrop != null ? `${Math.abs(purchasesDrop)}%` : "45%"}</strong>, and tuna export volumes roughly halved. Subsidy support rose ~<strong>{subsidyYoY != null ? `${Math.abs(subsidyYoY)}%` : "62%"}</strong> but could not prevent a loss.
            </p>
            <p>
              <strong>Before the shock:</strong> average annual revenue growth over <strong>2021→2023</strong> was around <strong>{avgYoYPct != null ? `${avgYoYPct}%` : "30%"}</strong>
              (CAGR ≈ {cagrPct != null ? `${cagrPct}%` : "29%"}), equal to about <strong>{avgAnnualIncreaseMvrM != null ? `${avgAnnualIncreaseMvrM} MVR m` : "405 MVR m"}</strong> per year. The <strong>Sep 2023</strong> policy change interrupted this trajectory and undermined market confidence.
            </p>
            <p>
              <strong>Why it was brittle:</strong> fresh landings are priced off a <em>frozen export</em> benchmark after subtracting processing, logistics and FX. A fixed price in 2023 ignored that economics; when catch tightened and USD access was constrained, the loss transferred to MIFCO and boats.
            </p>

            <div className="rounded-xl border p-3 bg-red-50/60 dark:bg-red-900/10">
              <div className="font-medium mb-1">Subsidy became unavoidable after the 2023 change</div>
              <p>
                After the 2023 change, once quay price was set above export parity, the government had to introduce and expand a subsidy to absorb the
                <em>ripple effects</em> of the skipjack price increase (cashflow gaps, halted buying, and widening losses). The 2024 scheme (recorded net against CoS)
                cushioned boats but did not restore volumes or profitability.
              </p>
            </div>

            <div className="rounded-xl border p-3 bg-background/60">
              <div className="font-medium mb-1">Market structure shock: MIFCO’s share jumped as private capacity struggled</div>
              <p>
                MIFCO historically accounted for ~<strong>38%</strong> of total catch in <strong>2023</strong> (≈ {data.find(r=>r.year==='2023')?.mifcoShareOfCatchPct ?? '38%'} by our proxy), but rose to about
                <strong> 47%</strong> in <strong>2024</strong>. That implies private processors’ throughput shrank materially. For instance, <em>Ensis</em> is a bellwether private exporter;
                industry reports and market chatter indicate severe margin compression in late 2023–2024. In this context, proposals for MIFCO to acquire or utilise
                private facilities (e.g., Ensis plants) have surfaced as a stop‑gap to protect jobs and export lanes while liquidity is rebuilt.
              </p>
              <p className="text-xs text-muted-foreground">Note: 38% and 47% are derived here from MIFCO purchases ÷ total catch using proxies for MIFCO volume (see table footnote). Validate with MMA/Customs once full-year figures are available.</p>
            </div>

            <div className="rounded-xl border p-3 bg-red-50/80 dark:bg-red-900/20">
              <div className="font-medium mb-1">Urgent: prevent an industry‑wide collapse</div>
              <p>
                After the <strong>2023 change</strong>, MIFCO covered ~<strong>38%</strong> of the market in 2023 but ~<strong>47%</strong> in 2024 as private capacity shrank. 
                Private companies like <em>Ensis</em> faced severe margin compression; proposals for MIFCO to utilise or acquire private facilities emerged to safeguard jobs and export lanes. 
                The government should treat this as an <strong>emergency</strong> and intervene with a hyper‑focused plan before capacity and market access are permanently lost.
              </p>
            </div>

            {/* Strategic path forward */}
            <div className="rounded-xl border p-3 bg-emerald-50/60 dark:bg-emerald-900/10">
              <div className="font-medium mb-1">Path forward: revive private sector with sovereign guardrails</div>
              <p>
                The state buyer covered roughly <strong>38%</strong> of the market in 2023 and ~<strong>47%</strong> in 2024. Relying on permanent subsidies or
                further expanding MIFCO’s share is <strong>not feasible</strong>—it concentrates risk, strains cashflow, and crowds out capacity. The only durable route is to
                <strong> revive the private sector</strong> with 
                <strong> foreign investment</strong> (under clear ownership and data‑sharing guardrails) and a 
                <strong> design‑thinking</strong> restructuring of plants, cold‑chain and payment rails—while ensuring Maldivian <strong>sovereignty</strong> over the EEZ and compliance.
              </p>
              <ul className="list-disc pl-5 text-sm">
                <li><strong>Pay boats fast</strong>: if vessels are unpaid, they cannot sail; many are debt‑burdened. Enforce 24–48h payment SLAs with escrow/receivables‑backed WC.</li>
                <li><strong>Capex via blended finance</strong>: invite strategic partners to refinance/upgrade private plants; keep golden‑share/state veto on sovereignty matters.</li>
                <li><strong>Compete on USD/kg</strong>: value‑add cuts, brand/MSC, and route optimisation to lift realisations rather than price‑setting at quay.</li>
              </ul>
            </div>

            {/* Myth busting block */}
            <div className="rounded-xl border p-3 bg-background/60">
              <div className="font-medium mb-1">Myth: “Maldivian purchase price is higher than international”</div>
              <p>
                Historically the <em>international</em> skipjack index (Bangkok) has been about <strong>~70% higher</strong> than the Maldivian local purchase price (e.g.,
                2022: 26.2 vs 15 ⇒ ~74.7%; 2024: 23.1 vs 14 ⇒ ~64.3%). The exception was <strong>2023</strong>, when policy set the local price <strong>above</strong> the
                international benchmark, creating a structural loss and triggering the cascade. (See table for year‑by‑year gap.)
              </p>
              <p className="text-xs text-muted-foreground">Abbreviations: <em>m</em> = million; <em>bn</em>/<em>b</em> = billion.</p>
            </div>

            <div className="rounded-xl border p-3 bg-amber-50/40 dark:bg-amber-900/10">
                <div className="font-medium mb-1">Market confidence & destination mix (2024) — action to verify</div>
                <p>Hypothesis: the <strong>Sep 2023 fixed-price hike</strong> eroded buyer confidence and we <em>lost some importers/markets</em> in 2024. To confirm, compare <strong>destination-level exports</strong> (EU, Thailand, Sri Lanka, Japan, Middle East, others) for <strong>2021–2024</strong> by volume/value and product form (fresh/chilled/frozen, cans). Use <strong>Maldives Customs</strong> or <strong>MMA</strong> monthly export data (by country) to check if specific lanes fell disproportionately in 2024.</p>
                <ul className="list-disc pl-5 text-sm">
                  <li>Compute % share by destination and the YoY change in 2024 vs 2023.</li>
                  <li>Flag buyers with <strong>–30% or worse</strong> volume drops and check if prices paid diverged from benchmark.</li>
                  <li>Cross‑reference price memos and any <em>cancelled PO</em> notes to attribute to price vs logistics/quality.</li>
                </ul>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border p-3 bg-background/60">
                <div className="font-medium mb-1">Emergency actions (next 90 days)</div>
                <ul className="list-disc pl-5">
                  <li>Ring‑fence a working‑capital line to keep quay buying uninterrupted and pay boats within 48 hours.</li>
                  <li>Publish the weekly formula and smoothing band; report a weekly <em>expected</em> SKJ price 2 weeks forward.</li>
                  <li>Fast‑track cold storage/stevedoring swaps with private plants to stabilise throughput.</li>
                </ul>
              </div>
              <div className="rounded-xl border p-3 bg-background/60">
                <div className="font-medium mb-1">Stabilise cash & capacity</div>
                <p>Guarantee 48‑hour payments via receivables‑backed working capital. Eliminate buy halts by adding surge cold capacity and rapid cross‑shuttle between plants.</p>
              </div>
              <div className="rounded-xl border p-3 bg-background/60">
                <div className="font-medium mb-1">Predictable support</div>
                <p>Fund a Fisher Stabilisation Account with a small export levy and windfalls; pay out only when the index breaches the floor.</p>
              </div>
              <div className="rounded-xl border p-3 bg-background/60">
                <div className="font-medium mb-1">Protect the premium</div>
                <p>Maintain zero foreign industrial access in the EEZ, enforce MCS, and push MSC‑aligned branding/value‑added cuts to lift realised USD/kg.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Note: All local company purchase prices on this dashboard use <strong>MMA Table 4.1 annual averages</strong>. We treat <em>Gap %</em> (global−local ÷ local) as a proxy for gross margin %. The 2023 spike (local ≥ global) is highlighted as the outlier year; excluding 2023, the average gap favours global over local by about {avgGapEx2023 != null ? `${avgGapEx2023} MVR/kg` : "~9–10 MVR/kg"}. <strong>Abbreviations:</strong> <em>m</em> = million; <em>bn</em>/<em>b</em> = billion. The 2023 spike (local ≥ global) is highlighted as the outlier year; excluding 2023, the average gap favours global over local by about {avgGapEx2023 != null ? `${avgGapEx2023} MVR/kg` : "~9–10 MVR/kg"}.</p>
          </CardContent>
        </Card>

        <footer className="py-8 text-xs text-muted-foreground">
          <div className="space-y-2">
            <div className="text-sm font-medium">Sources</div>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Maldives Monetary Authority (MMA): <em>Fish Prices & Production — Table 4.1 (2019–2025)</em> — local company purchase prices, sector purchases, total catch, and tuna exports. 
                <a className="underline" href="https://database.mma.gov.mv/monthly-statistics/real/fish-prices-and-production" target="_blank" rel="noreferrer">database.mma.gov.mv</a>
              </li>
              <li>
                Maldives Industrial Fisheries Company (MIFCO): <em>Audited Financial Statements 2024</em> (with 2023 comparatives) — revenue, subsidy accounting (grant vs. cost offset), loss figures. 
                <a className="underline" href="https://www.audit.gov.mv/Uploads/AuditReports/2025/08August/89._Maldives_Industrial_Fisheries_Company_Limited_Audit_Report_2024___Financial_Statement_Audit.pdf" target="_blank" rel="noreferrer">audit.gov.mv (PDF)</a>
              </li>
              <li>
                Ministry of Finance (MoF): <em>State Budget</em> — Fisheries Subsidy (MIFCO) allocations and execution notes. 
                <a className="underline" href="https://www.finance.gov.mv/public/attachments/QrLvIkBOd5yTjem7e1JFLzwiXjz5S51imQPXVblc.pdf" target="_blank" rel="noreferrer">2024 Approved Budget (PDF)</a> · 
                <a className="underline" href="https://www.finance.gov.mv/public/attachments/ofVUGdO2A7MBjk0nX3ttHFnelSNUg5IJk3O34ut1.pdf" target="_blank" rel="noreferrer">Budget Statement (subsidy note) (PDF)</a>
              </li>
              <li>
                Weekly market‑linked pricing introduced <strong>July 1, 2024</strong>: 
                <a className="underline" href="https://en.sun.mv/90330" target="_blank" rel="noreferrer">Sun.mv</a> · 
                <a className="underline" href="https://atolltimes.mv/post/news/8917" target="_blank" rel="noreferrer">Atoll Times</a> · 
                <a className="underline" href="https://www.plus.mv/english/mifco-to-update-fish-purchasing-rates-weekly/" target="_blank" rel="noreferrer">Plus.mv</a>
              </li>
              <li>
                Size threshold update (≥1.5kg → ≥1.0kg) & minimum price <strong>MVR 16/kg</strong> in Dec 2025: 
                <a className="underline" href="https://en.sun.mv/101564" target="_blank" rel="noreferrer">Sun.mv</a> · 
                <a className="underline" href="https://en.mmtv.mv/7297" target="_blank" rel="noreferrer">MMTV</a> · 
                <a className="underline" href="https://mifco.mv/" target="_blank" rel="noreferrer">MIFCO (homepage)</a>
              </li>
              <li>
                Sep 16, 2023 dock‑price hike to <strong>MVR 25/kg</strong> & subsequent policy debate: 
                <a className="underline" href="https://edition.mv/news/46615" target="_blank" rel="noreferrer">Mihaaru/Edition</a>
              </li>
            </ul>
            <p className="pt-2">2025 values are indicative where noted; 2025 revenue not yet published.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
