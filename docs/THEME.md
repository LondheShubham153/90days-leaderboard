# The UI and its theme

The frontend uses the TrainWithShubham brand: purple and amber from the TWS logo on black, heavy italic type, the rocket monogram, and the logo's orbit arc behind the title.

| Token | Value | Used for |
| --- | --- | --- |
| `--purple` | `#7a4fc4` | Fills, borders, the progress strips |
| `--lift` | `#a98af0` | Purple **text**, ranks, focus accents |
| `--amber` | `#ffc875` | The winner, streaks, highlights |
| `--ink` / `--panel` | `#0a0710` / `#130e1f` | Page and card backgrounds |

The tokens live at the top of [`frontend/src/styles.css`](../frontend/src/styles.css); change them there and the whole app follows.

- **Why two purples?** The brand purple is only 3.5:1 against the black background, below the 4.5:1 that small text needs. Text uses the lighter `--lift` (7.2:1); the brand purple stays on fills and borders. Amber measures 13:1.
- **Fonts:** [Archivo](https://fonts.google.com/specimen/Archivo) (display, expanded italic) and [Barlow](https://fonts.google.com/specimen/Barlow) (body), loaded in [`frontend/index.html`](../frontend/index.html).
- **Phones:** below 720px the podium becomes a ranked list with the leader first, and the progress strips are hidden.
- **Motion:** the entrance animations and the drifting rocket stop under `prefers-reduced-motion`.
- **Logo files:** `frontend/public/rocket.png` (the monogram, transparent background, used for the favicon and the hero) and `tws-logo.png` (the full lockup, cropped to the artwork and shown at the top; its black square is hidden on the dark page with `mix-blend-mode: screen`).
- **Links out:** the header button and the footer both point at the [90DaysOfDevOps challenge repo](https://github.com/TrainWithShubham/90DaysOfDevOps).

> **Testing a phone layout in headless Chrome:** its minimum window is about 500px wide, so a 390px capture shows a cropped 500px layout. Load the page in a 390px `<iframe>` instead to see the real mobile layout.
