# Visual Prototype Changelog — v0.1.0

**Status:** v1 files are retained as audit evidence. v2 files are the **current recommended static prototypes** for future implementation and QA retest.

| Product surface | Retained v1 audit baseline | Current recommended v2 prototype | Semantic correction represented |
|---|---|---|---|
| Task command center | `visuals/01-task-command-center.png` | `visuals/01-task-command-center-v2-quality-safe.png` | The running/missing-evidence state is explicitly PENDING/NOT_READY with `delivery_allowed=false` and unavailable delivery. |
| New task studio | `visuals/02-new-task-studio.png` | `visuals/02-new-task-studio-v2-fixed-plan.png` | Preferences cannot be read as deleting stages: the fixed locked 15-stage plan and N/A Gate-record requirements are visible. |
| Artifact preview and delivery | `visuals/03-artifact-preview-delivery.png` | `visuals/03-artifact-preview-delivery-v2-safe.png` | A safe derived Office preview and separate raw authorization are explicit; the enabled ZIP is shown only with all delivery predicates satisfied. |

This changelog is an artifact-selection record, not an assertion that v2 behavior has been implemented. The v1 originals must remain available for traceability to ISSUE-001 through ISSUE-004; do not substitute or delete them during this documentation-only iteration.
