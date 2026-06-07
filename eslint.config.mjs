import next from "eslint-config-next"
import tsPlugin from "@typescript-eslint/eslint-plugin"

const eslintConfig = [
  ...next,
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "warn",
    },
  },
  {
    // CLI scripts & worker — console adalah output yang disengaja
    files: ["src/lib/db/seed.ts", "src/lib/db/seed-demo.ts", "src/lib/db/apply-rls.ts", "src/lib/db/setup-role.ts", "src/workers/**"],
    rules: { "no-console": "off" },
  },
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "public/**"],
  },
]

export default eslintConfig
