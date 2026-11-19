import { Banknote, Clock, Info, LayoutGrid, Scale, TriangleAlert, Wallet } from "lucide-react";
import { useId, type ReactNode } from "react";
import { MODEL } from "../constants";
import { formatNumber, formatWarning, translations, withUnit, type Language } from "../i18n/translations";
import type { CalculationResult } from "../types/calculator.types";

interface ResultsSummaryProps {
    result: CalculationResult;
    language: Language;
    /** The price the quote was calculated with, used to split the savings */
    electricityPrice: number;
}

export function ResultsSummary({ result, language, electricityPrice }: ResultsSummaryProps) {
    const t = translations[language];
    const n = (value: number, decimals = 0) => formatNumber(value, language, decimals);
    const kr = (value: number) => t.units.currency(n(value));
    const kwh = (value: number) => withUnit(n(value), t.units.kwh);
    const percent = (value: number) => t.units.percent(n(value));
    const warningsTitleId = useId();

    // The API returns the total; the split is presentation only and uses the same formula.
    // Round one part and derive the other from the total, so the two rows always add up to it.
    const surplusCompensationKr = Math.round(result.surplusKwh * MODEL.surplusCompensationKrPerKwh);
    const directSavingsKr = result.annualSavingsKr - surplusCompensationKr;

    const production = result.annualProductionKwh;
    const selfConsumedShare = production > 0 ? (result.selfConsumedKwh / production) * 100 : 0;

    return (
        <div className="space-y-6">
            {result.warnings.length > 0 && (
                <section aria-labelledby={warningsTitleId} className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
                    <h3 id={warningsTitleId} className="flex items-center gap-2 text-sm font-semibold">
                        <TriangleAlert className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                        {t.results.warningsTitle}
                    </h3>
                    <ul className="mt-2 space-y-1.5 pl-6 text-sm">
                        {result.warnings.map((warning, index) => (
                            <li key={`${warning.code}-${index}`} className="list-disc marker:text-amber-500">
                                {formatWarning(warning, language)}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Hero KPIs, in sales priority order: savings, payback, price */}
            <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl bg-slate-900 p-5 text-white shadow-sm md:col-span-3 xl:col-span-1">
                    <KpiLabel icon={<Wallet className="size-4" />} className="text-emerald-300">
                        {t.results.annualSavings}
                    </KpiLabel>
                    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                        {t.units.currencyPerYear(n(result.annualSavingsKr))}
                    </p>
                    <p className="mt-1 text-sm text-slate-300">{t.results.annualSavingsHint}</p>
                    <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                        <BreakdownRow
                            label={t.results.directSavings}
                            detail={t.results.directSavingsDetail(n(result.selfConsumedKwh), n(electricityPrice, 2))}
                            value={kr(directSavingsKr)}
                        />
                        <BreakdownRow
                            label={t.results.surplusCompensation}
                            detail={t.results.surplusCompensationDetail(n(result.surplusKwh), n(MODEL.surplusCompensationKrPerKwh, 2))}
                            value={kr(surplusCompensationKr)}
                        />
                    </dl>
                </article>

                <KpiCard
                    icon={<Clock className="size-4 text-brand-aubergine-500" />}
                    label={t.results.payback}
                    value={result.paybackYears === null ? t.results.paybackNone : t.results.paybackValue(n(result.paybackYears, 1))}
                    hint={result.paybackYears === null ? t.results.paybackNoneHint : t.results.paybackHint}
                />

                <KpiCard
                   icon={<Banknote className="size-4 text-brand-aubergine-500" />}
                    label={t.results.installationCost}
                    value={kr(result.installationCostKr)}
                    hint={t.results.installationCostHint(n(MODEL.pricePerKwp), n(result.installedKwp, 2))}
                />
            </div>

            <p className="flex gap-2 text-sm text-slate-500">
                <Info className="mt-0.5 size-4 shrink-0 text-brand-aubergine-500" aria-hidden="true" />
                {t.results.highlightExplanation}
            </p>

            {/* System and energy balance */}
            <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <KpiLabel icon={<LayoutGrid className="size-4 text-brand-aubergine-500" />} className="text-slate-500">
                            {t.results.recommendedSystem}
                        </KpiLabel>
                        {result.isRoofLimited && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                                <TriangleAlert className="size-3" aria-hidden="true" />
                                {t.results.roofLimitedBadge}
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">{t.results.panels(result.panelCount)}</p>
                    <p className="text-sm text-slate-500">{t.results.panelModel(MODEL.panelModel, MODEL.panelWatt)}</p>
                    {result.isRoofLimited && (
                        <p className="mt-1 text-sm font-medium text-amber-800">
                            {t.results.roofLimitedDetail(result.neededPanelCount, result.maxPanelsOnRoof)}
                        </p>
                    )}
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                        <Stat label={t.results.installedKwp} value={withUnit(n(result.installedKwp, 2), t.units.kwp)} />
                        <Stat label={t.results.roofAreaUsed} value={withUnit(n(result.requiredRoofAreaM2), t.units.m2)} />
                    </dl>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                    <KpiLabel icon={<Scale className="size-4 text-brand-aubergine-500" />} className="text-slate-500">
                        {t.results.energyBalance}
                    </KpiLabel>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                        <Stat label={t.results.annualProduction} value={kwh(result.annualProductionKwh)} />
                        <Stat label={t.results.annualConsumption} value={kwh(result.annualConsumptionKwh)} />
                    </dl>

                    {/* Where the production goes: self-consumed vs sold */}
                    <div className="mt-4">
                        {production > 0 && (
                            // Both segments are parts of production, so they share its amber hue
                            <div className="mb-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
                                <div className="rounded-l-full bg-amber-600" style={{ width: `${selfConsumedShare}%` }} />
                                <div className="flex-1 rounded-r-full bg-amber-300" />
                            </div>
                        )}
                        <dl className="space-y-2 text-sm">
                            <LegendRow
                                swatch="bg-amber-600"
                                label={t.results.selfConsumed}
                                hint={t.results.selfConsumedHint}
                                value={kwh(result.selfConsumedKwh)}
                            />
                            <LegendRow
                                swatch="bg-amber-300"
                                label={t.results.surplus}
                                hint={t.results.surplusHint(n(MODEL.surplusCompensationKrPerKwh, 2))}
                                value={kwh(result.surplusKwh)}
                            />
                        </dl>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                        <Stat
                            label={t.results.selfSufficiency}
                            value={percent(result.selfSufficiencyPercentage)}
                            hint={t.results.selfSufficiencyHint}
                        />
                        <Stat label={t.results.coverage} value={percent(result.coveragePercentage)} hint={t.results.coverageHint} />
                    </dl>
                </article>
            </div>
        </div>
    );
}

function KpiLabel({ icon, className, children }: { icon: ReactNode; className: string; children: ReactNode }) {
    return (
        <h3 className={`flex items-center gap-2 text-sm font-medium ${className}`}>
            <span aria-hidden="true">{icon}</span>
            {children}
        </h3>
    );
}

function KpiCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <KpiLabel icon={icon} className="text-slate-500">
                {label}
            </KpiLabel>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-3xl">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{hint}</p>
        </article>
    );
}

function BreakdownRow({ label, detail, value }: { label: string; detail: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt>
                <span className="text-slate-100">{label}</span>
                <span className="block text-xs text-slate-400 tabular-nums">{detail}</span>
            </dt>
            <dd className="font-medium whitespace-nowrap tabular-nums">{value}</dd>
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">{value}</dd>
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
    );
}

function LegendRow({ swatch, label, hint, value }: { swatch: string; label: string; hint: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3">
            <dt className="flex gap-2">
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-sm ${swatch}`} aria-hidden="true" />
                <span>
                    <span className="font-medium text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                </span>
            </dt>
            <dd className="font-medium whitespace-nowrap text-slate-900 tabular-nums">{value}</dd>
        </div>
    );
}
