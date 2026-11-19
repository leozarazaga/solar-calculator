import { Router } from "express";
import { calculate, getCities } from "../controllers/calculatorController";
import { calculateRules } from "../validators/calculatorValidator";

const router = Router();

router.get("/cities", getCities);
router.post("/calculate", calculateRules, calculate);

export default router;
