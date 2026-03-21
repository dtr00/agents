---
alwaysApply: true
---

## Type Safety
- Avoid inline generic syntax on JSX elements (e.g. `<Component<Type>`). Find a proper alternative.
- Never use `as Type` castings as a quick fix — trace the issue to its root. Only fall back to `as Type` if no proper solution exists, and **notify me before doing so**.
- Never use the `typeof` keyword or other hacky techniques to work around type errors.
- If a type error is encountered, either fix the underlying cause or leave it alone unless explicitly asked to address it.
- All types should be properly typed and inferred — no shortcuts.

## Code Style
- Do not add comments that a human wouldn't write or that are inconsistent with the surrounding code. Comments are acceptable when supporting non-obvious logic.
- Do not add defensive checks or `try/catch` blocks that are abnormal for the area of the codebase, especially in trusted or already-validated codepaths.
