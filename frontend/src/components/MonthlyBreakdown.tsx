import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatNumber, monthName, translations, type Language } from "../i18n/translations";
import type { CalculationResult } from "../types/calculator.types";

interface MonthlyBreakdownProps {
    result: CalculationResult;
    language: Language;
}

export function MonthlyBreakdown({ result, language }: MonthlyBreakdownProps) {
    const t = translations[language];
    const kwh = (value: number) => formatNumber(value, language);

    const columns = [t.results.production, t.results.consumption, t.results.selfConsumed, t.results.surplus];

    // Horizontal scroll state of the table container, for the arrow indicator and sticky-column shadow
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        // 1 px tolerance: scrollLeft can be fractional on high-DPI screens
        setCanScrollLeft(el.scrollLeft > 1);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        // Fires once on observe (the initial check) and again when the container or the table
        // resizes: rotation, window resize, or a language switch changing column widths
        const observer = new ResizeObserver(updateScrollState);
        observer.observe(el);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => observer.disconnect();
    }, []);


    // Shown on the sticky month column only once columns have slid underneath it
    const stickyShadow = `transition-shadow ${canScrollLeft ? "shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]" : ""}`;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
           <div className="flex items-center justify-between px-5 pt-5">
                <h3 className="text-base font-semibold text-slate-900">{t.results.tableTitle}</h3>
                <ArrowRight
                    className={`size-4 shrink-0 text-slate-400 transition-opacity duration-300 lg:hidden ${
                        canScrollRight ? "opacity-100" : "opacity-0"
                    }`}
                    // Visual cue for touch users only; the table itself is fully readable by screen readers
                    aria-hidden="true"
                />
            </div>
            <div className="relative mt-3">
                <div ref={scrollRef} onScroll={updateScrollState} className="overflow-x-auto">
                    <table className="w-full min-w-136 text-sm tabular-nums">
                        <caption className="sr-only">{t.results.tableTitle}</caption>
                        <thead>
                            <tr className="border-y border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                                <th scope="col" className={`sticky left-0 bg-slate-50 px-5 py-2.5 ${stickyShadow}`}>
                                    {t.results.month}
                                </th>
                                {columns.map((label) => (
                                    <th key={label} scope="col" className="px-4 py-2.5 text-right whitespace-nowrap">
                                        {label} <span className="font-normal text-slate-400">({t.units.kwh})</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {result.monthlyBreakdown.map((row) => (
                                <tr key={row.month} className="group sm:hover:bg-brand-teaser/70">
                                    <th scope="row" className={`sticky left-0 bg-white px-5 py-2 text-left font-medium text-slate-800 sm:group-hover:bg-brand-teaser/70 ${stickyShadow}`}>
                                        {monthName(row.month, language, "long")}
                                    </th>
                                    <td className="px-4 py-2 text-right text-slate-700">{kwh(row.productionKwh)}</td>
                                    <td className="px-4 py-2 text-right text-slate-700">{kwh(row.consumptionKwh)}</td>
                                    <td className="px-4 py-2 text-right text-slate-700">{kwh(row.selfConsumedKwh)}</td>
                                    <td className="px-4 py-2 text-right text-slate-700">{kwh(row.surplusKwh)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            {/* Annual totals come from the API (summed before rounding), not from the rows above */}
                            <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                                <th scope="row" className={`sticky left-0 bg-slate-50 px-5 py-3 text-left ${stickyShadow}`}>
                                    {t.results.total}
                                </th>
                                <td className="px-4 py-3 text-right">{kwh(result.annualProductionKwh)}</td>
                                <td className="px-4 py-3 text-right">{kwh(result.annualConsumptionKwh)}</td>
                                <td className="px-4 py-3 text-right">{kwh(result.selfConsumedKwh)}</td>
                                <td className="px-4 py-3 text-right">{kwh(result.surplusKwh)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Right-edge fade: more columns are hidden to the right */}
                <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-white to-transparent transition-opacity duration-300 lg:hidden ${
                        canScrollRight ? "opacity-100" : "opacity-0"
                    }`}
                />
            </div>
        </section>
    );
}
