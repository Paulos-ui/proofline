import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Evidence previews are short-lived signed URLs. next/image would need a remote
      // pattern per Supabase project and cannot re-sign an expired one, so a plain
      // <img> is the correct choice here.
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
