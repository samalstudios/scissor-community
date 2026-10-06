# Showcase

Artwork made in [Scissor](https://scissor.studio), shared by the people who made it.
Scissor shows these pieces in its New dialog, where anyone can open the document
and see how it was built. The site picks up this folder on every deploy.

## Add your artwork

1. [Fork this repository](https://github.com/samalstudios/scissor-community/fork).
2. Add a folder `showcase/<name>/`. The name uses lowercase letters, digits and
   hyphens, such as `showcase/night-harbour/`. It holds exactly three files:

   | File | What it is |
   | --- | --- |
   | `artwork.cut` | The document, saved from Scissor with File ▸ Save. At most 10 MB. |
   | `preview.webp` or `preview.png` | A picture of the artwork: File ▸ Export ▸ Export for Screens… lets you pick WebP or PNG and a scale. At most 1600 px on its long side and under 1 MB. 1200 to 1600 px looks best. |
   | `info.json` | The title, your name and the licence, as below. |

3. Open a pull request with the showcase checklist in its description and tick
   every item: add `template=showcase.md` to the address of the new pull
   request page (for example
   `…/compare/main...you:night-harbour?template=showcase.md`), or paste it
   unchanged from
   [`.github/PULL_REQUEST_TEMPLATE/showcase.md`](../.github/PULL_REQUEST_TEMPLATE/showcase.md).

A check runs on every pull request and lists anything that needs fixing,
including checklist items that are missing or not ticked; editing the
description runs it again. We look at each submission before it goes in and
may decline one without giving a reason.

### info.json

```json
{
  "title": "Night Harbour",
  "artist": "Your Name",
  "artistUrl": "https://example.com",
  "description": "Fishing boats under a full moon.",
  "licence": "CC-BY-4.0",
  "tags": ["landscape", "night", "boats"]
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `title` | yes | At most 80 characters. |
| `artist` | yes | The name to credit, at most 80 characters. |
| `artistUrl` | no | Your site or profile, an `https://` address. |
| `description` | no | One line, at most 280 characters. |
| `licence` | yes | `CC-BY-4.0` or `CC0-1.0`, see below. |
| `tags` | no | Up to 10 search words, each at most 30 characters. |

No other fields, and no line breaks in the text.

## Licences

You choose how others may use the artwork, its preview and its description:

| `licence` | Licence | In short |
| --- | --- | --- |
| `CC-BY-4.0` | [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/) | You keep the copyright. Anyone may use, change and share the work, even commercially, as long as they credit you. |
| `CC0-1.0` | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | You waive your copyright as far as the law allows. Anyone may use the work for anything, without credit. |

Either way, Scissor shows the artwork in the app and on scissor.studio with
the name you give. Both licences are irrevocable: if your entry is removed
later, copies people already made stay under the licence.

## Rules

- Only your own original work, which you have the right to share. No traced
  or copied artwork, and nothing made from other people's photos or drawings
  unless their licence allows it.
- No logos, brand names, characters or other trademarks that are not yours.
- Suitable for everyone: nothing hateful, violent or sexual, and no private
  details about anyone.
- Keep the document whole: Scissor embeds placed images, so leave them
  embedded rather than linking to files elsewhere.

## Taking your artwork down

Open a pull request that deletes your folder, or
[open an issue](https://github.com/samalstudios/scissor-community/issues/new/choose)
and we will remove it.
