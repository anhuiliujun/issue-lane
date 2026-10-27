# Design

This file is for people and agents changing the interface. The shadcn CLI does not read it. After `shadcn init`, tokens are applied by hand in `app/globals.css`.

Do not treat a third-party Linear `design.md` as the spec. Linear does not publish one. The only brand source used here is the public brand page: https://linear.app/brand

## Intent

A dense work surface for one team: sidebar, issue list, board, and issue page. English copy. Close to Linear in information density, not in pixels.

## Brand

- Mercury White `#F4F5F8` is the canvas.
- Nordic Gray `#222326` is the ink and the primary button.

Status colors and priority colors are data on workflow rows and the priority scale. They are not theme tokens.

## Density

- Body text is 13px with a 1.45 line height.
- List rows are 32px. Board cards stay within about three lines.
- Borders are hairlines. Radius is 6px.
- The sidebar is 220px. The issue property rail is 260px.
- Identifiers use Geist Mono (`LANE-12`). Everything else uses Inter.

## Components

shadcn/ui, initialized with the mira preset on Base UI, supplies the controls. ReUI is the `@reui` registry in `components.json` and is installed with the shadcn CLI. It does not replace shadcn. The board uses the ReUI kanban primitive.

Keep new chrome on these tokens. Do not introduce a second visual system.
