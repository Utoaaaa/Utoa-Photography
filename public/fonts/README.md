Add webfonts here to self-host typography used on the site.

Recommended structure for Traditional Chinese serif (Noto Serif TC):

public/
  fonts/
    noto-serif-tc/
      NotoSerifTC-Light.woff2      # weight 300
      NotoSerifTC-Regular.woff2    # weight 400
      NotoSerifTC-SemiBold.woff2   # weight 600
      NotoSerifTC-Bold.woff2       # weight 700

Notes
- File names must match the CSS @font-face in src/app/globals.css.
- Use WOFF2 format for best compression and compatibility.
- Keep weights to what you actually use to reduce bundle size.
- If you prefer a different CJK serif (e.g., Source Han Serif), place files here and update the @font-face sources and family name accordingly.
