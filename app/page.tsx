"use client";
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
  const rows = React.useMemo(() => buildRows(), []);
  return React.useMemo(() => {
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
  const [showRevenue, setShowRevenue] = React.useState(true);
  const [showSubsidy, setShowSubsidy] = React.useState(true);
  const [showGlobal, setShowGlobal] = React.useState(true);
  const [showMifcoPrice, setShowMifcoPrice] = React.useState(true);

  const latest = data[data.length - 2]; // 2025 partial; use 2024
  const prev = data[data.length - 3];   // 2023
  const priceCollapse = yoy(latest?.localPrice ?? null, prev?.localPrice ?? null);

  // Impact headline metrics
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

  // Revenue loss MVR (bn) and averages
  const rev21 = data.find((r) => r.year === "2021")?.revenueMvrMillions ?? null;
  const rev22 = data.find((r) => r.year === "2022")?.revenueMvrMillions ?? null;
  const rev23 = data.find((r) => r.year === "2023")?.revenueMvrMillions ?? null;
  const rev24 = data.find((r) => r.year === "2024")?.revenueMvrMillions ?? null;
  const revenueLossMvrM = rev23 != null && rev24 != null ? Number((rev23 - rev24).toFixed(1)) : null;
  const revenueLossMvrBn = revenueLossMvrM != null ? Number((revenueLossMvrM / 1000).toFixed(2)) : null;

  const yoy21to22 = rev21 != null && rev22 != null ? (rev22 - rev21) / rev21 : null;
  const yoy22to23 = rev22 != null && rev23 != null ? (rev23 - rev22) / rev22 : null;
  const avgYoYPct = yoy21to22 != null && yoy22to23 != null ? Number((((yoy21to22 + yoy22to23) / 2) * 100).toFixed(1)) : null;
  const cagrPct = rev21 != null && rev23 != null ? Number(((Math.pow(rev23 / rev21, 1 / 2) - 1) * 100).toFixed(1)) : null;
  const avgAnnualIncreaseMvrM = rev21 != null && rev23 != null ? Number((((rev23 - rev21) / 2).toFixed(1))) : null;

  const avgGapEx2023 = (() => {
    const rows = data.filter((r) => r.year !== "2023");
    const gaps = rows.map((r) => (r.priceGap != null ? r.priceGap : null)).filter((x) => x != null);
    if (!gaps.length) return null;
    const avg = gaps.reduce((a, b) => (a as number) + (b as number), 0 as number) / gaps.length;
    return Number(avg.toFixed(1));
  })();

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b bg-gradient-to-r from-emerald-100 via-transparent to-blue-100 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-2xl bg-emerald-100 grid place-items-center shadow-sm">🐟</span>
            <div>
              <h1 className="text-xl font-semibold">Maldives Tuna — Industry Dashboard</h1>
              <p className="text-xs text-zinc-500">Local vs global price • Subsidy & revenue • Purchases & exports</p>
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
        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-emerald-50 via-white to-white">
              <div className="p-6 grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-3">
                  <h2 className="text-2xl font-semibold">The 2023 shock and its ripple effects</h2>
                  <p className="text-sm text-zinc-600 leading-6">
                    Revenue climbed from <strong>2021 → 2023</strong>, then the <strong>Sep 2023</strong> fixed-price policy (set to 25 MVR/kg,
                    averaging ~<strong>23 MVR/kg</strong> locally) pushed procurement above export parity. The <strong>2024</strong> switch to a weekly market-linked price at <strong>14 MVR/kg</strong>
                    was the <em>reset</em>—not the cause. The damage was already done in 2023: MIFCO revenue in 2024 fell <strong>{revenueDrop != null ? `${Math.abs(revenueDrop)}%` : "46%"}</strong> (≈ <strong>{revenueLossMvrBn != null ? `${revenueLossMvrBn} bn MVR loss` : "0.93 bn MVR loss"}</strong>) vs 2023 as volumes and cashflow tightened even with higher subsidies.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
