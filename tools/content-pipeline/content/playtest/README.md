Device playtest exports land here.

Export from the app: Settings → EXPORT PLAYTEST DATA, then drop the JSON in this
directory and run:

    node tools/content-pipeline/bin/import-playtest.mjs --deck pop-voices

Files are per-card counts only. Nothing here identifies a player or a device.
