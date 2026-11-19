import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, calculateQuote, fetchCities } from '../services/calculatorService'
import type {
  CalculationField,
  CalculationInput,
  CalculationResult,
  FieldValidationError,
} from '../types/calculator.types'

const CALCULATION_FIELDS: readonly CalculationField[] = [
  'city',
  'annualConsumption',
  'roofArea',
  'electricityPrice',
]

/** Backend validation messages (English), keyed by field. Localize via i18n by key. */
export type FieldErrors = Partial<Record<CalculationField, string>>

function toFieldErrors(errors: FieldValidationError[] = []): FieldErrors {
  const result: FieldErrors = {}
  for (const { path, msg } of errors) {
    const field = CALCULATION_FIELDS.find((name) => name === path)
    if (field && !result[field]) result[field] = msg
  }
  return result
}

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(String(error))
}

export interface UseSolarCalculator {
  cities: string[]
  citiesLoading: boolean
  citiesError: ApiError | null
  retryCities: () => void

  result: CalculationResult | null
  /** The input `result` was calculated from (always set together with it) */
  resultInput: CalculationInput | null
  calculating: boolean
  /** Last calculation error; for validation failures, fieldErrors is filled too */
  error: ApiError | null
  fieldErrors: FieldErrors
  /** Resolves to the result, or null if the request failed or was superseded */
  submitCalculation: (input: CalculationInput) => Promise<CalculationResult | null>
  resetResult: () => void
}

export function useSolarCalculator(): UseSolarCalculator {
  const [cities, setCities] = useState<string[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [citiesError, setCitiesError] = useState<ApiError | null>(null)
  const [citiesAttempt, setCitiesAttempt] = useState(0)

  // Result and the input it came from are stored together so they can never get out of sync
  const [calculation, setCalculation] = useState<{ input: CalculationInput; result: CalculationResult } | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Only the latest calculation may update state; earlier ones are aborted
  const calculationController = useRef<AbortController | null>(null)

  // Load cities on mount and again whenever retryCities() is called.
  // Loading/error are reset in retryCities (initial state covers the first load).
  useEffect(() => {
    const controller = new AbortController()

    fetchCities(controller.signal)
      .then((list) => setCities(list))
      .catch((err: unknown) => {
        const apiError = toApiError(err)
        if (!apiError.isCanceled) setCitiesError(apiError)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCitiesLoading(false)
      })

    return () => controller.abort()
  }, [citiesAttempt])

  // Abort an in-flight calculation when the component unmounts
  useEffect(() => () => calculationController.current?.abort(), [])

  const retryCities = useCallback(() => {
    setCitiesLoading(true)
    setCitiesError(null)
    setCitiesAttempt((attempt) => attempt + 1)
  }, [])

  const submitCalculation = useCallback(async (input: CalculationInput) => {
    calculationController.current?.abort()
    const controller = new AbortController()
    calculationController.current = controller

    setCalculating(true)
    setError(null)
    setFieldErrors({})

    try {
      const quote = await calculateQuote(input, controller.signal)
      setCalculation({ input, result: quote })
      return quote
    } catch (err) {
      const apiError = toApiError(err)
      if (apiError.isCanceled) return null
      setError(apiError)
      setFieldErrors(toFieldErrors(apiError.fieldErrors))
      return null
    } finally {
      if (calculationController.current === controller) {
        calculationController.current = null
        setCalculating(false)
      }
    }
  }, [])

  const resetResult = useCallback(() => {
    calculationController.current?.abort()
    calculationController.current = null
    setCalculating(false)
    setCalculation(null)
    setError(null)
    setFieldErrors({})
  }, [])

  return {
    cities,
    citiesLoading,
    citiesError,
    retryCities,
    result: calculation?.result ?? null,
    resultInput: calculation?.input ?? null,
    calculating,
    error,
    fieldErrors,
    submitCalculation,
    resetResult,
  }
}
