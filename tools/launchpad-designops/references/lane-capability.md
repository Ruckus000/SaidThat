# Lane Capability Matrix (0.2)

Detection does not imply release qualification.

| Lane | Detection | Artifact audit | Browser verification | Token guidance | Release status | Known boundary |
|---|---|---|---|---|---|---|
| Next.js / Tailwind | Dependency, config, and nested workspace signals | Supported | Runnable fixture through production runner | Supported | Qualified for configured routes | Auth, Server Actions, and data stores need project-owned task tests |
| Vite / React | Dependency, config, and nested workspace signals | Supported | Runnable fixture through production runner | Supported | Qualified for configured routes | Backend behavior remains project-owned |
| WordPress | Core/template signals | Template-aware | Official WordPress + WP-CLI + MariaDB Compose fixture | Theme-oriented | Qualified for configured public routes | Third-party plugins and authenticated wp-admin workflows need project-owned tests; Docker required |
| Laravel / Blade | Composer, Artisan, and view signals | Template-aware | Pinned Laravel 12 Composer/Container fixture | Blade-oriented | Qualified for configured public routes | Auth, queues, databases, and production server behavior need project-owned tests; Docker required |

All four fixtures run Chromium, Firefox, and WebKit at 375×812, 768×1024, 1024×768, and 1440×1000, pass project-owned keyboard/touch tasks, traverse signed phase reviews, receive release approval, and then prove source mutation invalidates verification. Passing a fixture qualifies the bounded runner and lane adapter; it does not prove an arbitrary project passed. Each project must generate current project-scoped evidence.

The WordPress and Laravel fixtures use pinned framework/image versions and require an available Docker daemon with Compose. Their qualification is intentionally bounded to the declared fixture behavior and documented limitations.
