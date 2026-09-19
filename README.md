# Hello & Welcome! 👋

You have found the `readme` for the [rehanbutt.com](https://rehanbutt.com) codebase. Feel free to explore the code and see how my site is built.

I use [Jekyll](https://jekyllrb.com) as my static site templating engine and [Foundation for Site](https://get.foundation/sites.html) as my CSS and JS framework. Current using Version 6.6.3

Curious how the site has evolved over time? Check out the [releases](https://github.com/naher94/rehanbutt.com/releases) over the years. Pretty fun to time travel! Like my own personal [waybackmachine](http://web.archive.org). 😉

## Documentation

The working notes live in [`docs/`](docs/):

| | |
| :--- | :--- |
| [Content Notes](docs/content.md) | Conventions for adding projects, photosets and resources |
| [Development Notes](docs/development.md) | Jekyll, Liquid, collections, and the front matter each content type expects |
| [Type System](docs/type-system.md) | The two registers, the two families, and the type maps |
| [Tooling](docs/tooling.md) | The colour, type and CSS audits, and the cascade engine they share |
| [Reference](docs/reference.md) | Where the site is linked from |

## Production Notes

Run Jekyll with `--livereload` automatically refresh the page with each change you make to the source files `jekyll s --livereload` or `--port 4500` to run a couple Jekyll sites in parallel. When using `--livereload` for concurrent sites make sure to set a port for `--livereload` like `jekyll s --livereload --livereload-port 8080 --port 4001`

Jekyll uses the `Kramdown` markdown parser allowing for extended functionality, such as adding classes to elements.
- [Styling Jekyll Markdown](https://digitaldrummerj.me/styling-jekyll-markdown/)
- [Kramdown - Quick Reference](https://kramdown.gettalong.org/quickref.html)

Jekyll also uses the `Liquid` language as its templating language. Here are a couple great references:
- [Shopify Cheat Sheet](https://www.shopify.com/partners/shopify-cheat-sheet)
- [Liquid Cheat Sheet](https://shopify.github.io/liquid/)
- [Jekyll Cheat Sheet](https://learn.cloudcannon.com/jekyll-cheat-sheet/)
- [Liquid for Designs Wiki](https://github.com/Shopify/liquid/wiki/Liquid-for-Designers)
- [cloudcannon Tutorial Directory](https://learn.cloudcannon.com/jekyll-liquid/#list)
- [Generating an array with Liquid](https://heliumdev.com/blog/create-an-array-in-shopifys-liquid)
