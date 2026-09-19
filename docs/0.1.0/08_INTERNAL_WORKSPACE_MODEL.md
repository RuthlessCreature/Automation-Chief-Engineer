# 0.1.0 Internal Workspace / Customer Delivery Model

## Evidence from the two golden-sample parents

The final-package directories are deliberately not treated as the complete project record.

| Sample | Internal source observed | What it proves the product must expose |
|---|---|---|
| 5015 fan tester | `_internal/handoffs`, `PEM`, `stages/00_intake` to `15_packaging` | Producer output, isolated gate report, handoff package, build scripts, raw CAD/render assets, manifests and render sessions are first-class process evidence. |
| PurgePump R02 | `ChiefEngineer_R02_internal/Gxx_*`, `.g12_artifact_runtime/previews`, `G15_Packaging` | Stage evidence, generated previews, document QA pages, consistency/audit matrices and pre-package extracts must be inspectable before final delivery. |

## Product layers

```text
Input vault → Internal Workspace → Preview Derivative → Chief approval → Customer Delivery package
                 │                      │                    │
                 └──── audit, rework, handoff, gate history ──┘
```

### Internal Workspace

Per stage, the workspace keeps immutable candidate outputs, producer notes, gate reports, inter-agent handoff, tool/build receipts, raw evidence and retry history. This is the default home of generated material. It is visible to the tenant's authorized internal roles only.

### Preview Derivative

Preview files are derived, access-controlled representations rather than the source asset: Office/PDF pages, spreadsheet range renders, CAD mesh/thumbnail, image preview and text preview. A derivative stores its `source_artifact_id`, hash and derivation kind. It never replaces the source artifact.

### Customer Delivery

Only an explicit chief-approved set may enter this layer. The system freezes its manifest and content hashes before creating the ZIP. A task that merely completes the internal quality gates remains `PACKAGING`; it cannot become `PACKAGED` until an actual frozen ZIP exists.

## Data and access contract

`artifacts.visibility` has exactly three values:

- `INTERNAL` — producer output, scripts, gates, handoffs and raw evidence.
- `PREVIEW_DERIVATIVE` — a controlled display derivative tied to an internal source.
- `CUSTOMER_DELIVERY` — an approved, frozen item referenced by a delivery manifest.

`delivery_packages` records `ASSEMBLING`, `FROZEN` or `REJECTED`. A final package needs a manifest key, ZIP key, SHA-256 and chief approval. No fall-through from `ACCEPTED` artifact to customer exposure is permitted.

## UI behavior added to the build target

The task screen must show a visible layer switcher:

1. **Internal Workspace** — stage cards expand to output, gate report, handoff, build receipt and evidence; role-gated.
2. **Preview** — open safe derived Office/CAD/image/text previews inside the inspector.
3. **Customer Delivery** — list only frozen manifest items and the final ZIP; show an empty “not frozen” state while packaging.

The UI must label the layer in every artifact card so a customer cannot mistake a candidate or internal validation asset for a contractual deliverable.
