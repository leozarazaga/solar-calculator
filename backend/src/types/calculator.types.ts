/**
 * Shape of `src/data/solarData.json`. Keys mirror the source data exactly (Swedish).
 *
 * Arrays are typed as `number[]` rather than 12-element tuples because the JSON
 * import is inferred as `number[]`, and the source data is not guaranteed to be
 * well-formed (e.g. one city has only 11 monthly values). Length and range checks
 * belong in runtime validation, not in these types.
 */
export interface SolarData {
    parametrar: {
        /** Performance ratio (system losses), 0–1 */
        pr: number;
        /** Installation price per installed kWp (kr) */
        pris_per_kwp: number;
        /** Compensation for surplus electricity sold to the grid (kr/kWh) */
        ersattning_overskott_kr_kwh: number;
    };
    panel: {
        modell: string;
        /** Rated power per panel (W) */
        effekt_w: number;
        /** Area per panel (m²) */
        yta_m2: number;
    };
    /** Share of annual consumption per month, January–December */
    forbrukningsprofil: number[];
    /** Peak sun hours per day, per month (January–December), keyed by city name */
    psh_per_stad: Record<string, number[]>;
}

export interface CalculationInput {
    city: string;
    /** Annual household electricity consumption (kWh) */
    annualConsumption: number;
    /** Usable roof area (m²) */
    roofArea: number;
    /** Electricity price paid by the household (kr/kWh) */
    electricityPrice: number;
}

export interface MonthlyBreakdown {
    /** 1–12 */
    month: number;
    monthName: string;
    productionKwh: number;
    consumptionKwh: number;
    /** Production used directly by the household: min(production, consumption) */
    selfConsumedKwh: number;
    /** Production exported to the grid: max(production − consumption, 0) */
    surplusKwh: number;
}

export interface CalculationResult {
    city: string;

    /** Panels actually installed: min(neededPanelCount, maxPanelsOnRoof) */
    panelCount: number;
    /** Panels required to cover annual consumption, ignoring roof size */
    neededPanelCount: number;
    /** Panels that physically fit on the given roof area */
    maxPanelsOnRoof: number;
    /** True when the roof area caps the system below neededPanelCount */
    isRoofLimited: boolean;
    /** Installed capacity (kWp) */
    installedKwp: number;
    /** Roof area occupied by the installed panels (m²) */
    requiredRoofAreaM2: number;

    annualProductionKwh: number;
    annualConsumptionKwh: number;
    selfConsumedKwh: number;
    surplusKwh: number;

    /** Headline coverage figure; equal to productionToConsumptionRatio */
    coveragePercentage: number;
    /** Annual production ÷ annual consumption × 100 (can exceed 100) */
    productionToConsumptionRatio: number;
    /** Self-consumed ÷ annual consumption × 100 (at most 100) */
    selfSufficiencyPercentage: number;

    installationCostKr: number;
    /** Avoided purchases (self-consumed × price) + surplus compensation (kr/year) */
    annualSavingsKr: number;
    /** installationCostKr ÷ annualSavingsKr; null when savings are zero */
    paybackYears: number | null;

    monthlyBreakdown: MonthlyBreakdown[];
    warnings: CalculationWarning[];
}

/**
 * Non-fatal issues with a calculation. `code` and `params` are the stable contract:
 * the frontend renders localized (Swedish/English) text from them. `message` is an
 * English fallback for developers and API consumers.
 */
export type CalculationWarning =
    | {
          code: "ROOF_LIMITED";
          message: string;
          params: { maxPanelsOnRoof: number; neededPanelCount: number };
      }
    | {
          code: "MISSING_PSH_DATA";
          message: string;
          /** months: 1–12, the months with no PSH value (production set to 0) */
          params: { city: string; months: number[] };
      };

export type CalculationWarningCode = CalculationWarning["code"];
