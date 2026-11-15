# Fonts

Self-hosted so the bench loads the same type everywhere, with no third-party
request and no dependency on a font CDN.

| file | family | license |
|---|---|---|
| `jetbrains-mono-latin.woff2` | JetBrains Mono | OFL 1.1 (`jetbrainsmono-OFL.txt`) |
| `jetbrains-mono-latin-ext.woff2` | JetBrains Mono | OFL 1.1 |
| `ibm-plex-sans-latin.woff2` | IBM Plex Sans | OFL 1.1 (`ibmplexsans-OFL.txt`) |
| `ibm-plex-sans-latin-ext.woff2` | IBM Plex Sans | OFL 1.1 |
| `ibm-plex-sans-thai-400.woff2` | IBM Plex Sans Thai | OFL 1.1 (`ibmplexsansthai-OFL.txt`) |
| `ibm-plex-sans-thai-600.woff2` | IBM Plex Sans Thai | OFL 1.1 |

The SIL Open Font License lets you use, embed, and redistribute these fonts,
including in a commercial project, as long as the license travels with them.
The three license files in this folder are the ones that ship with the
upstream families.

Two of the families carry a Reserved Font Name. IBM Plex and JetBrains Mono
both reserve their family names, so these files are used unmodified and are
never renamed.

## Where they came from

Latin and Latin-ext subsets were taken from the Google Fonts API, which serves
the upstream release files. The Thai subset of IBM Plex Sans Thai was taken
the same way. Each woff2 holds every weight of its family as a variable font,
except the Thai faces, which Google Fonts ships as static instances at 400
and 600.

## Adding a weight or a family

The `@font-face` blocks in `app.css` carry the unicode-range for each subset,
so a browser only downloads the Latin-ext and Thai files when a page needs
those glyphs. Adding another family means dropping the woff2 in here, adding
its license file, and adding a `@font-face` block.
