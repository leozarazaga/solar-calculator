import { describe, expect, it } from "vitest";
import {
    UnknownCityError,
    calculateSolarQuote,
    getAnnualYieldPerKwp,
    getAvailableCities,
    getMonthlyPsh,
    getNormalizedConsumptionProfile,
    getPricePerKwp,
} from "../src/services/calculatorService";

const malmoInput = {
    city: "Malmö",
    annualConsumption: 10_000,
    roofArea: 60,
    electricityPrice: 2,
};

describe("getAvailableCities", () => {
    it("returns all six cities", () => {
        expect(getAvailableCities()).toEqual([
            "Malmö",
            "Göteborg",
            "Stockholm",
            "Uppsala",
            "Sundsvall",
            "Luleå",
        ]);
    });
});

describe("data normalization", () => {
    it("normalizes the consumption profile to sum to 1", () => {
        const profile = getNormalizedConsumptionProfile();
        expect(profile).toHaveLength(12);
        expect(profile.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
        expect(profile[0]).toBeCloseTo(0.16 / 1.03, 10);
    });

    it("converts the price to kr per kWp", () => {
        expect(getPricePerKwp()).toBe(15_000);
    });

    it("corrects Göteborg's July PSH from 54 to 5.4 without warnings", () => {
        const { psh, warnings } = getMonthlyPsh("Göteborg");
        expect(psh[6]).toBeCloseTo(5.4, 10);
        expect(psh.every((value) => value <= 24)).toBe(true);
        expect(warnings).toEqual([]);
    });

    it("fills Sundsvall's missing December with 0 and warns", () => {
        const { psh, warnings } = getMonthlyPsh("Sundsvall");
        expect(psh).toHaveLength(12);
        expect(psh[10]).toBe(0.3);
        expect(psh[11]).toBe(0);
        expect(warnings).toEqual([
            {
                code: "MISSING_PSH_DATA",
                message: expect.stringContaining("December in Sundsvall"),
                params: { city: "Sundsvall", months: [12] },
            },
        ]);
    });

    it("throws for an unknown city", () => {
        expect(() => getMonthlyPsh("Atlantis")).toThrow(UnknownCityError);
    });

    it.each(["constructor", "toString", "__proto__", "hasOwnProperty"])(
        "rejects the built-in object property %s as a city",
        (name) => {
            expect(() => getMonthlyPsh(name)).toThrow(UnknownCityError);
            expect(() => calculateSolarQuote({ ...malmoInput, city: name })).toThrow(UnknownCityError);
        },
    );
});

describe("calculateSolarQuote — Malmö baseline", () => {
    const result = calculateSolarQuote(malmoInput);

    it("has an annual yield of ~1 028.67 kWh per kWp", () => {
        expect(getAnnualYieldPerKwp("Malmö")).toBeCloseTo(1028.67, 2);
    });

    it("sizes the system to 22 panels / 9.9 kWp / 44 m²", () => {
        expect(result.neededPanelCount).toBe(22);
        expect(result.maxPanelsOnRoof).toBe(30);
        expect(result.panelCount).toBe(22);
        expect(result.isRoofLimited).toBe(false);
        expect(result.installedKwp).toBe(9.9);
        expect(result.requiredRoofAreaM2).toBe(44);
        expect(result.warnings).toEqual([]);
    });

    it("produces a consistent monthly breakdown", () => {
        expect(result.monthlyBreakdown).toHaveLength(12);
        expect(result.monthlyBreakdown[0]).toMatchObject({ month: 1, monthName: "Januari" });
        expect(result.monthlyBreakdown[11]).toMatchObject({ month: 12, monthName: "December" });

        for (const month of result.monthlyBreakdown) {
            expect(month.selfConsumedKwh).toBeCloseTo(
                Math.min(month.productionKwh, month.consumptionKwh),
                1,
            );
            expect(month.selfConsumedKwh + month.surplusKwh).toBeCloseTo(month.productionKwh, 1);
            expect(month.surplusKwh).toBeGreaterThanOrEqual(0);
        }

        // January: 9.9 kWp × 1.0 h × 31 d × 0.85 ≈ 260.87 kWh, well below consumption → no surplus
        const january = result.monthlyBreakdown[0];
        expect(january.productionKwh).toBeCloseTo(260.87, 2);
        expect(january.consumptionKwh).toBeCloseTo((10_000 * 0.16) / 1.03, 2);
        expect(january.selfConsumedKwh).toBe(january.productionKwh);
        expect(january.surplusKwh).toBe(0);

        // June: 9.9 × 5.6 × 30 × 0.85 ≈ 1 413.72 kWh, far above consumption → surplus
        const june = result.monthlyBreakdown[5];
        expect(june.productionKwh).toBeCloseTo(1413.72, 2);
        expect(june.selfConsumedKwh).toBe(june.consumptionKwh);
        expect(june.surplusKwh).toBeGreaterThan(0);
    });

    it("computes totals and financials from the monthly values", () => {
        const totalOf = (key: "productionKwh" | "selfConsumedKwh" | "surplusKwh") =>
            result.monthlyBreakdown.reduce((total, month) => total + month[key], 0);

        expect(result.annualProductionKwh).toBeCloseTo(9.9 * 1028.67, 0);
        expect(result.annualProductionKwh).toBeCloseTo(totalOf("productionKwh"), 1);
        expect(result.selfConsumedKwh).toBeCloseTo(totalOf("selfConsumedKwh"), 1);
        expect(result.surplusKwh).toBeCloseTo(totalOf("surplusKwh"), 1);
        expect(result.annualConsumptionKwh).toBe(10_000);

        expect(result.installationCostKr).toBe(148_500);
        expect(result.annualSavingsKr).toBeCloseTo(
            result.selfConsumedKwh * 2 + result.surplusKwh * 0.5,
            -1,
        );
        expect(result.paybackYears).toBeCloseTo(148_500 / result.annualSavingsKr, 1);

        expect(result.productionToConsumptionRatio).toBeCloseTo(101.84, 1);
        expect(result.coveragePercentage).toBe(result.productionToConsumptionRatio);
        expect(result.selfSufficiencyPercentage).toBeCloseTo(
            (result.selfConsumedKwh / result.annualConsumptionKwh) * 100,
            1,
        );
        expect(result.selfSufficiencyPercentage).toBeLessThanOrEqual(100);
    });
});

describe("calculateSolarQuote — roof-limited", () => {
    const result = calculateSolarQuote({ ...malmoInput, roofArea: 30 });

    it("caps the system at what fits on the roof and warns", () => {
        expect(result.neededPanelCount).toBe(22);
        expect(result.maxPanelsOnRoof).toBe(15);
        expect(result.panelCount).toBe(15);
        expect(result.isRoofLimited).toBe(true);
        expect(result.installedKwp).toBe(6.75);
        expect(result.requiredRoofAreaM2).toBe(30);
        expect(result.installationCostKr).toBe(101_250);
        expect(result.warnings).toEqual([
            {
                code: "ROOF_LIMITED",
                message: expect.stringContaining("fits only 15 panels, but 22 panels are needed"),
                params: { maxPanelsOnRoof: 15, neededPanelCount: 22 },
            },
        ]);
    });

    it("returns zero panels and a null payback when the roof fits none", () => {
        const tiny = calculateSolarQuote({ ...malmoInput, roofArea: 1 });
        expect(tiny.panelCount).toBe(0);
        expect(tiny.annualProductionKwh).toBe(0);
        expect(tiny.annualSavingsKr).toBe(0);
        expect(tiny.paybackYears).toBeNull();
    });
});

describe("calculateSolarQuote — data anomalies", () => {
    it("uses the corrected July PSH for Göteborg", () => {
        const result = calculateSolarQuote({ ...malmoInput, city: "Göteborg" });
        const july = result.monthlyBreakdown[6];
        expect(july.productionKwh).toBeCloseTo(result.installedKwp * 5.4 * 31 * 0.85, 1);
        expect(result.warnings).toEqual([]);
    });

    it("handles Sundsvall's missing December gracefully", () => {
        const result = calculateSolarQuote({ ...malmoInput, city: "Sundsvall" });
        const december = result.monthlyBreakdown[11];
        expect(result.monthlyBreakdown).toHaveLength(12);
        expect(december.productionKwh).toBe(0);
        expect(december.selfConsumedKwh).toBe(0);
        expect(december.surplusKwh).toBe(0);
        expect(december.consumptionKwh).toBeGreaterThan(0);
        expect(Number.isFinite(result.paybackYears)).toBe(true);
        expect(result.warnings).toContainEqual(
            expect.objectContaining({
                code: "MISSING_PSH_DATA",
                params: { city: "Sundsvall", months: [12] },
            }),
        );
    });

    it("throws UnknownCityError for a city not in the data", () => {
        expect(() => calculateSolarQuote({ ...malmoInput, city: "Atlantis" })).toThrow(
            UnknownCityError,
        );
    });
});
