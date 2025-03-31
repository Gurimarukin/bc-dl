/* eslint sort-keys: ['warn', 'asc', { natural: true, allowLineSeparatedGroups : true }] */

/* eslint-disable sort-keys */

import jseslint from "@eslint/js";
import fpTs from "eslint-plugin-fp-ts";
import functional from "eslint-plugin-functional";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".pnp.*"] },
  {
    extends: [
      jseslint.configs.recommended,
      tseslint.configs.recommended,
      functional.configs.recommended,
    ],
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "tsconfig.json",
      },
    },
    plugins: {
      "fp-ts": fpTs,
    },
    linterOptions: {
      reportUnusedInlineConfigs: "warn",
    },
    /* eslint-enable sort-keys */
    rules: {
      ...fpTs.configs.all.rules,

      // js
      "no-console": "off",
      "no-empty-function": "off",
      "no-inner-declarations": "off",
      "no-multiple-empty-lines": ["warn", { max: 1 }],
      "no-redeclare": "off",
      "no-shadow": ["warn", { hoist: "functions" }],
      "no-undef": "off",
      "no-unneeded-ternary": "warn",
      "no-use-before-define": "off",
      "no-useless-computed-key": "warn",
      "no-useless-rename": "warn",
      "object-shorthand": "warn",
      strict: "warn",

      // ts
      "@typescript-eslint/array-type": [
        "warn",
        { default: "array", readonly: "generic" },
      ],
      "@typescript-eslint/consistent-type-definitions": "off", // use functional/prefer-type-literal, it's better
      "@typescript-eslint/explicit-function-return-type": [
        "warn",
        {
          allowExpressions: true,
          allowHigherOrderFunctions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
      "@typescript-eslint/no-base-to-string": [
        "warn",
        { ignoredTypeNames: ["Error"] },
      ],
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
      "@typescript-eslint/no-unnecessary-condition": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/strict-boolean-expressions": [
        "warn",
        {
          allowNullableObject: false,
          allowNumber: false,
          allowString: false,
        },
      ],

      // fp-ts
      "fp-ts/no-module-imports": ["warn", { allowTypes: true }],

      // functional
      "functional/functional-parameters": [
        "warn",
        {
          allowRestParameter: true,
          enforceParameterCount: false,
        },
      ],
      "functional/no-expression-statements": [
        "warn",
        {
          ignoreCodePattern: [
            "^afterEach\\(",
            "^beforeEach\\(",
            "^console\\.",
            "^describe(\\.only)?\\(",
            "^expect(\\.only)?\\(",
            "^it(\\.only)?\\(",
          ],
        },
      ],
      "functional/no-mixed-types": "off",
      "functional/no-promise-reject": "warn",
      "functional/prefer-immutable-types": [
        "warn",
        {
          enforcement: "None",
          ignoreInferredTypes: true,
        },
      ],
    },
  }
);
