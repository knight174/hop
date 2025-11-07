# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.1](https://github.com/knight174/hop/compare/v0.1.0...v0.1.1) (2025-11-07)


### Features

* **proxy:** add CORS support with preflight handling ([eca9f43](https://github.com/knight174/hop/commit/eca9f43fd41179503bd375812bc8d34b8c970b4d))

## 0.1.0 (2025-11-07)


### ⚠ BREAKING CHANGES

* Configuration format changed - proxies now require a 'name' field and support optional 'paths' array

### Features

* add named proxy rules with path-based routing and selective serving ([99d862c](https://github.com/knight174/hop/commit/99d862c4101be46cb1143be86484b02e6de66f89))
* **cli:** add interactive proxy editing command ([8c03edd](https://github.com/knight174/hop/commit/8c03edd38ab313daf732df36f01a0216796fc564))
* initialize hop CLI tool with proxy management commands ([5be189d](https://github.com/knight174/hop/commit/5be189d8269010bef637f615f78a15f235e0419c))
