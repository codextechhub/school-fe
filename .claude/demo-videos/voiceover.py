"""Builds a film's voiceover: one WAV, each scene's lines starting as its caption appears.

    python3 demo-videos/voiceover.py demo-videos/narration/<film>.json demo-videos/out/<film>.scenes.json out.wav

The narration file names the voice and gives one entry per scene, in order.
A plain name is a macOS voice spoken by ``say`` (``"Tessa"``). A name starting
``azure:`` is a Microsoft Azure neural voice (``"azure:en-NG-EzinneNeural"``),
which needs ``AZURE_SPEECH_KEY`` and ``AZURE_SPEECH_REGION`` set to the Speech
resource's key and region; the key is read from the environment and never
stored in a file.

An entry is the scene's text, or a list of ``[seconds, text]`` pairs for a
long scene whose actions each deserve their own line, each starting that many
seconds into the scene; the scenes file is the one to-mp4.mjs writes beside the
film, so the lines follow the film as it was cut. Each entry is spoken at an
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
import urllib.request
import wave
from xml.sax.saxutils import escape

RATE = 44100
PACE = 178
FASTEST = 215
LEAD_IN = 0.35
GAP = 0.45


def azure_wav(text: str, voice: str, pace: int, path: str) -> None:
    """Writes *text* in the Azure neural *voice* to *path* as a 44.1 kHz mono WAV.

    Azure has no words-a-minute setting, so *pace* becomes a rate relative to
    the ordinary pace: ``PACE`` speaks at the voice's own speed and each step
    faster speeds it by the same share ``say`` would.
    """
    key, region = os.environ.get("AZURE_SPEECH_KEY"), os.environ.get("AZURE_SPEECH_REGION")
    if not key or not region:
        sys.exit("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION to the Azure Speech resource's key and region.")
    rate = f"{(pace / PACE - 1) * 100:+.0f}%"
    ssml = (
        f'<speak version="1.0" xml:lang="en-NG"><voice name="{voice}">'
        f'<prosody rate="{rate}">{escape(text)}</prosody></voice></speak>'
    )
    request = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "riff-44100hz-16bit-mono-pcm",
            "User-Agent": "xvs-demo-voiceover",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response, open(path, "wb") as out:
        out.write(response.read())


def spoken(text: str, voice: str, pace: int, folder: str) -> bytes:
    """Frames of *text* in *voice* at *pace* words a minute, 16-bit mono."""
    path = os.path.join(folder, "line.wav")
    if voice.startswith("azure:"):
        azure_wav(text, voice.removeprefix("azure:"), pace, path)
    else:
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
        for number, (entry, start, end) in enumerate(zip(lines, starts, ends), start=1):
            pieces = [(0.0, entry)] if isinstance(entry, str) else [(float(t), text) for t, text in entry]
            for index, (offset, text) in enumerate(pieces):
                begin = start + offset
                finish = start + pieces[index + 1][0] if index + 1 < len(pieces) else end
                room = finish - begin - LEAD_IN - GAP
                pace = PACE
                frames = spoken(text, narration["voice"], pace, folder)
                while len(frames) / 2 / RATE > room and pace < FASTEST:
                    pace = min(FASTEST, pace + 8)
                    frames = spoken(text, narration["voice"], pace, folder)
                length = len(frames) / 2 / RATE
                status = "ok" if length <= room else f"TOO LONG by {length - room:.1f}s"
                label = f"{number}{'abcdefgh'[index] if len(pieces) > 1 else ''}"
                print(f"scene {label:>3}: {length:5.1f}s of {room:5.1f}s at {pace} wpm  {status}")
                at = int((begin + LEAD_IN) * RATE) * 2
                track[at:at + len(frames)] = frames[: max(0, len(track) - at)]
    with wave.open(out_path, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(bytes(track))
    print(out_path)


if __name__ == "__main__":
    main(*sys.argv[1:4])
