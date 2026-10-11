# Naval game audio

Selected by the owner on 2026-10-11. These are third-party assets, not ZEVA-original audio. Source pages identify the Pixabay Content License. Preserve provenance when publishing them as integrated game assets.

| Local filename | Source | State |
| --- | --- | --- |
| nhacnen.mp3 | [Adventures in the Sea — Luis Humanoide](https://pixabay.com/music/main-title-adventures-in-the-sea-cinematic-orchestral-adventure-music-154881/) | Copied from owner's Downloads/nhacnen.mp3 |
| cannon-fire-161072.mp3 | [Cannon Fire — LordSonny](https://pixabay.com/sound-effects/film-special-effects-cannon-fire-161072/) | Copied from owner-provided Downloads/nhạc |
| wooden-ship-break-85277.mp3 | [Wooden Ship Break — Kodack / freesound_community](https://pixabay.com/sound-effects/film-special-effects-wooden-ship-break-85277/) | Copied from owner-provided Downloads/nhạc |
| massive-explosion-2-397983.mp3 | [Massive Explosion - 2 — DRAGON-STUDIO](https://pixabay.com/sound-effects/film-special-effects-massive-explosion-2-397983/) | Copied from owner-provided Downloads/nhạc |
| big-bubbles-1-169077.mp3 | [Big Bubbles 1 — floraphonic](https://pixabay.com/sound-effects/film-special-effects-big-bubbles-1-169077/) | Copied from owner-provided Downloads/nhạc |

All five MP3 files were supplied by the owner in Downloads/nhạc.

Runtime serves files from the existing bungbutq/zeva-education-app repository under game/hai-chien-tu-vung/audio/. Set window.ZevaNavalAudioBase before loading the client to override the default URL; use a commit-pinned URL for a reproducible release once the assets have been published. For local HTTP previews set it to './audio/'. Do not attach access tokens to asset URLs.

Background music loops at a low level; effects duck the music. One cannon sound per volley; wood break at final projectile impact; explosion and then bubbles only on the tenth hit. Sound preferences are local, gameplay remains read-only, and closing the dialog stops audio. Failed/missing audio never delays gameplay.
