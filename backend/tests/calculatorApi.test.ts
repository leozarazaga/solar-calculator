import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";

const validMalmo = {
    city: "Malmö",
    annualConsumption: 10_000,
    roofArea: 60,
    electricityPrice: 2,
};

/** Fields named in a 400 validation response. */
const invalidFields = (body: { data: Array<{ path?: string }> }) =>
    body.data.map((error) => error.path);

describe("GET /api/health", () => {
    it("returns ok", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(typeof res.body.timestamp).toBe("string");
    });
});

describe("GET /api/cities", () => {
    it("returns all six cities in the success envelope", async () => {
        const res = await request(app).get("/api/cities");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            status: "success",
            data: ["Malmö", "Göteborg", "Stockholm", "Uppsala", "Sundsvall", "Luleå"],
        });
    });
});

describe("POST /api/calculate", () => {
    it("returns the Malmö quote for valid input", async () => {
        const res = await request(app).post("/api/calculate").send(validMalmo);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("success");
        expect(res.body.data).toMatchObject({
            city: "Malmö",
            panelCount: 22,
            neededPanelCount: 22,
            maxPanelsOnRoof: 30,
            isRoofLimited: false,
            installedKwp: 9.9,
            requiredRoofAreaM2: 44,
            annualConsumptionKwh: 10_000,
            installationCostKr: 148_500,
            warnings: [],
        });
        expect(res.body.data.monthlyBreakdown).toHaveLength(12);
        expect(res.body.data.annualProductionKwh).toBeCloseTo(10_183.83, 1);
        expect(res.body.data.paybackYears).toBeGreaterThan(0);
    });

    it("accepts numeric strings and converts them to numbers", async () => {
        const res = await request(app)
            .post("/api/calculate")
            .send({ ...validMalmo, annualConsumption: "10000", roofArea: "60" });
        expect(res.status).toBe(200);
        expect(res.body.data.annualConsumptionKwh).toBe(10_000);
        expect(res.body.data.panelCount).toBe(22);
    });

    it.each([
        ["unknown city", { ...validMalmo, city: "Atlantis" }, "city", "Invalid city. Please select a city from the list."],
        [
            "negative consumption",
            { ...validMalmo, annualConsumption: -500 },
            "annualConsumption",
            "Annual consumption must be between 1,000 and 100,000 kWh.",
        ],
        [
            "roof area below 4 m²",
            { ...validMalmo, roofArea: 3 },
            "roofArea",
            "Usable roof area must be between 4 and 500 m².",
        ],
        [
            "electricity price above 10",
            { ...validMalmo, electricityPrice: 11 },
            "electricityPrice",
            "Electricity price must be between 0.10 and 10.00 kr/kWh.",
        ],
        [
            "consumption sent as an array",
            { ...validMalmo, annualConsumption: [10_000] },
            "annualConsumption",
            "Annual consumption must be between 1,000 and 100,000 kWh.",
        ],
        ["non-numeric roof area", { ...validMalmo, roofArea: "abc" }, "roofArea", "Usable roof area must be between 4 and 500 m²."],
    ])("rejects %s with 400", async (_label, body, field, message) => {
        const res = await request(app).post("/api/calculate").send(body);
        expect(res.status).toBe(400);
        expect(res.body.status).toBe("fail");
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(invalidFields(res.body)).toEqual([field]);
        expect(res.body.data[0].msg).toBe(message);
    });

    it("accepts the exact minimum values (inclusive bounds)", async () => {
        const res = await request(app)
            .post("/api/calculate")
            .send({ city: "Malmö", annualConsumption: 1000, roofArea: 4, electricityPrice: 0.1 });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("success");
    });

    it("accepts the exact maximum values (inclusive bounds)", async () => {
        const res = await request(app)
            .post("/api/calculate")
            .send({ city: "Malmö", annualConsumption: 100_000, roofArea: 500, electricityPrice: 10 });
        expect(res.status).toBe(200);
    });

    it("trims whitespace around the city name", async () => {
        const res = await request(app)
            .post("/api/calculate")
            .send({ ...validMalmo, city: "  Malmö " });
        expect(res.status).toBe(200);
        expect(res.body.data.city).toBe("Malmö");
    });

    it("rejects built-in object property names as cities", async () => {
        const res = await request(app)
            .post("/api/calculate")
            .send({ ...validMalmo, city: "constructor" });
        expect(res.status).toBe(400);
        expect(invalidFields(res.body)).toEqual(["city"]);
    });

    it("returns 400 in the fail envelope with a clear message for malformed JSON", async () => {
        const res = await request(app)
            .post("/api/calculate")
            .set("Content-Type", "application/json")
            .send('{"city": "Malmö",');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ status: "fail", data: { message: "Invalid JSON in request body." } });
    });

    it("reports every missing field", async () => {
        const res = await request(app).post("/api/calculate").send({});
        expect(res.status).toBe(400);
        expect(res.body.status).toBe("fail");
        expect(invalidFields(res.body).sort()).toEqual(
            ["annualConsumption", "city", "electricityPrice", "roofArea"].sort(),
        );
    });
});

describe("unknown routes", () => {
    it("returns 404 in the fail envelope for unknown /api routes", async () => {
        const res = await request(app).get("/api/nonexistent");
        expect(res.status).toBe(404);
        expect(res.body.status).toBe("fail");
        expect(res.body.data.message).toContain("/api/nonexistent");
    });

    it("returns 404 in the fail envelope for unknown non-/api routes", async () => {
        const res = await request(app).get("/nonexistent");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            status: "fail",
            data: { message: "Route GET /nonexistent does not exist." },
        });
    });
});

describe("CORS", () => {
    it("allows the default frontend origin", async () => {
        const res = await request(app).get("/api/cities").set("Origin", "http://localhost:5173");
        expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    });

    it("sends no CORS header for other origins", async () => {
        const res = await request(app).get("/api/cities").set("Origin", "https://evil.example");
        expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("uses CORS_ORIGIN when set", async () => {
        const previous = process.env.CORS_ORIGIN;
        process.env.CORS_ORIGIN = "https://solar.example";
        try {
            const res = await request(app).get("/api/cities").set("Origin", "https://solar.example");
            expect(res.headers["access-control-allow-origin"]).toBe("https://solar.example");
        } finally {
            if (previous === undefined) delete process.env.CORS_ORIGIN;
            else process.env.CORS_ORIGIN = previous;
        }
    });
});
