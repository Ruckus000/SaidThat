# AI Slop Design Practices: Detection, Prevention, and Review

## Executive summary

AI slop design is not a particular color, framework, or visual style. It is work that looks finished while lacking a meaningful connection to users, subject matter, content, interaction requirements, or implementation reality.

The practical response is not to replace one set of defaults with an anti-default style. It is to require evidence, make design decisions explicit, force genuine divergence before convergence, and review the result across usability, accessibility, truthfulness, specificity, and craft.

## 1. Strategy slop

Strategy slop appears before visual design:

- invented personas presented as research;
- generic industry assumptions replacing user evidence;
- vague goals such as “modernize the experience”;
- unsupported claims about trust, conversion, or user preference;
- no distinction between a proposal’s evaluator and a product’s end user;
- no account of content owners, operational constraints, or maintenance.

Prevention: write an evidence brief, list evidence gaps, identify the highest-value tasks, map requirements and claims, and label assumptions explicitly. Exact evidence references and hashes provide traceability, not proof that a design decision is correct. Precommit a falsifier for any high-risk assumption controlling a primary task or interaction model.

## 2. Content slop

Content slop includes feature soup, inflated headlines, filler eyebrows, meaningless statistics, fake testimonials, generic calls to action, and placeholder content that quietly becomes final content.

Prevention: design with realistic content, define the job of every label and section, maintain a claims registry, and test long, short, missing, and error content before approval.

## 3. Composition slop

Common signals include interchangeable centered heroes, three equal feature cards, dashboard card walls, repeated split sections, excessive pill labels, decorative numbering, giant rounded panels, and the same section rhythm on every page.

These are signals, not automatic failures. They become a quality problem when they are repeated without a content reason, flatten hierarchy, or could be moved to another project without changing the design.

Prevention: require a content-to-structure map, vary composition according to information type, and explain why any repeated structural device exists.

## 4. Aesthetic slop

Signals include unmotivated purple gradients, generic dark themes, glassmorphism applied everywhere, identical cream/editorial treatments, interchangeable font pairings, stock-like imagery, and decorative texture with no relationship to the subject.

Prevention: define a specificity thesis, use subject-specific references, choose one signature risk, and keep the rest of the system disciplined. A gradient, serif, dark theme, or rounded card is acceptable when the brief and rationale support it.

## 5. Interaction slop

Interaction slop includes fake buttons, hover-only meaning, unnecessary modals, scroll hijacking, excessive animation, chat assistants added without a user need, missing loading/error/empty states, and controls that look interactive but do nothing.

Prevention: model task flows and state transitions before polishing visuals. Motion must support orientation, feedback, or continuity; it must respect reduced-motion preferences and never be the only way to understand a state.

## 6. Design-system slop

Design-system slop uses semantic names without semantic discipline. Warning signs include arbitrary tokens, raw values bypassing tokens, uncontrolled variants, inconsistent spacing, mixed icon families, one component pattern repeated everywhere, and undocumented exceptions.

Prevention: use a small DTCG-compatible token contract, separate primitives from semantic roles, document exceptions, and validate actual usage rather than only validating token JSON.

## 7. Asset slop

Asset slop includes inconsistent image treatment, generated images with artifacts, unreadable text embedded in images, decorative charts, meaningless illustrations, and alt text that describes appearance but not purpose.

Prevention: give each asset a communication job, use real or clearly labeled representative content, provide text alternatives, and review image crops and charts at mobile sizes.

## 8. Implementation slop

Implementation slop includes brittle CSS, broken responsive behavior, invalid semantics, missing focus states, inaccessible forms, placeholder data, arbitrary utility-class accumulation, and visual polish that cannot survive realistic content.

Prevention: make implementation-readiness a gate, inspect browser output at representative breakpoints, and hand off a Design DNA contract rather than an aesthetic mood alone.

## 9. Anti-slop protocol

For each project:

1. Establish users, tasks, content, requirements, constraints, and evidence gaps.
2. Write a specificity thesis and identify one memorable signature.
3. Generate three directions that differ across typography, composition, density, geometry, color, imagery, and signature.
4. Reject directions that are only font or color variations.
5. Require at least one territory to challenge each high-risk core assumption.
6. When a direction depends on such an assumption, freeze a genuine countermodel, shared content, protocol, and kill criteria before formative testing.
7. Approve a Design DNA contract with rationale and explicit exceptions only after applicable kill criteria remain clear.
8. Map realistic content and all required states.
9. Implement only after approval, then run automated checks, accessibility review, screenshot review, and human critique.
10. Compare the result against previous project fingerprints and update the system only in response to observed failure.

## 10. Review questions

- What user need does this element serve?
- What evidence led to this decision?
- What makes this recognizably specific to the subject?
- Would the layout still look the same if the brand name and copy were removed?
- Does the content justify the component, or did the component dictate the content?
- What happens when content is missing, long, slow, invalid, or unavailable?
- Can the experience be used with keyboard, zoom, touch, and reduced motion?
- Which defaults were used, and why are they appropriate here?
- What is the one signature choice, and what decoration was deliberately removed to protect it?

## 11. Severity model

- **P0**: inaccessible, misleading, fabricated, broken, or missing a critical task/state. Must fix.
- **P1**: generic, unsupported, inconsistent, or materially weak design decision. Fix before final approval.
- **P2**: polish, refinement, or minor consistency issue. Address when valuable.

No visual score can compensate for a P0 failure.

## Sources and standards

- [GOV.UK Government Design Principles](https://www.gov.uk/guidance/government-design-principles)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [USWDS Accessibility](https://designsystem.digital.gov/documentation/accessibility/)
- [Anthropic frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md)
- [DTCG Design Tokens Format 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)
- [AI-Generated “Workslop” Is Destroying Productivity](https://hbr.org/2025/09/ai-generated-workslop-is-destroying-productivity)
