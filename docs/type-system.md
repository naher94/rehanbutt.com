# Type System

`_sass/variables.scss` holds the type vocabulary beside `$semantic-colors`. It is
two maps and one mixin, and the register is named at the call site:

```scss
h2            { @include type-style(product, section-title); }
.count .value { @include type-style(expressive, counter); }
```

## The two registers

**Product** type is engineered for consistency across many pages, which makes it
right for the templated work that carries most of the site — project pages,
resource collections, articles. One decision here lands on seventy-odd pages, so
it has to be systematic and sit on the scale.

**Expressive** type is set for a single moment, to carry a graphic idea that
appears nowhere else — a hero, a statement over an image, a standalone numeral.
It answers to that moment and to nothing else, and it is free to be hand-tuned
because there is no second instance to stay consistent with.

The axis is **repetition, not volume**. Loud is not expressive: the post callouts
run across eleven case studies and the tag headings repeat sixty times down one
page, so both are product however large they are set. The useful test is how many
places a style has to keep working in, which is why `$expressive-type` is the
short map and should stay that way — a style that turns up on a second page has
stopped being expressive and belongs in `$product-type`.

The register sits in the call rather than on the entry on purpose. Moving a style
between registers is exactly the kind of change that should make you look at
every place it is used.

### Borrowed from Carbon, and where it diverges

The names come from [IBM Carbon's productive/expressive
split](https://carbondesignsystem.com/elements/typography/style-strategies/), but
the axis underneath is not the same one, and it is worth being explicit about
that rather than letting the borrowed name imply more than it should.

Carbon's split is about **user intent** — productive for someone completing a
task through forms and controls, expressive for someone exploring and reading.
That distinction earns its keep on a system spanning a product and a marketing
site. This site is editorial end to end, so that axis would have one value nearly
everywhere. Ours is about **repetition**, which is the thing that actually varies
here.

Two further differences follow from that:

* In Carbon, expressive is a **parallel set** with its own full hierarchy,
  including its own body styles. Here it is a short list of one-offs, and there
  is no expectation that a product entry has an expressive counterpart. The two
  maps are not symmetric and are not meant to be.
* Carbon blends the two **by region** — an expressive moment spans a full page or
  banner, and type stays consistent within any one component. That guidance still
  holds and is worth keeping: mixing registers inside a single card or list is
  how hierarchy gets muddled.

## The two families

**Zilla Slab is the display face**: it names things — headings, titles, nav.
**Lato is the text face**: it is read — sentences, labels, metadata, UI. For
anything ambiguous the test is whether you are *naming* it or *saying* it. A
section header names. A pull-quote says.

Product type follows that rule. **Expressive type is exempt**, which is the point
of it: `counter` is Lato Black at 90px, a text face doing display work, and it is
the most distinctive type on the site precisely because of that.

Zilla has **no size floor**. It is the display face by role rather than by size,
so the nav stays Zilla at every width.

Caveat is the third face and has one job — handwritten annotation on photo
captions. Consolas appears only in code blocks. Neither is in the maps.

## Naming

The name is the job the type does, never a tag and never a rank. A section
heading is `section-title` whether it is marked up as an `h2` or an `h3`, which
is the point: `class="h1"` on an `<h2>` is what this vocabulary exists to avoid.
There are deliberately no numbered names, since `title-1` / `title-2`
reintroduces the same confusion one layer down.

Size lives in the value rather than the name, so `nav-link` can move off 37.5px
onto the scale without anything being renamed.

## Values

`$product-type` is in two halves. **Hierarchy** — `section-title`, `page-title`,
`body`, `body-strong`, `body-sm` — describes rank on the page. **Component
styles** — `nav-link`, `card-title`, `ui`, `eyebrow` — name the thing they are,
and sit apart because nothing is "one step below" a nav link.

`$expressive-type` holds `counter` and `statement`.

Values are the site's current computed values to the pixel, so adopting a style
changes nothing on screen — with one exception. **`statement` is aspirational**:
nothing on the site is set that way yet, and it is commented as such. It is the
slot for a hero line or a statement over an image, set tighter than a heading on
both axes because large type reads loose at settings that suit 16px.

Two recorded facts rather than quiet corrections:

* `section-title` (70px) is **larger** than `page-title` (60px). That inversion is
  real on the site today, so fixing it stays a deliberate edit.
* `counter` is the only style that holds its scale against the body copy beside
  it at every width — 4.5× on desktop and still 2.7× at 375px. Everything else
  that reads as display on desktop compresses toward the body size on mobile,
  because the body itself grows from 20px to 26.4px there while display type
  shrinks.

Sizes are `px` rather than `em` on purpose — an `em` resolves against whichever
parent it lands in, which is how one declaration ended up rendering at six
different sizes.

## API

```scss
@include type-style($register, $style-key);   // emits the whole style
type-value($register, $style-key, $prop);     // reads one property
```

Optional properties (`letter-spacing`, `text-transform`, `font-style`) are only
written when the style defines them, so a rule never carries a
`letter-spacing: normal` it did not ask for — that would override an inherited
value rather than leave it alone.

Both fail the build on an unknown name, with the valid ones listed:

```
Unknown product type style `nosuchstyle`.
Known: section-title, page-title, body, body-strong, body-sm, nav-link, card-title, ui, eyebrow.

Unknown type register `productive`. Known: product, expressive.
```

## Migrating onto it

Little is migrated yet. The type atlas and specimen sheet in
[tooling.md](tooling.md) show what each rule currently resolves to, which is the
input for doing that a rule at a time — in particular the **Across widths** view,
which groups a single element's type across every breakpoint instead of listing
each breakpoint's result as a separate style. Most of what looks like two styles
is one declaration seen at two widths.
