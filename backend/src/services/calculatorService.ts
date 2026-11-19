import rawSolarData from "../data/solarData.json";
import type {
    CalculationInput,
    CalculationResult,
    CalculationWarning,
    MonthlyBreakdown,
    SolarData,
} from "../types/calculator.types";

const solarData: SolarData = rawSolarData;

const DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Used only in English warning messages; the frontend localizes via warning params. */
const ENGLISH_MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

/** Returned as `monthName` in the monthly breakdown. */
const MONTH_NAMES = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

/** A day has at most 24 hours of sun; anything above is a misplaced decimal (54 -> 5.4). */
const MAX_PLAUSIBLE_PSH = 24;

/** The source data gives the price in thousands of kr (15 -> 15 000 kr/kWp). */
const PRICE_PER_KWP_MULTIPLIER = 1000;

export class UnknownCityError extends Error {
    readonly status = 400;

    constructor(city: string) {
        super(`Unknown city: ${city}. Available cities: ${getAvailableCities().join(", ")}.`);
        this.name = "UnknownCityError";
    }
}

// ---------------------------------------------------------------------------
// Data normalization helpers (the raw JSON is never modified)
// ---------------------------------------------------------------------------

/** Monthly consumption shares scaled so the 12 months sum to exactly 1.0. */
export function getNormalizedConsumptionProfile(): number[] {
    const profile = solarData.forbrukningsprofil;
    const sum = profile.reduce((total, share) => total + share, 0);
    return profile.map((share) => share / sum);
}

/** Installation price in kr per kWp. */
export function getPricePerKwp(): number {
    return solarData.parametrar.pris_per_kwp * PRICE_PER_KWP_MULTIPLIER;
}

/**
 * Twelve monthly PSH values for a city. Implausible values (> 24 h/day) are
 * divided by 10, and missing months are set to 0 with a warning.
 */
export function getMonthlyPsh(city: string): { psh: number[]; warnings: CalculationWarning[] } {
    // Object.hasOwn, not a plain lookup: names like "constructor" or "toString"
    // exist on every object's prototype and must not count as cities.
    if (!Object.hasOwn(solarData.psh_per_stad, city)) {
        throw new UnknownCityError(city);
    }
    const raw = solarData.psh_per_stad[city];

    const warnings: CalculationWarning[] = [];
    const missingMonths: number[] = [];

    const psh = DAYS_PER_MONTH.map((_days, i) => {
        const value = raw[i];
        if (value === undefined) {
            missingMonths.push(i + 1);
            return 0;
        }
        return value > MAX_PLAUSIBLE_PSH ? value / 10 : value;
    });

    if (missingMonths.length > 0) {
        const monthList = missingMonths.map((month) => ENGLISH_MONTH_NAMES[month - 1]).join(", ");
        warnings.push({
            code: "MISSING_PSH_DATA",
            message:
                `Peak sun hours (PSH) data is missing for ${monthList} in ${city}. ` +
                `Production for ${missingMonths.length === 1 ? "that month" : "those months"} ` +
                `is set to 0 kWh, so annual production may be slightly underestimated.`,
            params: { city, months: missingMonths },
        });
    }

    return { psh, warnings };
}

/**
 * Production (kWh) of a 1 kWp system for each month: PSH × days × PR.
 * The single source of truth for the production formula, used for both sizing
 * and the monthly breakdown.
 */
function getMonthlyYieldPerKwp(psh: number[]): number[] {
    const pr = solarData.parametrar.pr;
    return psh.map((hours, i) => hours * DAYS_PER_MONTH[i] * pr);
}

function sumOf(values: number[]): number {
    return values.reduce((total, value) => total + value, 0);
}

/** Annual production (kWh) of a 1 kWp system in the given city. */
export function getAnnualYieldPerKwp(city: string): number {
    return sumOf(getMonthlyYieldPerKwp(getMonthlyPsh(city).psh));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAvailableCities(): string[] {
    return Object.keys(solarData.psh_per_stad);
}

export function calculateSolarQuote(input: CalculationInput): CalculationResult {
    const { city, annualConsumption, roofArea, electricityPrice } = input;
    const { ersattning_overskott_kr_kwh: surplusCompensation } = solarData.parametrar;
    const panelKwp = solarData.panel.effekt_w / 1000;
    const panelAreaM2 = solarData.panel.yta_m2;

    const { psh, warnings } = getMonthlyPsh(city);
    const profile = getNormalizedConsumptionProfile();
    const monthlyYieldPerKwp = getMonthlyYieldPerKwp(psh);

    // Sizing
    const annualYieldPerKwp = sumOf(monthlyYieldPerKwp);
    if (annualYieldPerKwp <= 0) {
        // Only possible with broken source data; surfaces as a 500, never as Infinity panels
        throw new Error(`No solar yield data for ${city}`);
    }
    const kwpNeeded = annualConsumption / annualYieldPerKwp;
    const neededPanelCount = Math.ceil(kwpNeeded / panelKwp);
    const maxPanelsOnRoof = Math.floor(roofArea / panelAreaM2);
    const panelCount = Math.min(neededPanelCount, maxPanelsOnRoof);
    const isRoofLimited = neededPanelCount > maxPanelsOnRoof;
    const installedKwp = panelCount * panelKwp;
    const requiredRoofAreaM2 = panelCount * panelAreaM2;

    if (isRoofLimited) {
        warnings.push({
            code: "ROOF_LIMITED",
            message:
                `The roof fits only ${maxPanelsOnRoof} panels, but ${neededPanelCount} panels are ` +
                `needed to cover the annual consumption. The system is limited to ${maxPanelsOnRoof} panels.`,
            params: { maxPanelsOnRoof, neededPanelCount },
        });
    }

    // Monthly energy balance (unrounded; rounding happens only on output)
    const months = monthlyYieldPerKwp.map((yieldPerKwp, i) => {
        const productionKwh = installedKwp * yieldPerKwp;
        const consumptionKwh = annualConsumption * profile[i];
        const selfConsumedKwh = Math.min(productionKwh, consumptionKwh);
        const surplusKwh = productionKwh - selfConsumedKwh;
        return { productionKwh, consumptionKwh, selfConsumedKwh, surplusKwh };
    });

    const totalProduction = sumOf(months.map((month) => month.productionKwh));
    const totalSelfConsumed = sumOf(months.map((month) => month.selfConsumedKwh));
    const totalSurplus = sumOf(months.map((month) => month.surplusKwh));

    // Financials
    const installationCostKr = installedKwp * getPricePerKwp();
    const annualSavingsKr = totalSelfConsumed * electricityPrice + totalSurplus * surplusCompensation;
    // null rather than 0: with no savings the system never pays back
    const paybackYears = annualSavingsKr > 0 ? installationCostKr / annualSavingsKr : null;

    const productionToConsumptionRatio = (totalProduction / annualConsumption) * 100;
    const selfSufficiencyPercentage = (totalSelfConsumed / annualConsumption) * 100;

    const monthlyBreakdown: MonthlyBreakdown[] = months.map((month, i) => ({
        month: i + 1,
        monthName: MONTH_NAMES[i],
        productionKwh: round(month.productionKwh),
        consumptionKwh: round(month.consumptionKwh),
        selfConsumedKwh: round(month.selfConsumedKwh),
        surplusKwh: round(month.surplusKwh),
    }));

    return {
        city,
        panelCount,
        neededPanelCount,
        maxPanelsOnRoof,
        isRoofLimited,
        installedKwp: round(installedKwp),
        requiredRoofAreaM2: round(requiredRoofAreaM2),
        annualProductionKwh: round(totalProduction),
        annualConsumptionKwh: round(annualConsumption),
        selfConsumedKwh: round(totalSelfConsumed),
        surplusKwh: round(totalSurplus),
        coveragePercentage: round(productionToConsumptionRatio),
        productionToConsumptionRatio: round(productionToConsumptionRatio),
        selfSufficiencyPercentage: round(selfSufficiencyPercentage),
        installationCostKr: Math.round(installationCostKr),
        annualSavingsKr: Math.round(annualSavingsKr),
        paybackYears: paybackYears === null ? null : round(paybackYears),
        monthlyBreakdown,
        warnings,
    };
}

function round(value: number, decimals = 2): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
