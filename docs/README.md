# Documentation

Working notes for the [rehanbutt.com](https://rehanbutt.com) codebase. The root
[README](../README.md) covers what the site is and how to run it; everything that
describes how it is built lives here.

| | |
| :--- | :--- |
| [Content Notes](content.md) | Conventions for adding projects, photosets and resources |
| [Development Notes](development.md) | Jekyll, Liquid, collections, and the front matter each content type expects |
| [Type System](type-system.md) | The two registers, the two families, and the `$product-type` / `$expressive-type` maps |
| [Tooling](tooling.md) | The colour, type and CSS audits, and the cascade engine they share |
| [Reference](reference.md) | Where the site is linked from |

These files sit in the repo rather than in a GitHub wiki so that documentation
changes travel in the same commit as the code they describe. A wiki lives in a
separate repository, which is how a page goes stale without anything in a diff
saying so.

They are excluded from the Jekyll build, so nothing here is published to the
site.
