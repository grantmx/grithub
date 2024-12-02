module.exports = {
	root: true,
	extends: ["next/babel","next/core-web-vitals"],
	rules: { 
		"react/no-unescaped-entities": ["error", {"forbid": [">", "}"]}]
	}
};
