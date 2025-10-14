# Test Image Generator

This utility creates a small collection of branded PNG files that are useful for local testing and demo uploads. The output images live in `tests/fixtures/images/` and each one includes gradients, overlays, and text labels so it is obvious which file is being used in screenshots.

## Usage

| Command | Description |
| --- | --- |
| `npm run generate:test-images` | Regenerate the PNG fixtures and update `metadata.json`. |
| `npm run seed:test-images` | Upsert the fixture images into the local Prisma database as assets. |
| `npm run generate:test-images:seed` | Convenience command that runs both of the above sequentially. |

Running the generator will:

- Ensure the fixture directory exists (`tests/fixtures/images`).
- Render four PNG files (landscape, portrait, square, and editorial aspect ratios) using SVG + Sharp.
- Emit a `metadata.json` file describing every generated asset.

The seeding step reads `metadata.json` and upserts the matching rows in the `Asset` table (IDs are namespaced with `fixture-test-image-*`). The commands are idempotent; re-running them simply overwrites the existing files and updates the database records. Feel free to adjust the presets inside `index.js` if you need different dimensions, colours, or labels.
