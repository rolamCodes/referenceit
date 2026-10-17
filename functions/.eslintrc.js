module.exports = {
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    "ecmaVersion": 2022,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    "max-len": ["error", {"code": 100, "ignoreStrings": true, "ignoreTemplateLiterals": true}],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "object-curly-spacing": ["error", "always"],
    "indent": ["error", 2, {"SwitchCase": 1}],
  },
  globals: {},
};
