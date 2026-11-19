import { LoaderCircle, RefreshCw, RotateCcw, SunMedium, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CalculatorForm } from "../components/CalculatorForm";
import { Header } from "../components/Header";
import { MonthlyBreakdown } from "../components/MonthlyBreakdown";
import { ProductionChart } from "../components/ProductionChart";
import { ResultsSummary } from "../components/ResultsSummary";
import { useSolarCalculator } from "../hooks/useSolarCalculator";
import { DEFAULT_LANGUAGE, errorMessage, formatNumber, translations, type Language } from "../i18n/translations";
import type { ApiError } from "../services/calculatorService";
import type { CalculationInput } from "../types/calculator.types";

export function HomePage() {
    const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
    const t = translations[language];

    const {
        cities,
        citiesLoading,
        citiesError,
        retryCities,
        result,
        resultInput,
        calculating,
        error,
        fieldErrors,
        submitCalculation,
        resetResult,
    } = useSolarCalculator();

    /** Input of the last attempt, for "try again" after a network error */
    const [lastAttempt, setLastAttempt] = useState<CalculationInput | null>(null);
    const [dismissedError, setDismissedError] = useState<ApiError | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Keep <html lang> in sync for screen readers and number inputs
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    // On narrow screens the results sit below the form; bring them into view
    useEffect(() => {
        if (result && window.matchMedia("(max-width: 1023px)").matches) {
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [result]);

    const handleSubmit = (input: CalculationInput) => {
        setLastAttempt(input);
        void submitCalculation(input);
    };

    const showError = error !== null && error !== dismissedError;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Header language={language} onLanguageChange={setLanguage} />

            <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:px-8 lg:py-8">
                <aside className="lg:sticky lg:top-6 lg:self-start">
                    <CalculatorForm
                        language={language}
                        cities={cities}
                        citiesLoading={citiesLoading}
                        citiesError={citiesError !== null}
                        onRetryCities={retryCities}
                        calculating={calculating}
                        serverFieldErrors={fieldErrors}
                        onSubmit={handleSubmit}
                    />
                </aside>

                <section ref={resultsRef} aria-busy={calculating} className="min-w-0 scroll-mt-4 space-y-6">
                    {/* A short announcement instead of a live region around all results, which
                        would make screen readers read every KPI, the chart and the table */}
                    <p role="status" className="sr-only">
                        {result && !calculating
                            ? t.states.resultsReady(result.city, t.units.currencyPerYear(formatNumber(result.annualSavingsKr, language)))
                            : ""}
                    </p>
                    {showError && (
                        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                            <WifiOff className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden="true" />
                            <p className="flex-1">{errorMessage(error, language)}</p>
                            {error.isNetworkError && lastAttempt && (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(lastAttempt)}
                                    disabled={calculating}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-2.5 py-1 font-medium ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"
                                >
                                    <RefreshCw className="size-3.5" aria-hidden="true" />
                                    {t.states.retry}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setDismissedError(error)}
                                aria-label={t.states.dismiss}
                                className="shrink-0 rounded-md p-1 text-red-700 hover:bg-red-100"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    {result && resultInput ? (
                        <div className="relative">
                            {calculating && <CalculatingOverlay label={t.states.calculating} />}
                            <div className={`space-y-6 transition-opacity ${calculating ? "opacity-40" : ""}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="text-xl font-semibold">{t.results.title(result.city)}</h2>
                                    <button
                                        type="button"
                                        onClick={resetResult}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                        <RotateCcw className="size-4" aria-hidden="true" />
                                        {t.form.reset}
                                    </button>
                                </div>
                                <ResultsSummary result={result} language={language} electricityPrice={resultInput.electricityPrice} />
                                <ProductionChart months={result.monthlyBreakdown} language={language} />
                                <MonthlyBreakdown result={result} language={language} />
                            </div>
                        </div>
                    ) : calculating ? (
                        <ResultsSkeleton label={t.states.calculating} />
                    ) : (
                        <EmptyState title={t.states.emptyStateTitle} text={t.states.emptyState} />
                    )}
                </section>
            </main>
        </div>
    );
}

function EmptyState({ title, text }: { title: string; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-500" aria-hidden="true">
                <SunMedium className="size-8" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 max-w-81.25 text-sm text-slate-500">{text}</p>
        </div>
    );
}

function CalculatingOverlay({ label }: { label: string }) {
    return (
        <div className="absolute inset-x-0 top-24 z-10 flex justify-center" role="status">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                {label}
            </span>
        </div>
    );
}

function ResultsSkeleton({ label }: { label: string }) {
    return (
        <div role="status" className="space-y-6">
            <span className="sr-only">{label}</span>
            <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
            <div className="grid gap-4 md:grid-cols-3">
                <div className="h-44 animate-pulse rounded-2xl bg-slate-200 md:col-span-3 xl:col-span-1" />
                <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
                <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
            </div>
            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
    );
}
