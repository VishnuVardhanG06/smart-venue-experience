module.exports = [
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        document: "readonly",
        window: "readonly",
        fetch: "readonly",
        expect: "readonly",
        test: "readonly",
        describe: "readonly",
        beforeEach: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "eqeqeq": "error",
      "curly": "error",
      "semi": ["error", "always"]
    }
  }
];
