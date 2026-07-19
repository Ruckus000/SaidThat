# Reddit Design-Skill Evidence Review

## Purpose and evidence policy

This review examines 20 Reddit discussions about AI UI/design skills, anti-slop plugins, Codex workflows, and frontend-generation systems. Reddit is treated as qualitative hypothesis evidence, not as proof of product quality or causal effectiveness.

The source ledger is machine-validated in [`reddit-design-skill-evidence.json`](./reddit-design-skill-evidence.json) using [`reddit-evidence.schema.json`](../schemas/reddit-evidence.schema.json). Every entry separates the author's claim from commenter reactions and records a disposition. All 20 Reddit-derived proposals are `research-only`; none changes plugin behavior.

## What the corpus suggests

### 1. Anti-slop lists can become a new style preset

The strongest repeated criticism of anti-slop tools is not that their pattern lists are useless, but that a blacklist can replace one recognizable median with another. The unslop-ui discussions are especially explicit: commenters describe “reslop” outcomes, generic replacement aesthetics, and failures that remain visible in the rendered page. The frontend-design discussions raise a similar concern: a skill may improve a first output while still converging on a recognizable house style.

This supports LaunchPad's existing exception rule, but does not prove that any particular prohibited-default list improves outcomes. The safe conclusion is to flag patterns with context and evidence, never ban them permanently.

### 2. One-shot skill quality is not established

Several posts describe better results after generating a visual reference, creating a design system, iterating section by section, or using a skill for QA rather than initial generation. Other posts report that an interview layer and more detailed prompts did not change the recurring composition.

The common factor is workflow structure, not a proven magic prompt. A future implementation decision would require an A/B benchmark comparing one-shot, direction-first, and iterative component workflows across the existing municipal, defense/aerospace, and nonprofit fixtures.

### 3. References may improve fidelity, but fidelity is not UX quality

Screenshots, moodboards, Figma files, generated image concepts, and DESIGN.md-style documents are repeatedly recommended. These may make visual translation more concrete, but they can also encourage imitation, hide inaccessible behavior, or create unimplementable assets. A screenshot cannot prove keyboard behavior, content-state coverage, semantic structure, responsive behavior, or truthfulness.

References should therefore remain optional inputs to a tested workflow, not automatic approval evidence.

### 4. Skills and browser tools solve different problems

Codex discussions distinguish skill instructions from direct browser control. This aligns with the existing plugin architecture: skills orchestrate decisions, while Playwright and axe provide rendered and accessibility evidence. The Reddit reports do not prove one browser integration is better than another, so no tool preference is adopted from them.

### 5. Positive direction appears safer than prohibition-only prompting

The more credible community advice asks the agent to commit to a concrete design direction, subject reference, or design bible. The less credible advice is a long list of forbidden colors, fonts, cards, gradients, or rounded corners. A direction still needs evidence, content fit, and accessibility review; “brutalist,” “premium,” or “editorial” is not a user need by itself.

### 6. Self-evaluation is not independent evidence

Some posts praise their own generated output or recommend tools whose own sites are then criticized in the same discussion. This is a useful warning for the staged gate: generated scores, tool marketing, and author screenshots must be checked against deterministic contracts, browser behavior, and explicit human review.

## What is not proven

The corpus does not prove that:

- Anthropic's frontend-design skill, Impeccable, UI UX Pro Max, Stark, looks-expensive, unslop-ui, taste, or any other named skill consistently improves task success.
- A particular palette, font, layout, or “anti-AI” style is objectively better.
- Screenshot-to-code or image-first workflows produce more accessible or maintainable interfaces.
- More skills improve results; several posts raise the possibility of conflicting instructions and context rot.
- A design system prevents generic output without a strong, evidence-backed source direction.
- Community upvotes measure design quality.

These claims remain explicitly `research-only` in the evidence ledger.

## Proof requirements for future changes

Any future feature inspired by this corpus must supply at least one independent proof source and, where applicable, a reproducible local test:

| Candidate idea | Required proof before implementation |
| --- | --- |
| Reference or screenshot ingestion | Controlled fidelity test plus accessibility and responsive checks |
| Direction-first workflow | Three-run A/B benchmark against one-shot generation |
| Section-level iteration | Rework count, task clarity, and cross-page consistency comparison |
| Anti-slop detector rule | True-positive and false-positive fixtures plus justified exceptions |
| Browser evaluator integration | Playwright/axe evidence artifact and failure-path test |
| Design-system-first workflow | Brownfield migration test and token/component integrity checks |
| External evaluator or model | Independent evaluator run, artifact hashes, and no self-approval |

If independent proof cannot be produced, the idea remains a documented hypothesis and must not alter the quality gate.

## Source ledger

The complete source-by-source analysis, including dates as displayed by Reddit/search results, claims, comment themes, contradictions, evidence quality, and disposition is in [`reddit-design-skill-evidence.json`](./reddit-design-skill-evidence.json). The 20 sources are:

1. [I cannot figure out front-end design skill](https://www.reddit.com/r/ClaudeAI/comments/1s96sae/i_cannot_figure_out_frontend_design_skill/)
2. [Frontend Design — Trying To Move away from the AI generated GUI](https://www.reddit.com/r/ClaudeAI/comments/1ulgm5l/frontend_design_trying_to_move_away_from_the_ai/)
3. [How do you handle frontend/UI work with Codex?](https://www.reddit.com/r/codex/comments/1upt5ha/how_do_you_handle_frontendui_work_with_codex/)
4. [frontend-design skill is so amazing!](https://www.reddit.com/r/ClaudeAI/comments/1oxn1gj/frontenddesign_skill_is_so_amazing/)
5. [unslop-ui](https://www.reddit.com/r/ClaudeAI/comments/1u9sgj3/unslopui_a_claude_skill_that_flags_and_removes/)
6. [I'm rating every Claude Code skill I can find](https://www.reddit.com/r/ClaudeAI/comments/1rafmpg/im_rating_every_claude_code_skill_i_can_find/)
7. [frontend-design always outputs the same structure](https://www.reddit.com/r/ClaudeAI/comments/1t3ht2g/claude_code_frontenddesign_skill_always_outputs/)
8. [Claude with a frontend design skill vs without](https://www.reddit.com/r/claudeskills/comments/1tqwn42/claude_with_a_frontend_design_skill_vs_without/)
9. [Why Claude UI generations look like AI slop](https://www.reddit.com/r/ClaudeAI/comments/1p9srou/finally_figured_out_why_claudes_ui_generations/)
10. [Can Codex make good UIs with proper skills?](https://www.reddit.com/r/codex/comments/1t3iihr/can_codex_make_good_uis_with_the_proper_skills/)
11. [What Codex skills improve workflow?](https://www.reddit.com/r/codex/comments/1rrjzhv/what_codex_skills_are_actually_improving_your_workflow/)
12. [Codex UI/UX design and skill](https://www.reddit.com/r/codex/comments/1szupli/codex_uiux_design_and_skill/)
13. [Frontend-design + UI UX Pro Max still looks generic](https://www.reddit.com/r/ClaudeAI/comments/1t24gan/few_months_of_frontenddesign_uiuxpromaxskill/)
14. [Skill to stop Claude Code building generic AI-slop websites](https://www.reddit.com/r/claudeskills/comments/1tu4v6s/made_a_skill_to_stop_claude_code_from_building/)
15. [Making Codex better at UI/frontend design](https://www.reddit.com/r/codex/comments/1rx5wy7/has_anyone_learned_ways_to_make_codex_better_at/)
16. [Which skill keeps Claude sites from looking AI-generated?](https://www.reddit.com/r/ClaudeAI/comments/1txvaef/if_you_used_claude_to_build_your_website_which/)
17. [How to make a nice UI/frontend with Codex](https://www.reddit.com/r/codex/comments/1swbf35/how_to_make_a_nice_uifrontend/)
18. [Best current frontend design tactic](https://www.reddit.com/r/vibecoding/comments/1t33i0h/best_current_frontend_design_tactic/)
19. [Better mobile UI cards with Claude](https://www.reddit.com/r/ClaudeAI/comments/1rwu3q/how_can_i_get_claude_to_design_better_mobile_ui/)
20. [Favorite UI/UX Codex skill](https://www.reddit.com/r/codex/comments/1tbnfhn/whats_your_favorite_uiux_codex_skill_and_why/)

## Independent proof references

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — accessibility requirements and testable success criteria.
- [GOV.UK design principles](https://www.gov.uk/guidance/government-design-principles) — user needs, simplicity, iteration, and consistency without uniformity.
- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) — primary source for what the named skill actually instructs.
- [Playwright documentation](https://playwright.dev/docs/test-intro) — browser testing and rendered behavior evidence.
- [axe-core documentation](https://github.com/dequelabs/axe-core) — automated accessibility testing boundaries.
- [LaunchPad browser fixture](../tests/browser/quality.spec.mjs) — local reproducible browser and accessibility tests.
- [LaunchPad benchmark harness](../scripts/run-benchmark.mjs) — repeated generator/evaluator workflow testing.

These sources support the proof policy; they do not convert Reddit observations into facts automatically.
