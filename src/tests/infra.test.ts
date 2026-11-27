import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createAxiomLoggerStream, mapPinoLevel, resolveSafeAxiomUrl } from "@/config/logger";
import { resolvePdfWorkerSrc } from "@/router/private/NF/create/createNf.pdf";

describe("Production Axiom Pino Stream", () => {
    it("maps Pino numeric and string levels accurately", () => {
        expect(mapPinoLevel(10)).toBe("trace");
        expect(mapPinoLevel(20)).toBe("debug");
        expect(mapPinoLevel(30)).toBe("info");
        expect(mapPinoLevel(40)).toBe("warn");
        expect(mapPinoLevel(50)).toBe("error");
        expect(mapPinoLevel(60)).toBe("fatal");
        expect(mapPinoLevel(99)).toBe("silent");
        expect(mapPinoLevel("warn")).toBe("warn");
        expect(mapPinoLevel(undefined)).toBe("info");
    });

    it("forwards chunks to stdout and batches Axiom ingest with Bearer token", async () => {
        const stdoutChunks: string[] = [];
        const fetchCalls: Array<{
            url: string;
            auth: string | null;
            body: Array<Record<string, unknown>>;
        }> = [];

        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const originalFetch = globalThis.fetch;

        process.stdout.write = ((chunk: string | Uint8Array) => {
            stdoutChunks.push(String(chunk));
            return true;
        }) as typeof process.stdout.write;

        globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
            const headers = new Headers(init?.headers);
            fetchCalls.push({
                url: String(input),
                auth: headers.get("Authorization"),
                body: JSON.parse(String(init?.body ?? "[]")) as Array<Record<string, unknown>>,
            });
            return new Response(null, { status: 200 });
        }) as unknown as typeof fetch;

        try {
            const loggerStream = createAxiomLoggerStream("test-axiom-token");
            loggerStream.stream.write(
                `${JSON.stringify({ time: 1700000000000, level: 30, msg: "hello", reqId: "r1" })}\n`,
            );
            await loggerStream.flush();

            expect(stdoutChunks.length).toBe(1);
            expect(stdoutChunks[0]).toContain('"msg":"hello"');

            expect(fetchCalls.length).toBe(1);
            expect(fetchCalls[0]?.url).toContain("/v1/datasets/");
            expect(fetchCalls[0]?.url).toContain("/ingest");
            expect(fetchCalls[0]?.auth).toBe("Bearer test-axiom-token");
            expect(fetchCalls[0]?.body).toEqual([
                {
                    _time: 1700000000000,
                    level: "info",
                    msg: "hello",
                    reqId: "r1",
                },
            ]);
        } finally {
            process.stdout.write = originalStdoutWrite;
            globalThis.fetch = originalFetch;
        }
    });

    it("caps buffered events at 500 by dropping oldest entries on overflow", async () => {
        const sentEvents: Array<Record<string, unknown>> = [];
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const originalFetch = globalThis.fetch;

        let releaseFirstFetch!: () => void;
        const firstFetchGate = new Promise<void>((resolve) => {
            releaseFirstFetch = resolve;
        });
        let callCount = 0;

        process.stdout.write = (() => true) as typeof process.stdout.write;
        globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
            callCount += 1;
            const parsed = JSON.parse(String(init?.body ?? "[]")) as Array<Record<string, unknown>>;
            sentEvents.push(...parsed);
            if (callCount === 1) {
                await firstFetchGate;
            }
            return new Response(null, { status: 200 });
        }) as unknown as typeof fetch;

        try {
            const loggerStream = createAxiomLoggerStream("cap-test-token");
            // 50th write starts first flush (splices 0..49); remaining 505 writes cap at 500 (drop 50..54)
            for (let i = 0; i < 555; i += 1) {
                loggerStream.stream.write(
                    `${JSON.stringify({ time: 1700000000000 + i, level: 30, seq: i })}\n`,
                );
            }

            releaseFirstFetch();
            await Promise.resolve();
            await loggerStream.flush();

            const seqs = sentEvents.map((entry) => entry.seq);
            expect(seqs.length).toBe(550);
            expect(seqs.slice(0, 3)).toEqual([0, 1, 2]);
            expect(seqs[50]).toBe(55);
            expect(seqs[seqs.length - 1]).toBe(554);
        } finally {
            process.stdout.write = originalStdoutWrite;
            globalThis.fetch = originalFetch;
        }
    });

    it("swallows Axiom HTTP errors and network failures without crashing", async () => {
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const originalStderrWrite = process.stderr.write.bind(process.stderr);
        const originalFetch = globalThis.fetch;

        process.stdout.write = (() => true) as typeof process.stdout.write;
        process.stderr.write = (() => true) as typeof process.stderr.write;

        try {
            globalThis.fetch = (async () =>
                new Response("error", { status: 500 })) as unknown as typeof fetch;
            const loggerStream = createAxiomLoggerStream("err-test-token");
            loggerStream.stream.write(`${JSON.stringify({ time: 1, level: 50, msg: "fail500" })}\n`);
            await expect(loggerStream.flush()).resolves.toBeUndefined();

            globalThis.fetch = (async () => {
                throw new Error("network unreachable");
            }) as unknown as typeof fetch;
            loggerStream.stream.write(`${JSON.stringify({ time: 2, level: 50, msg: "failNet" })}\n`);
            await expect(loggerStream.flush()).resolves.toBeUndefined();
        } finally {
            process.stdout.write = originalStdoutWrite;
            process.stderr.write = originalStderrWrite;
            globalThis.fetch = originalFetch;
        }
    });

    it("awaits in-flight batch flush without busy-looping and drains queued entries", async () => {
        const sentBatches: Array<Array<Record<string, unknown>>> = [];
        const originalStdoutWrite = process.stdout.write.bind(process.stdout);
        const originalFetch = globalThis.fetch;

        let releaseFirstFetch!: () => void;
        const firstFetchGate = new Promise<void>((resolve) => {
            releaseFirstFetch = resolve;
        });
        let fetchCount = 0;

        process.stdout.write = (() => true) as typeof process.stdout.write;
        globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
            fetchCount += 1;
            sentBatches.push(
                JSON.parse(String(init?.body ?? "[]")) as Array<Record<string, unknown>>,
            );
            if (fetchCount === 1) {
                await firstFetchGate;
            }
            return new Response(null, { status: 200 });
        }) as unknown as typeof fetch;

        try {
            const loggerStream = createAxiomLoggerStream("inflight-test-token");
            for (let i = 0; i < 51; i += 1) {
                loggerStream.stream.write(
                    `${JSON.stringify({ time: 1700000000000 + i, level: 30, seq: i })}\n`,
                );
            }

            let flushSettled = false;
            const flushPromise = loggerStream.flush().then(() => {
                flushSettled = true;
            });

            await new Promise((resolve) => setTimeout(resolve, 25));
            expect(flushSettled).toBe(false);
            expect(fetchCount).toBe(1);

            releaseFirstFetch();
            await flushPromise;

            expect(flushSettled).toBe(true);
            expect(fetchCount).toBe(2);
            expect(sentBatches[0]?.length).toBe(50);
            expect(sentBatches[1]?.length).toBe(1);
            expect(sentBatches[1]?.[0]?.seq).toBe(50);
        } finally {
            process.stdout.write = originalStdoutWrite;
            globalThis.fetch = originalFetch;
        }
    });

    it("enforces HTTPS for AXIOM_URL in production and rejects invalid schemes", () => {
        expect(resolveSafeAxiomUrl(undefined, true)).toBe("https://api.axiom.co");
        expect(resolveSafeAxiomUrl("https://api.axiom.co///", true)).toBe(
            "https://api.axiom.co",
        );
        expect(resolveSafeAxiomUrl("http://127.0.0.1:8080/", false)).toBe(
            "http://127.0.0.1:8080",
        );
        expect(() => resolveSafeAxiomUrl("http://api.axiom.co", true)).toThrow(
            "HTTPS",
        );
        expect(() => resolveSafeAxiomUrl("file:///etc/passwd", false)).toThrow();
        expect(() => resolveSafeAxiomUrl("javascript:alert(1)", true)).toThrow();
    });
});

describe("PDF Worker Resolution", () => {
    it("resolves an existing file:// worker module path", () => {
        const workerSrc = resolvePdfWorkerSrc();
        expect(workerSrc.startsWith("file://")).toBe(true);
        const workerPath = fileURLToPath(workerSrc);
        expect(workerPath.endsWith(".mjs")).toBe(true);
        expect(existsSync(workerPath)).toBe(true);
    });
});
