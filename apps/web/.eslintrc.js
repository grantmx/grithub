module.exports = {
	root: true,
	extends: ["next/babel", "next/core-web-vitals"],
	rules: {
		"react/no-unescaped-entities": ["error", { "forbid": [">", "}"] }],
		"no-undef": "error",
		"no-unused-vars": "warn",
		"no-unused-expressions": "warn",
		"no-extra-semi": "warn"
	},
	"overrides": [
		{
			"files": ["*.js", "*.mjs"],
			// This is the default parser of ESLint
			"parser": "espree",
			"parserOptions": {
				"ecmaVersion": "latest"
			}
		}
	],
	"env": {
		"browser": true,
		"es6": true
	}
};
