import path from "node:path";
import { fileURLToPath } from "node:url";

// Same Tailwind setup as the app. Scan the whole repo, so the classes used in ../src are generated.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const config = {
  plugins: { "@tailwindcss/postcss": { base: root } },
};

export default config;
