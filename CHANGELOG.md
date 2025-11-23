# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.2.0](https://github.com/knight174/hop/compare/v0.1.6...v0.2.0) (2025-11-23)


### Features

* Add a Text User Interface (TUI) for managing proxy configurations. ([9df9576](https://github.com/knight174/hop/commit/9df9576a735643c6089091755b154d4086358fd8))

### [0.1.6](https://github.com/knight174/hop/compare/v0.1.5...v0.1.6) (2025-11-22)


### Features

* Add demo plugin, redirect console output to dashboard, and enhance dashboard UI with system logs, dynamic table, and focus management. ([7582929](https://github.com/knight174/hop/commit/7582929980655c324365123dcb99e6b746605e6a))
* add export and import commands for proxy configurations and update README. ([f952c0b](https://github.com/knight174/hop/commit/f952c0b1803812f499ada04b1361c628212925dd))
* Add HTTPS proxying, path rewriting, and debug logging. ([60ccaa0](https://github.com/knight174/hop/commit/60ccaa0a9eb3c004111016a9c06e8e86f782e7ed))
* implement proxy plugin system with `onRequest` and `onResponse` hooks, including dynamic loading and UI management ([20f360f](https://github.com/knight174/hop/commit/20f360ffc28b4e4ac7bb21505e6906a82d8b0a0b))
* Introduce a real-time TUI dashboard for proxy requests and responses. ([2e78c12](https://github.com/knight174/hop/commit/2e78c12e6e77dcb51bfaad0823afdf58ce74be13))

### [0.1.5](https://github.com/knight174/hop/compare/v0.1.4...v0.1.5) (2025-11-14)


### Features

* **cors:** add configurable CORS support with flexible header handling ([fa754ee](https://github.com/knight174/hop/commit/fa754eec3b9b6acdfb8746cf1bf355c3a4a19dd2))

### [0.1.4](https://github.com/knight174/hop/compare/v0.1.3...v0.1.4) (2025-11-11)


### Features

* **logger:** enhance logging with timestamps and HTTP request formatting ([59f6aa3](https://github.com/knight174/hop/commit/59f6aa3565a29b47f3af7a660105047cb22bd2ff))


### Bug Fixes

* **commands:** improve path parsing logic to handle empty inputs ([6f97d96](https://github.com/knight174/hop/commit/6f97d96770d8e8162d089592a4ce1f2550093544))

### [0.1.3](https://github.com/knight174/hop/compare/v0.1.2...v0.1.3) (2025-11-08)


### Features

* **cli:** add package metadata and dynamic version handling ([5bd48b9](https://github.com/knight174/hop/commit/5bd48b9718bff0d17e90cbd7b728d02fcef2c6ba))

### [0.1.2](https://github.com/knight174/hop/compare/v0.1.1...v0.1.2) (2025-11-07)


### Features

* **proxy:** add request logging with duration and status tracking ([a3e1544](https://github.com/knight174/hop/commit/a3e15446dd669bb2dacdefdc0c439bdbbb780aa0))

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
