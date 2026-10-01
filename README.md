# Scissor community

Public home for [Scissor](https://scissor.studio), the vector and pixel design studio that runs in your browser.

- **Report a bug or suggest a feature:** [open an issue](https://github.com/samalstudios/scissor-community/issues/new/choose), or use Help ▸ Report an Issue inside Scissor.
- **User manual:** [scissor.studio/manual](https://scissor.studio/manual/). Its source is in [`manual/`](manual).
- **Sample files:** [`samples/`](samples) holds the `.cut` documents offered under New ▸ Samples.
- **Library:** [`library/`](library) holds the free shapes and drawings in Scissor's Library panel. See [its README](library/README.md) to add one.

## Manual

Each page is an HTML fragment in `manual/pages/`, styled by `manual/manual.css`, with images in `manual/img/` (a `name-light.png` gets a `name-dark.png` twin for dark mode when one exists). The Scissor site picks up this repository on every deploy.

### Translations

The manual is translated into multiple languages. Each language has its own subdirectory under `manual/pages/`:

- `manual/pages/de/` — German (Deutsch)
- `manual/pages/es/` — Spanish (Español)
- `manual/pages/fr/` — French (Français)

The English original lives directly in `manual/pages/`. The build script (`scripts/build-manual.mjs` in the main Scissor repo) detects all language subdirectories and builds each into its own `/manual/<lang>/` path.

---

© Samal Studios. The manual is licensed under [CC BY-NC-ND 4.0](manual/LICENSE) the sample files under [CC BY 4.0](samples/LICENSE) and the library under [CC0 1.0](library/LICENSE); see [LICENSE.md](LICENSE.md). The Scissor application itself is proprietary.
