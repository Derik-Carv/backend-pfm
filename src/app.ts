import fastify from "fastify";
import fasfitySwagger from "@fastify/swagger";
import fasfitySwaggerUi from "@fastify/swagger-ui";
import rateLimit from "@fastify/rate-limit";
import { globalRateLimitConfig } from "@/lib/rateLimit";
import { appRoutes } from "@/router";

const isDev = process.env.NODE_ENV !== "production";

// define fastify and logger configuration
export const app = fastify({
    logger: isDev
        ? {
              transport: {
                  target: "pino-pretty",
                  options: {
                      translateTime: "HH:MM:ss Z",
                      ignore: "pid,hostname",
                  },
              },
          }
        : true,
});

app.register(rateLimit, globalRateLimitConfig);

// configuration of swagger and swagger-ui for API documentation
app.register(fasfitySwagger, {
    openapi: {
        info: {
            title: "API Principal Backend",
            description: "Documentation for API Backend",
            version: "1.0.0",
        },
    },
});

app.register(fasfitySwaggerUi, {
    routePrefix: "/docs",
});

app.register(appRoutes);
