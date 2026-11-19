import { Calculator, ChevronDown, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { useId, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { EXAMPLE_INPUT, INPUT_LIMITS } from "../constants";
import type { FieldErrors } from "../hooks/useSolarCalculator";
import { fieldErrorMessage, formatNumber, parseNumber, translations, type Language } from "../i18n/translations";
import type { CalculationField, CalculationInput } from "../types/calculator.types";

type NumericField = Exclude<CalculationField, "city">;
type FormValues = Record<CalculationField, string>;

const FIELD_ORDER: CalculationField[] = ["city", "annualConsumption", "roofArea", "electricityPrice"];
const NUMERIC_FIELDS: NumericField[] = ["annualConsumption", "roofArea", "electricityPrice"];

const EMPTY_VALUES: FormValues = { city: "", annualConsumption: "", roofArea: "", electricityPrice: "" };

function validate(values: FormValues, cities: string[], language: Language): Set<CalculationField> {
    const invalid = new Set<CalculationField>();
    if (!cities.includes(values.city)) invalid.add("city");
    for (const field of NUMERIC_FIELDS) {
        const value = parseNumber(values[field], language);
        const { min, max } = INPUT_LIMITS[field];
        if (!Number.isFinite(value) || value < min || value > max) invalid.add(field);
    }
    return invalid;
}

interface CalculatorFormProps {
    language: Language;
    cities: string[];
    citiesLoading: boolean;
    citiesError: boolean;
    onRetryCities: () => void;
    calculating: boolean;
    /** Validation errors returned by the backend (shown until the field is edited) */
    serverFieldErrors: FieldErrors;
    onSubmit: (input: CalculationInput) => void;
}

export function CalculatorForm({
    language,
    cities,
    citiesLoading,
    citiesError,
    onRetryCities,
    calculating,
    serverFieldErrors,
    onSubmit,
}: CalculatorFormProps) {
    const t = translations[language];
    const idPrefix = useId();
    const fieldRefs = useRef<Partial<Record<CalculationField, HTMLInputElement | HTMLSelectElement | null>>>({});

    const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
    const [clientErrors, setClientErrors] = useState<Set<CalculationField>>(new Set());

    // Server errors are shown until the field is edited; a new error set shows them all again
    const [seenServerErrors, setSeenServerErrors] = useState(serverFieldErrors);
    const [editedFields, setEditedFields] = useState<Set<CalculationField>>(new Set());
    if (seenServerErrors !== serverFieldErrors) {
        setSeenServerErrors(serverFieldErrors);
        setEditedFields(new Set());
    }

    const hasError = (field: CalculationField) => clientErrors.has(field) || (Boolean(serverFieldErrors[field]) && !editedFields.has(field));

    const updateField = (field: CalculationField, value: string) => {
        setValues((current) => ({ ...current, [field]: value }));
        setEditedFields((current) => new Set(current).add(field));
        if (clientErrors.has(field)) {
            setClientErrors((current) => {
                const next = new Set(current);
                next.delete(field);
                return next;
            });
        }
    };

    const fillExample = () => {
        // Shown in the current language's format ("10 000", "2,00" / "10,000", "2.00")
        setValues({
            city: EXAMPLE_INPUT.city,
            annualConsumption: formatNumber(EXAMPLE_INPUT.annualConsumption, language),
            roofArea: formatNumber(EXAMPLE_INPUT.roofArea, language),
            electricityPrice: formatNumber(EXAMPLE_INPUT.electricityPrice, language, 2),
        });
        setClientErrors(new Set());
        setEditedFields(new Set(FIELD_ORDER));
    };

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        const invalid = validate(values, cities, language);
        setClientErrors(invalid);
        if (invalid.size > 0) {
            const firstInvalid = FIELD_ORDER.find((field) => invalid.has(field));
            if (firstInvalid) fieldRefs.current[firstInvalid]?.focus();
            return;
        }
        onSubmit({
            city: values.city,
            annualConsumption: parseNumber(values.annualConsumption, language),
            roofArea: parseNumber(values.roofArea, language),
            electricityPrice: parseNumber(values.electricityPrice, language),
        });
    };

    const citiesReady = !citiesLoading && !citiesError;
    const inputId = (field: CalculationField) => `${idPrefix}-${field}`;
    // Field renders either the hint or the error, so point at whichever one exists
    const describedBy = (field: CalculationField) => `${inputId(field)}-${hasError(field) ? "error" : "hint"}`;

    return (
        <form
            noValidate
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            aria-busy={calculating}
        >
            <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{t.form.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{t.form.description}</p>
                </div>
            </div>

            <div className="space-y-5">
                <Field
                    id={inputId("city")}
                    // While cities load or fail there is no <select> for the label to point at
                    hasControl={citiesReady}
                    label={t.form.fields.city.label}
                    hint={t.form.fields.city.hint}
                    error={hasError("city") ? fieldErrorMessage("city", language) : undefined}
                >
                    {citiesLoading ? (
                        <div
                            role="status"
                            className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                        >
                            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                            {t.states.loadingCities}
                        </div>
                    ) : citiesError ? (
                        <div
                            role="alert"
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                        >
                            <span>{t.states.citiesError}</span>
                            <button
                                type="button"
                                onClick={onRetryCities}
                                className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 font-medium text-red-800 ring-1 ring-red-200 hover:bg-red-100"
                            >
                                <RefreshCw className="size-3.5" aria-hidden="true" />
                                {t.states.retry}
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <select
                                id={inputId("city")}
                                ref={(el) => {
                                    fieldRefs.current.city = el;
                                }}
                                value={values.city}
                                onChange={(event) => updateField("city", event.target.value)}
                                aria-invalid={hasError("city")}
                                aria-describedby={describedBy("city")}
                                className={`${inputClass(hasError("city"))} appearance-none pr-10`}
                            >
                                <option value="" disabled>
                                    {t.form.fields.city.placeholder}
                                </option>
                                {cities.map((city) => (
                                    <option key={city} value={city}>
                                        {city}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </Field>

                {NUMERIC_FIELDS.map((field) => {
                    const text = t.form.fields[field];
                    const error = hasError(field);
                    return (
                        <Field
                            key={field}
                            id={inputId(field)}
                            label={text.label}
                            hint={text.hint}
                            error={error ? fieldErrorMessage(field, language) : undefined}
                        >
                            <div className="relative">
                                <input
                                    id={inputId(field)}
                                    ref={(el) => {
                                        fieldRefs.current[field] = el;
                                    }}
                                    // Text, not type="number": number inputs reject "15 000" and, in some
                                    // browsers, "2,5"; parseNumber handles both. inputMode keeps the
                                    // numeric keyboard on phones.
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder={text.placeholder}
                                    value={values[field]}
                                    onChange={(event) => updateField(field, event.target.value)}
                                    aria-invalid={error}
                                    aria-describedby={describedBy(field)}
                                    className={`${inputClass(error)} pr-20 tabular-nums`}
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
                                    {text.unit}
                                </span>
                            </div>
                        </Field>
                    );
                })}
            </div>

            {/* Stacked: the form column is narrow on desktop, and full-width buttons suit touch screens */}
            <div className="mt-6 flex flex-col gap-3">
                <button
                    type="submit"
                    disabled={calculating || !citiesReady}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-aubergine-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-aubergine-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-aubergine-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 cursor-pointer"
                >
                    {calculating ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <Calculator className="size-4" aria-hidden="true" />
                    )}
                    {calculating ? t.form.submitting : t.form.submit}
                </button>
                <button
                    type="button"
                    onClick={fillExample}
                    disabled={calculating || !citiesReady}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-aubergine-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                    <Sparkles className="size-4 text-brand-aubergine-500" aria-hidden="true" />
                    {t.form.fillExample}
                </button>
            </div>
        </form>
    );
}

function inputClass(invalid: boolean): string {
    return `block h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900 shadow-xs transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 sm:text-sm ${
        invalid ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-brand-aubergine-500 focus:ring-purple-100"
    }`;
}

interface FieldProps {
    id: string;
    /** False while the control is not rendered (e.g. cities loading), so no label points at a missing id */
    hasControl?: boolean;
    label: string;
    hint: string;
    error?: string;
    children: ReactNode;
}

function Field({ id, hasControl = true, label, hint, error, children }: FieldProps) {
    const labelClass = "mb-1.5 block text-sm font-medium text-slate-800";
    return (
        <div>
            {hasControl ? (
                <label htmlFor={id} className={labelClass}>
                    {label}
                </label>
            ) : (
                <p className={labelClass}>{label}</p>
            )}
            {children}
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
                    {error}
                </p>
            ) : (
                <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
                    {hint}
                </p>
            )}
        </div>
    );
}
