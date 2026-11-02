import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Day bucketing uses local time; pin the zone so results do not depend on the machine.
process.env.TZ = "Europe/Istanbul";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
