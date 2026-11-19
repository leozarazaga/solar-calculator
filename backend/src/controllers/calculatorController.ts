import type { NextFunction, Request, Response } from "express";
import { matchedData, validationResult } from "express-validator";
import {
    UnknownCityError,
    calculateSolarQuote,
    getAvailableCities,
} from "../services/calculatorService";
import type { CalculationInput } from "../types/calculator.types";

export function getCities(_req: Request, res: Response): void {
    res.status(200).json({ status: "success", data: getAvailableCities() });
}

export function calculate(req: Request, res: Response, next: NextFunction): void {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        res.status(400).json({ status: "fail", data: validationErrors.array() });
        return;
    }

    try {
        const input = matchedData<CalculationInput>(req);
        const result = calculateSolarQuote(input);
        res.status(200).json({ status: "success", data: result });
    } catch (error) {
        // Normally unreachable (the validator checks the city), kept as a safety net
        if (error instanceof UnknownCityError) {
            res.status(400).json({ status: "fail", data: { message: error.message } });
            return;
        }
        next(error);
    }
}
