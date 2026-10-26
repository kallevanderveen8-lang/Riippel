## Design reviews

Follow `.agents/skills/apple-design/SKILL.md`. Route topics with `.agents/skills/apple-design/references/hig-lookup.md` and read the relevant `.agents/skills/apple-design/references/hig/*.md` files before giving design feedback. Apply the accessibility and interaction principles to this Canvas/browser game; native Apple navigation conventions are not mandatory web conventions. Preserve Ripple's lake, natural materials and quiet pacing.

## Validation

Use the existing checkout; do not create a worktree unless requested. Run `npm test`. Build and browser scripts overwrite tracked reports and release ZIPs: use a disposable copy outside the checkout for validation, excluding `.git`, `.agents`, and `node_modules`. Set `CHROME_PATH=/usr/bin/chromium` and `CODEX_PRIMARY_RUNTIME_NODE_MODULES=/workspace/Riippel/node_modules` for browser validation. Preserve earlier user changes.
