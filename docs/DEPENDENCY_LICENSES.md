# Dependency License Audit — Air Power DSS (SIH 26250)
**System Version:** v1.0.0  
**Specification:** CycloneDX 1.5 JSON ([docs/sbom.json](sbom.json))  
**Compliance Standard:** 100% Permissive Open Source (Zero Copyleft / Zero GPL / Zero AGPL in Runtime Path)

---

## 1. Summary by License Type

| License Type | Count | Permissibility Status | Commercial / Government Use |
|---|---|---|---|
| **MIT License** | 18 | Fully Permissive | Unrestricted |
| **Apache 2.0 License** | 3 | Permissive with Patent Grant | Unrestricted |
| **Copyleft (GPL/AGPL)** | **0** | **None Present** | Zero Contamination Risk |

---

## 2. Component Inventory

| Package Name | Resolved Version | Declared License | Evaluation Status |
|---|---|---|---|
| `fast-check` | `4.10.2` | MIT | Permissive / Approved |
| `playwright` | `1.64.0` | Apache-2.0 | Permissive / Approved |
| `tsx` | `4.19.3` | MIT | Permissive / Approved |
| `typescript` | `5.7.3` | Apache-2.0 | Permissive / Approved |
| `vitest` | `3.0.7` | Apache-2.0 | Permissive / Approved |
| `fastify` | `5.2.1` | MIT | Permissive / Approved |
| `@fastify/cors` | `10.0.2` | MIT | Permissive / Approved |
| `zod` | `3.24.2` | MIT | Permissive / Approved |
| `@types/node` | `22.13.1` | MIT | Permissive / Approved |
| `clsx` | `2.1.1` | MIT | Permissive / Approved |
| `lucide-react` | `0.475.0` | MIT | Permissive / Approved |
| `maplibre-gl` | `6.13.0` | MIT | Permissive / Approved |
| `next` | `15.1.7` | MIT | Permissive / Approved |
| `react` | `19.0.0` | MIT | Permissive / Approved |
| `react-dom` | `19.0.0` | MIT | Permissive / Approved |
| `tailwind-merge` | `3.0.1` | MIT | Permissive / Approved |
| `@types/react` | `19.0.8` | MIT | Permissive / Approved |
| `@types/react-dom` | `19.0.3` | MIT | Permissive / Approved |
| `postcss` | `8.5.2` | MIT | Permissive / Approved |
| `tailwindcss` | `3.4.17` | MIT | Permissive / Approved |
| `highs` | `1.15.3` | MIT | Permissive / Approved |

---

## 3. Defense Supply Chain Verification
- All dependencies resolve to public npm registries with cryptographic integrity hashes verified in `pnpm-lock.yaml`.
- Zero proprietary closed-source SDKs or telemetry beacons bundled.
- Complete CycloneDX 1.5 machine-readable software bill of materials available at `docs/sbom.json`.
