# CVPilot

CVPilot helps candidates build resumes, generate tailored cover letters, and publish a personal portfolio; recruiters post jobs and review applicants through the same platform.

## Language

**Resume**:
A candidate's structured career document (contact info, experience, education, skills) stored per candidate; the single source of truth Cover Letter and Portfolio generation draw from.
_Avoid_: CV — used only in user-facing French copy for the same concept, never as a separate term in code or docs.

**Primary Resume**:
The one Resume a candidate has designated as authoritative when they hold more than one. Exactly zero or one Resume per candidate is primary at a time; a candidate's first Resume becomes primary automatically, and deleting the primary auto-promotes the next most recently updated Resume.
_Avoid_: Default resume, active resume.

**Portfolio**:
A candidate's published personal site, built from their Resume data, used to showcase their work to visitors outside the platform.
_Avoid_: Website — the implementation-layer name for the same concept (`WebsiteConfig`); don't treat them as different things.

**Portfolio Visitor**:
An unauthenticated external party who reaches a candidate's published Portfolio and contacts its owner through the "Me Contacter" form. Has no account and no persistent identity in the system.
_Avoid_: User — a Portfolio Visitor is never a signed-in User of the platform.
