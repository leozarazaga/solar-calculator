import type { CalculationField, CalculationInput } from './types/calculator.types'

/**
 * Assignment model parameters, mirrored from backend/src/data/solarData.json (with the
 * backend's corrections applied: price ×1000). Used only for explanatory text and for
 * splitting annual savings into its two parts; all sizing and totals come from the API.
 */
export const MODEL = {
  panelModel: 'SolarPro 450',
  panelWatt: 450,
  panelAreaM2: 2,
  pricePerKwp: 15_000,
  surplusCompensationKrPerKwh: 0.5,
} as const

/** Input limits, mirrored from backend/src/validators/calculatorValidator.ts */
export const INPUT_LIMITS: Record<Exclude<CalculationField, 'city'>, { min: number; max: number }> = {
  annualConsumption: { min: 1000, max: 100_000 },
  roofArea: { min: 4, max: 500 },
  electricityPrice: { min: 0.1, max: 10 },
}

/** The assignment's Malmö example, for the "fill example values" button */
export const EXAMPLE_INPUT: CalculationInput = {
  city: 'Malmö',
  annualConsumption: 10_000,
  roofArea: 60,
  electricityPrice: 2,
}
