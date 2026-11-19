import { Router, type Request, type Response } from "express";
import calculatorRoutes from "./calculatorRoutes";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/", calculatorRoutes);

// Catch-all for unknown /api/* routes
router.use((req: Request, res: Response) => {
    res.status(404).json({
        status: "fail",
        data: { message: `Route ${req.method} ${req.originalUrl} does not exist.` },
    });
});

export default router;
