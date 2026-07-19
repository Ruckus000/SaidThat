# DesignOps review

Read the current phase artifacts and `.designops/09-review-report.json`. Run the applicable gate without `--write` and present:

- machine-check status;
- approval digest;
- unresolved assumptions and evidence gaps;
- the exact human-review dimensions for this phase.

Ask the user for an explicit decision. Do not infer approval, create an approval record before that decision, access a private key, or sign the record. If approval is explicitly supplied, prepare only the review draft and leave signing to the reviewer outside the agent workflow.

