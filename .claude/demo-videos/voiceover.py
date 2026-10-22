"""Builds a film's voiceover: one WAV, each scene's lines starting as its caption appears.

    python3 demo-videos/voiceover.py demo-videos/narration/<film>.json demo-videos/out/<film>.scenes.json out.wav

The narration file names the macOS voice and gives one entry per scene, in
order; the scenes file is the one to-mp4.mjs writes beside the film, so the
lines follow the film as it was cut. Each entry is spoken by ``say`` at an
ordinary pace, and spoken faster, up to a limit, when it would run into the
next scene. A line still too long at the limit is reported rather than
squeezed further, because past that pace it stops being understandable.
The first entry of ``scenes`` from to-mp4.mjs is the film's own start, before
the first caption, and is skipped when there is one more start than lines.

Pass the WAV to the joiner as ``AUDIO=out.wav node demo-videos/to-mp4.mjs ...``.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

RATE = 44100
PACE = 178
FASTEST = 215
LEAD_IN = 0.35
GAP = 0.45


def spoken(text: str, voice: str, pace: int, folder: str) -> bytes:
    """Frames of *text* in *voice* at *pace* words a minute, 16-bit mono."""
    path = os.path.join(folder, "line.wav")
    subprocess.run(
        ["say", "-v", voice, "-r", str(pace), "--file-format=WAVE",
         f"--data-format=LEI16@{RATE}", "-o", path, text],
        check=True,
    )
    with wave.open(path) as clip:
        assert clip.getnchannels() == 1 and clip.getsampwidth() == 2 and clip.getframerate() == RATE
        return clip.readframes(clip.getnframes())


def main(narration_path: str, scenes_path: str, out_path: str) -> None:
    narration = json.load(open(narration_path))
    timeline = json.load(open(scenes_path))
    starts = timeline["scenes"]
    lines = narration["scenes"]
    if len(starts) == len(lines) + 1:
        starts = starts[1:]
    if len(starts) != len(lines):
        sys.exit(f"{len(lines)} lines of narration for {len(starts)} scenes; they must match.")
    ends = starts[1:] + [timeline["seconds"]]
    track = bytearray(int(timeline["seconds"] * RATE) * 2)
    with tempfile.TemporaryDirectory() as folder:
        for number, (text, start, end) in enumerate(zip(lines, starts, ends), start=1):
            room = end - start - LEAD_IN - GAP
            pace = PACE
            frames = spoken(text, narration["voice"], pace, folder)
            while len(frames) / 2 / RATE > room and pace < FASTEST:
                pace = min(FASTEST, pace + 8)
                frames = spoken(text, narration["voice"], pace, folder)
            length = len(frames) / 2 / RATE
            status = "ok" if length <= room else f"TOO LONG by {length - room:.1f}s"
            print(f"scene {number:2}: {length:5.1f}s of {room:5.1f}s at {pace} wpm  {status}")
            at = int((start + LEAD_IN) * RATE) * 2
            track[at:at + len(frames)] = frames[: max(0, len(track) - at)]
    with wave.open(out_path, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(bytes(track))
    print(out_path)


if __name__ == "__main__":
    main(*sys.argv[1:4])
