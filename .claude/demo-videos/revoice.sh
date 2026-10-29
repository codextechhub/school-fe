#!/usr/bin/env bash
#
# Re-voices the finished films from their recordings, with no re-filming.
#
# For each film, voiceover.py speaks narration/<film>.json in the voice it
# names, timed by the film's existing out/<film>.scenes.json, and to-mp4.mjs
# joins that track onto the same recorded parts the film was cut from. The
# part lists live in out/<folder>/parts.txt, one .webm path per line, in order.
# Finished films land in out/<voice-folder>/, so the earlier voice's copies in
# out/ stay as they are.
#
#   cd .claude && demo-videos/revoice.sh ezinne                    # all five
#   cd .claude && demo-videos/revoice.sh ezinne more-than-fees     # one film
#
# With RECORDINGS set to a folder of a person's takes, each film's voiceover is
# fitted from its recording by fit-recording.py instead of being spoken:
#
#   cd .claude && RECORDINGS=~/Desktop/narration demo-videos/revoice.sh recorded
#
# An Azure voice needs AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the
# environment (see voiceover.py).
set -euo pipefail

FOLDER="${1:?usage: demo-videos/revoice.sh <output-folder> [film ...]}"
shift
PYTHON="${PYTHON:-/Users/mac/anaconda3/bin/python}"
OUT="$PWD/demo-videos/out"

# Film name, then the folder holding its recorded parts.
FILMS=(
  "school-fees-walkthrough fees"
  "buying-for-the-school procurement"
  "more-than-fees finance-more"
  "running-the-school school"
  "messaging-at-school messaging"
)

mkdir -p "$OUT/$FOLDER"
for entry in "${FILMS[@]}"; do
  read -r film parts <<<"$entry"
  if [[ $# -gt 0 && ! " $* " == *" $film "* ]]; then continue; fi
  echo "==> $film"
  if [[ -n "${RECORDINGS:-}" ]]; then
    "$PYTHON" demo-videos/fit-recording.py "$film" "$RECORDINGS" "$OUT/$FOLDER/$film.wav"
  else
    "$PYTHON" demo-videos/voiceover.py "demo-videos/narration/$film.json" \
      "$OUT/$film.scenes.json" "$OUT/$FOLDER/$film.wav"
  fi
  recordings=()
  while IFS= read -r part; do recordings+=("$part"); done < "$OUT/$parts/parts.txt"
  AUDIO="$OUT/$FOLDER/$film.wav" node demo-videos/to-mp4.mjs \
    "$OUT/$FOLDER/$film.mp4" "${recordings[@]}" 2>&1 | tail -1
done
