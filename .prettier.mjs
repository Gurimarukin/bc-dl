export default {
  endOfLine: "lf",
  printWidth: 100,
  semi: false,
  singleQuote: true,
  trailingComma: "all",
  arrowParens: "avoid",
  importOrder: ["<THIRD_PARTY_MODULES>", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: ["@trivago/prettier-plugin-sort-imports"],
};
