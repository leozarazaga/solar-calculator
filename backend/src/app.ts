import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import morgan from "morgan";
import apiRoutes from "./routes";

const DEFAULT_CORS_ORIGIN = "http://localhost:5173";

const app = express();

// Logger first so requests rejected by later middleware (e.g. bad JSON) are still logged
app.use(morgan("dev", { skip: () => process.env.NODE_ENV === "test" }));

// CORS_ORIGIN is read per request, not at import time: this module loads before
// server.ts calls dotenv.config(). Requests without an Origin (curl, same-origin) pass.
app.use(
    cors({
        origin: (origin, callback) => {
            const allowed = process.env.CORS_ORIGIN || DEFAULT_CORS_ORIGIN;
            callback(null, !origin || origin === allowed);
        },
    }),
);

app.use(express.json());

app.use("/api", apiRoutes);

// 404 for non-/api routes (unknown /api/* routes are handled inside apiRoutes)
app.use((req: Request, res: Response) => {
    res.status(404).json({
        status: "fail",
        data: { message: `Route ${req.method} ${req.originalUrl} does not exist.` },
    });
});

interface HttpError extends Error {
    status?: number;
    statusCode?: number;
    expose?: boolean;
    /** Set by Express's body parser, e.g. "entity.parse.failed" */
    type?: string;
}

/** Messages for client errors raised by Express's body parser. */
const BODY_PARSER_MESSAGES: Record<string, string> = {
    "entity.parse.failed": "Invalid JSON in request body.",
    "entity.too.large": "Request body is too large.",
};

function clientErrorMessage(err: HttpError): string {
    if (err.type) {
        return BODY_PARSER_MESSAGES[err.type] ?? "Bad request.";
    }
    // Our own errors (e.g. UnknownCityError) carry safe, client-facing messages
    return err.expose === false ? "Bad request." : err.message;
}

// Global error handler (Express recognises it by its four parameters).
// 4xx -> { status: "fail", data: { message } }, 5xx -> { status: "error", message }
app.use((err: HttpError, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        next(err);
        return;
    }

    const raw = err.status ?? err.statusCode;
    const status = raw !== undefined && raw >= 400 && raw < 600 ? raw : 500;

    if (status < 500) {
        res.status(status).json({ status: "fail", data: { message: clientErrorMessage(err) } });
        return;
    }

    // Never leak internal error details for server errors
    console.error(err);
    res.status(status).json({ status: "error", message: "An internal server error occurred." });
});

export default app;
