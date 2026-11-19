import { INPUT_LIMITS, MODEL } from "../constants";
import type { ApiError } from "../services/calculatorService";
import type { CalculationField, CalculationWarning } from "../types/calculator.types";

export type Language = "sv" | "en";

/** Swedish by default: the salesperson sits with a Swedish villa customer. */
export const DEFAULT_LANGUAGE: Language = "sv";

interface FieldText {
    label: string;
    placeholder: string;
    hint: string;
    unit: string;
}

export interface Translations {
    /** BCP 47 locale for Intl number formatting */
    locale: string;

    app: {
        brand: string;
        title: string;
        subtitle: string;
        languageToggleLabel: string;
        /** This language's name in itself (endonym), read by screen readers on the toggle */
        languageName: string;
        /** Short labels for the toggle buttons */
        languageShort: Record<Language, string>;
    };

    form: {
        title: string;
        description: string;
        fields: Record<CalculationField, FieldText>;
        fillExample: string;
        submit: string;
        submitting: string;
        reset: string;
    };

    /**
     * Localized validation messages, keyed by the backend's field `path`. Numeric fields receive
     * their limits already formatted (from INPUT_LIMITS) so the text never drifts from the rules.
     */
    validation: {
        city: string;
        annualConsumption: (min: string, max: string) => string;
        roofArea: (min: string, max: string) => string;
        electricityPrice: (min: string, max: string) => string;
    };

    results: {
        title: (city: string) => string;
        highlightExplanation: string;

        annualSavings: string;
        annualSavingsHint: string;
        directSavings: string;
        directSavingsDetail: (kwh: string, price: string) => string;
        surplusCompensation: string;
        surplusCompensationDetail: (kwh: string, price: string) => string;

        payback: string;
        paybackValue: (years: string) => string;
        paybackNone: string;
        paybackNoneHint: string;
        paybackHint: string;

        installationCost: string;
        installationCostHint: (pricePerKwp: string, kwp: string) => string;

        recommendedSystem: string;
        panels: (count: number) => string;
        panelModel: (model: string, watt: number) => string;
        installedKwp: string;
        roofAreaUsed: string;
        roofLimitedBadge: string;
        roofLimitedDetail: (needed: number, max: number) => string;

        energyBalance: string;
        annualProduction: string;
        annualConsumption: string;
        selfConsumed: string;
        selfConsumedHint: string;
        surplus: string;
        surplusHint: (price: string) => string;

        selfSufficiency: string;
        selfSufficiencyHint: string;
        coverage: string;
        coverageHint: string;

        chartTitle: string;
        chartDescription: string;
        chartProduction: string;
        chartConsumption: string;

        tableTitle: string;
        month: string;
        production: string;
        consumption: string;
        total: string;

        warningsTitle: string;
    };

    units: {
        kwh: string;
        kwp: string;
        m2: string;
        /** sv "45 %" (with a non-breaking space), en "45%" */
        percent: (formattedValue: string) => string;
        currency: (formattedAmount: string) => string;
        currencyPerYear: (formattedAmount: string) => string;
    };

    months: {
        short: string[];
        long: string[];
    };

    warnings: {
        roofLimited: (params: { maxPanelsOnRoof: number; neededPanelCount: number }) => string;
        missingPshData: (params: { city: string; monthList: string; monthCount: number }) => string;
    };

    states: {
        loadingCities: string;
        citiesError: string;
        retry: string;
        calculating: string;
        emptyStateTitle: string;
        emptyState: string;
        /** Screen-reader announcement when a calculation has finished */
        resultsReady: (city: string, savings: string) => string;
        networkError: string;
        validationError: string;
        serverError: string;
        genericError: string;
        dismiss: string;
    };
}

/** Non-breaking space: keeps "100 000" and "10 kWh" on one line */
const NBSP = "\u00a0";

/**
 * Fixed-decimal number for a locale. sv-SE groups thousands with a space and en-GB with a comma;
 * any space Intl emits (U+0020, U+00A0 or the narrow U+202F, depending on the browser's ICU data)
 * is normalized to U+00A0 so a number never wraps mid-digit.
 */
function formatForLocale(locale: string, value: number, decimals: number): string {
    return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        .format(value)
        .replace(/\s/g, NBSP);
}

// Model figures rendered once per locale so the text always matches MODEL
const svNumber = (value: number, decimals = 0) => formatForLocale("sv-SE", value, decimals);
const enNumber = (value: number, decimals = 0) => formatForLocale("en-GB", value, decimals);

const sv: Translations = {
    locale: "sv-SE",

    app: {
        brand: "1KOMMA5°",
        title: "Offertkalkylator för solceller",
        subtitle: "Räkna ut besparing, återbetalningstid och rätt solcellssystem tillsammans med kunden.",
        languageToggleLabel: "Välj språk",
        languageName: "Svenska",
        languageShort: { sv: "SV", en: "EN" },
    },

    form: {
        title: "Kundens uppgifter",
        description: "Fyll i fyra uppgifter om kundens hus och elförbrukning.",
        fields: {
            city: {
                label: "Ort",
                placeholder: "Välj ort",
                hint: "Närmaste ort avgör hur många soltimmar anläggningen får.",
                unit: "",
            },
            annualConsumption: {
                label: "Årlig elförbrukning",
                placeholder: "15 000",
                hint: "Står på elräkningen eller i elbolagets app.",
                unit: "kWh/år",
            },
            roofArea: {
                label: "Användbar takyta",
                placeholder: "40",
                hint: `Den del av taket som kan täckas av paneler. En panel tar ${MODEL.panelAreaM2}\u00a0m².`,
                unit: "m²",
            },
            electricityPrice: {
                label: "Elpris",
                placeholder: "2,00",
                hint: "Det kunden betalar per köpt kWh. Används för att värdera den solel hushållet använder själv.",
                unit: "kr/kWh",
            },
        },
        fillExample: "Fyll i exempelvärden",
        submit: "Beräkna",
        submitting: "Beräknar…",
        reset: "Ny beräkning",
    },

    validation: {
        city: "Välj en ort i listan.",
        annualConsumption: (min, max) => `Ange en årlig elförbrukning mellan ${min} och ${max}${NBSP}kWh.`,
        roofArea: (min, max) => `Ange en takyta mellan ${min} och ${max}${NBSP}m².`,
        electricityPrice: (min, max) => `Ange ett elpris mellan ${min} och ${max}${NBSP}kr/kWh.`,
    },

    results: {
        title: (city) => `Resultat för ${city}`,
        highlightExplanation:
            "Den årliga besparingen visas först, eftersom den svarar på kundens viktigaste fråga: " +
            "vad tjänar jag på solceller? Återbetalningstid och pris visas bredvid för att sätta " +
            "besparingen i perspektiv.",

        annualSavings: "Årlig besparing",
        annualSavingsHint: `Minskade elinköp plus ${svNumber(MODEL.surplusCompensationKrPerKwh, 2)}${NBSP}kr/kWh för överskott som säljs.`,
        directSavings: "Minskade elinköp",
        directSavingsDetail: (kwh, price) => `${kwh}${NBSP}kWh × ${price}${NBSP}kr/kWh`,
        surplusCompensation: "Ersättning för överskott",
        surplusCompensationDetail: (kwh, price) => `${kwh}${NBSP}kWh × ${price}${NBSP}kr/kWh`,

        payback: "Återbetalningstid",
        paybackValue: (years) => `${years}${NBSP}år`,
        paybackNone: "Ingen återbetalning",
        paybackNoneHint: "Med de här uppgifterna ger anläggningen ingen besparing.",
        paybackHint: "Installationspris delat med årlig besparing.",

        installationCost: "Installationspris",
        installationCostHint: (pricePerKwp, kwp) => `${pricePerKwp}${NBSP}kr/kWp × ${kwp}${NBSP}kWp`,

        recommendedSystem: "Rekommenderad anläggning",
        panels: (count) => `${count}${NBSP}${count === 1 ? "panel" : "paneler"}`,
        panelModel: (model, watt) => `${model}, ${watt}${NBSP}W per panel`,
        installedKwp: "Effekt",
        roofAreaUsed: "Takyta som används",
        roofLimitedBadge: "Begränsad av takytan",
        roofLimitedDetail: (needed, max) => `${needed} paneler behövs, ${max} får plats`,

        energyBalance: "Energibalans",
        annualProduction: "Årlig produktion",
        annualConsumption: "Årlig förbrukning",
        selfConsumed: "Egenanvändning",
        selfConsumedHint: "Solel som hushållet använder direkt och slipper köpa.",
        surplus: "Överskott",
        surplusHint: (price) => `Solel som säljs till elnätet för ${price}${NBSP}kr/kWh.`,

        selfSufficiency: "Självförsörjningsgrad",
        selfSufficiencyHint: "Andel av hushållets elbehov som täcks direkt av egen solel.",
        coverage: "Täckningsgrad",
        coverageHint: `Årsproduktion i förhållande till årsförbrukning. Kan bli över 100${NBSP}%.`,

        chartTitle: "Produktion och förbrukning per månad",
        chartDescription: "Sommarens överskott säljs, vinterns underskott köps från elnätet.",
        chartProduction: "Produktion",
        chartConsumption: "Förbrukning",

        tableTitle: "Månad för månad",
        month: "Månad",
        production: "Produktion",
        consumption: "Förbrukning",
        total: "Totalt",

        warningsTitle: "Bra att veta",
    },

    units: {
        kwh: "kWh",
        kwp: "kWp",
        m2: "m²",
        percent: (value) => `${value}${NBSP}%`,
        currency: (amount) => `${amount}${NBSP}kr`,
        currencyPerYear: (amount) => `${amount}${NBSP}kr/år`,
    },

    months: {
        short: ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"],
        long: ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"],
    },

    warnings: {
        roofLimited: ({ maxPanelsOnRoof, neededPanelCount }) =>
            `Taket rymmer bara ${maxPanelsOnRoof} paneler, men det behövs ${neededPanelCount} för att ` +
            `täcka hela årsförbrukningen. Beräkningen bygger därför på ${maxPanelsOnRoof} paneler.`,
        missingPshData: ({ city, monthList, monthCount }) =>
            `Soldata saknas för ${monthList} i ${city}. Produktionen för ` +
            `${monthCount === 1 ? "den månaden" : "de månaderna"} räknas som 0${NBSP}kWh, ` +
            `så årsproduktionen kan vara något underskattad.`,
    },

    states: {
        loadingCities: "Hämtar orter…",
        citiesError: "Det gick inte att hämta listan med orter.",
        retry: "Försök igen",
        calculating: "Beräknar…",
        emptyStateTitle: "Redo att räkna",
        emptyState: "Fyll i kundens uppgifter för att se besparing, återbetalningstid och rekommenderad anläggning.",
        resultsReady: (city, savings) => `Beräkningen för ${city} är klar. Årlig besparing: ${savings}.`,
        networkError: "Det går inte att nå servern. Kontrollera att backend är igång och försök igen.",
        validationError: "Kontrollera de markerade fälten.",
        serverError: "Något gick fel på servern. Försök igen om en stund.",
        genericError: "Något gick fel. Försök igen.",
        dismiss: "Stäng",
    },
};

const en: Translations = {
    locale: "en-GB",

    app: {
        brand: "1KOMMA5°",
        title: "Solar quote calculator",
        subtitle: "Calculate savings, payback time and the right solar system together with the customer.",
        languageToggleLabel: "Choose language",
        languageName: "English",
        languageShort: { sv: "SV", en: "EN" },
    },

    form: {
        title: "Customer details",
        description: "Enter four details about the customer’s house and electricity use.",
        fields: {
            city: {
                label: "City",
                placeholder: "Select a city",
                hint: "The nearest city determines how many sun hours the system gets.",
                unit: "",
            },
            annualConsumption: {
                label: "Annual electricity consumption",
                placeholder: "15,000",
                hint: "Shown on the electricity bill or in the supplier’s app.",
                unit: "kWh/year",
            },
            roofArea: {
                label: "Usable roof area",
                placeholder: "40",
                hint: `The part of the roof that can hold panels. One panel takes ${MODEL.panelAreaM2}\u00a0m².`,
                unit: "m²",
            },
            electricityPrice: {
                label: "Electricity price",
                placeholder: "2.00",
                hint: "What the customer pays per purchased kWh. Used to value the solar power the household uses itself.",
                unit: "SEK/kWh",
            },
        },
        fillExample: "Fill example values",
        submit: "Calculate",
        submitting: "Calculating…",
        reset: "New calculation",
    },

    validation: {
        city: "Please select a city from the list.",
        annualConsumption: (min, max) => `Enter an annual consumption between ${min} and ${max}${NBSP}kWh.`,
        roofArea: (min, max) => `Enter a roof area between ${min} and ${max}${NBSP}m².`,
        electricityPrice: (min, max) => `Enter an electricity price between ${min} and ${max}${NBSP}SEK/kWh.`,
    },

    results: {
        title: (city) => `Results for ${city}`,
        highlightExplanation:
            "Annual savings are shown first because they answer the customer’s most important " +
            "question: what do I gain from solar panels? Payback time and price sit next to them " +
            "to put the savings in perspective.",

        annualSavings: "Annual savings",
        annualSavingsHint: `Lower electricity purchases plus ${enNumber(MODEL.surplusCompensationKrPerKwh, 2)}${NBSP}SEK/kWh for surplus sold to the grid.`,
        directSavings: "Lower electricity purchases",
        directSavingsDetail: (kwh, price) => `${kwh}${NBSP}kWh × ${price}${NBSP}SEK/kWh`,
        surplusCompensation: "Surplus compensation",
        surplusCompensationDetail: (kwh, price) => `${kwh}${NBSP}kWh × ${price}${NBSP}SEK/kWh`,

        payback: "Payback time",
        paybackValue: (years) => `${years}${NBSP}years`,
        paybackNone: "No payback",
        paybackNoneHint: "With these inputs the system produces no savings.",
        paybackHint: "Installation price divided by annual savings.",

        installationCost: "Installation price",
        installationCostHint: (pricePerKwp, kwp) => `${pricePerKwp}${NBSP}SEK/kWp × ${kwp}${NBSP}kWp`,

        recommendedSystem: "Recommended system",
        panels: (count) => `${count}${NBSP}${count === 1 ? "panel" : "panels"}`,
        panelModel: (model, watt) => `${model}, ${watt}${NBSP}W per panel`,
        installedKwp: "Capacity",
        roofAreaUsed: "Roof area used",
        roofLimitedBadge: "Limited by roof area",
        roofLimitedDetail: (needed, max) => `${needed} panels needed, ${max} fit`,

        energyBalance: "Energy balance",
        annualProduction: "Annual production",
        annualConsumption: "Annual consumption",
        selfConsumed: "Self-consumption",
        selfConsumedHint: "Solar power the household uses directly instead of buying it.",
        surplus: "Surplus",
        surplusHint: (price) => `Solar power sold to the grid for ${price}${NBSP}SEK/kWh.`,

        selfSufficiency: "Self-sufficiency",
        selfSufficiencyHint: "Share of the household’s electricity needs covered directly by its own solar power.",
        coverage: "Coverage",
        coverageHint: "Annual production relative to annual consumption. Can exceed 100%.",

        chartTitle: "Production and consumption per month",
        chartDescription: "Summer surplus is sold; the winter shortfall is bought from the grid.",
        chartProduction: "Production",
        chartConsumption: "Consumption",

        tableTitle: "Month by month",
        month: "Month",
        production: "Production",
        consumption: "Consumption",
        total: "Total",

        warningsTitle: "Good to know",
    },

    units: {
        kwh: "kWh",
        kwp: "kWp",
        m2: "m²",
        percent: (value) => `${value}%`,
        currency: (amount) => `${amount}${NBSP}SEK`,
        // Regular space: lets "SEK/year" wrap below the large amount in the narrow savings card
        currencyPerYear: (amount) => `${amount} SEK/year`,
    },

    months: {
        short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        long: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    },

    warnings: {
        roofLimited: ({ maxPanelsOnRoof, neededPanelCount }) =>
            `The roof only fits ${maxPanelsOnRoof} panels, but ${neededPanelCount} are needed to cover ` +
            `the full annual consumption. The calculation is therefore based on ${maxPanelsOnRoof} panels.`,
        missingPshData: ({ city, monthList, monthCount }) =>
            `Solar data is missing for ${monthList} in ${city}. Production for ` +
            `${monthCount === 1 ? "that month" : "those months"} is counted as 0${NBSP}kWh, ` +
            `so annual production may be slightly underestimated.`,
    },

    states: {
        loadingCities: "Loading cities…",
        citiesError: "Could not load the list of cities.",
        retry: "Try again",
        calculating: "Calculating…",
        emptyStateTitle: "Ready to calculate",
        emptyState: "Fill in the customer’s details to see savings, payback time and the recommended system.",
        resultsReady: (city, savings) => `The calculation for ${city} is ready. Annual savings: ${savings}.`,
        networkError: "Cannot reach the server. Check that the backend is running and try again.",
        validationError: "Please check the highlighted fields.",
        serverError: "Something went wrong on the server. Please try again shortly.",
        genericError: "Something went wrong. Please try again.",
        dismiss: "Dismiss",
    },
};

export const translations: Record<Language, Translations> = { sv, en };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Locale-aware number; `decimals` fixes the number of fraction digits shown.
 * sv: "100 000", "0,10"; en: "100,000", "0.10". Group spaces are non-breaking.
 */
export function formatNumber(value: number, language: Language, decimals = 0): string {
    return formatForLocale(translations[language].locale, value, decimals);
}

/** Joins a formatted value and its unit with a non-breaking space: "10 184 kWh" never wraps. */
export function withUnit(formattedValue: string, unit: string): string {
    return `${formattedValue}${NBSP}${unit}`;
}

/**
 * Parses a number typed by the user. Accepts the formats `formatNumber` produces and common variants:
 * sv "15 000", "2,5", "2.5"; en "15,000", "15 000", "2.5". Spaces (including non-breaking) are ignored.
 * With both "," and ".", the last one is the decimal separator. A lone "," is a thousands separator
 * only in English and only in a grouped pattern like "15,000"; otherwise it is a decimal comma.
 * Returns NaN for empty or invalid input.
 */
export function parseNumber(raw: string, language: Language): number {
    let text = raw.replace(/\s/g, "");
    if (text === "") return Number.NaN;

    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
        const decimal = lastComma > lastDot ? "," : ".";
        const group = decimal === "," ? "." : ",";
        text = text.split(group).join("").replace(decimal, ".");
    } else if (lastComma !== -1) {
        const isGrouped = language === "en" && /^-?\d{1,3}(,\d{3})+$/.test(text);
        text = isGrouped ? text.split(",").join("") : text.replace(",", ".");
    }

    // Number() would accept "", "0x10" or "1e3"; allow plain decimals only
    return /^-?\d+(\.\d+)?$/.test(text) || /^-?\.\d+$/.test(text) ? Number(text) : Number.NaN;
}

/** Month name for month 1–12 */
export function monthName(month: number, language: Language, style: "short" | "long" = "short"): string {
    return translations[language].months[style][month - 1] ?? String(month);
}

function isNumberArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((item) => typeof item === "number");
}

/** Localized warning text built from `code` + `params`; falls back to the backend message. */
export function formatWarning(warning: CalculationWarning, language: Language): string {
    const t = translations[language];
    const params = warning.params ?? {};

    if (warning.code === "ROOF_LIMITED") {
        const { maxPanelsOnRoof, neededPanelCount } = params;
        if (typeof maxPanelsOnRoof === "number" && typeof neededPanelCount === "number") {
            return t.warnings.roofLimited({ maxPanelsOnRoof, neededPanelCount });
        }
    }

    if (warning.code === "MISSING_PSH_DATA") {
        const { city, months } = params;
        if (typeof city === "string" && isNumberArray(months)) {
            const names = months.map((m) => {
                const name = monthName(m, language, "long");
                // Swedish month names are lowercase mid-sentence; English ones stay capitalized
                return language === "sv" ? name.toLocaleLowerCase(t.locale) : name;
            });
            const monthList = new Intl.ListFormat(t.locale, { type: "conjunction" }).format(names);
            return t.warnings.missingPshData({ city, monthList, monthCount: months.length });
        }
    }

    return warning.message;
}

/** Fraction digits used when showing a field's limits (prices in öre precision) */
const LIMIT_DECIMALS: Record<keyof typeof INPUT_LIMITS, number> = {
    annualConsumption: 0,
    roofArea: 0,
    electricityPrice: 2,
};

/** Localized message for a field with a validation error, with limits from INPUT_LIMITS. */
export function fieldErrorMessage(field: CalculationField, language: Language): string {
    const { validation } = translations[language];
    if (field === "city") return validation.city;
    const { min, max } = INPUT_LIMITS[field];
    const decimals = LIMIT_DECIMALS[field];
    return validation[field](formatNumber(min, language, decimals), formatNumber(max, language, decimals));
}

/** Localized top-level message for a failed API call. */
export function errorMessage(error: ApiError, language: Language): string {
    const { states } = translations[language];
    if (error.isNetworkError) return states.networkError;
    if (error.fieldErrors?.length) return states.validationError;
    if (error.status !== undefined && error.status >= 500) return states.serverError;
    return states.genericError;
}
