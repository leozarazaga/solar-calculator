import { body, type ValidationChain } from "express-validator";
import { getAvailableCities } from "../services/calculatorService";

/**
 * Numeric body field within [min, max]. Accepts JSON numbers and numeric strings,
 * rejects arrays (express-validator would otherwise validate each element), and
 * sanitizes to a JS number so matchedData() returns `number`.
 */
const numberInRange = (field: string, min: number, max: number, message: string): ValidationChain =>
    body(field)
        .exists({ values: "null" })
        .withMessage(message)
        .bail()
        .not()
        .isArray()
        .withMessage(message)
        .bail()
        .isFloat({ min, max })
        .withMessage(message)
        .bail()
        .toFloat();

export const calculateRules: ValidationChain[] = [
    body("city")
        .isString()
        .withMessage("City is required.")
        .bail()
        .trim()
        .notEmpty()
        .withMessage("City is required.")
        .bail()
        .isIn(getAvailableCities())
        .withMessage("Invalid city. Please select a city from the list."),

    numberInRange("annualConsumption", 1000, 100_000, "Annual consumption must be between 1,000 and 100,000 kWh."),
    numberInRange("roofArea", 4, 500, "Usable roof area must be between 4 and 500 m²."),
    numberInRange("electricityPrice", 0.1, 10, "Electricity price must be between 0.10 and 10.00 kr/kWh."),
];
