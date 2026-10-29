"""Builds a film's voiceover from a person's recording rather than a synthetic voice.

    python3 demo-videos/fit-recording.py <film> <recordings-folder> out.wav
    python3 demo-videos/fit-recording.py --sheet > lines.json

The reader records each film in one take, reading its lines in order with a
pause of about two seconds between lines, into ``<recordings-folder>/<film>``
with any audio extension macOS reads (.m4a from Voice Memos, .wav, .mp3). A
line they trip over is simply read again after a pause. A line that needs a
second sitting is recorded alone as ``<film>-<line>`` (``more-than-fees-07``)
and replaces whatever the take held for that line.

The take is split at its pauses, and the pieces are matched to the lines in
order by length, against how long each line takes at an ordinary pace. A line
read twice leaves one piece too many, and the earlier reading is the one left
out, so the reader's last attempt is the one kept. Each line is laid at the
moment its caption appears, as voiceover.py lays a synthetic one; a line that
runs long pushes the next one back rather than talking over it, and a line
that would still be speaking when the scene after next begins is reported so
it can be read again more briskly.

``--sheet`` prints every line of every film with the seconds it has, which is
what the printed reading sheet is built from.
"""
import glob
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

from voiceover import GAP, LEAD_IN, PACE, RATE, spoken

HERE = os.path.dirname(os.path.abspath(__file__))
FILMS = [
    "school-fees-walkthrough",
    "more-than-fees",
    "buying-for-the-school",
    "running-the-school",
    "messaging-at-school",
]
FRAME = 0.02
PAUSE = 1.1
SHORTEST = 0.35
BREATH = 0.3
SKIP_COST = 0.6


def lines_of(film: str) -> list[dict]:
    """Every line of *film* in order: its text, when it starts and the seconds it has."""
    narration = json.load(open(os.path.join(HERE, "narration", f"{film}.json")))
    timeline = json.load(open(os.path.join(HERE, "out", f"{film}.scenes.json")))
    starts, entries = timeline["scenes"], narration["scenes"]
    if len(starts) == len(entries) + 1:
        starts = starts[1:]
    ends = starts[1:] + [timeline["seconds"]]
    lines = []
    for entry, start, end in zip(entries, starts, ends):
        pieces = [(0.0, entry)] if isinstance(entry, str) else [(float(t), text) for t, text in entry]
        for index, (offset, text) in enumerate(pieces):
            begin = start + offset
            finish = start + pieces[index + 1][0] if index + 1 < len(pieces) else end
            lines.append({
                "number": len(lines) + 1, "text": text, "begin": begin,
                "seconds": round(finish - begin - LEAD_IN - GAP, 1),
            })
    return lines


def read_audio(path: str, folder: str) -> np.ndarray:
    """*path* as mono samples at ``RATE``, scaled to -1..1, whatever its format.

    The data chunk is read directly because afconvert writes a compressed
    source (a Voice Memos .m4a) as an extensible WAV, which ``wave`` refuses.
    """
    converted = os.path.join(folder, "take.wav")
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", path, converted],
        check=True,
    )
    data = open(converted, "rb").read()
    at = 12
    while data[at:at + 4] != b"data":
        at += 8 + int.from_bytes(data[at + 4:at + 8], "little")
    size = int.from_bytes(data[at + 4:at + 8], "little")
    return np.frombuffer(data[at + 8:at + 8 + size], dtype="<i2").astype(np.float32) / 32768


def speech_spans(samples: np.ndarray) -> list[tuple[int, int]]:
    """The stretches of *samples* between pauses of ``PAUSE`` seconds or more."""
    step = int(FRAME * RATE)
    frames = samples[: len(samples) // step * step].reshape(-1, step)
    level = np.sqrt((frames ** 2).mean(axis=1)) + 1e-9
    loud = level > np.percentile(level, 95) * 0.08
    spans, start, quiet = [], None, 0
    for index, is_loud in enumerate(loud):
        if is_loud:
            start = index if start is None else start
            quiet = 0
        elif start is not None:
            quiet += 1
            if quiet * FRAME >= PAUSE:
                spans.append((start, index - quiet + 1))
                start, quiet = None, 0
    if start is not None:
        spans.append((start, len(loud) - quiet))
    pad = int(0.08 / FRAME)
    return [
        (max(0, a - pad) * step, min(len(loud), b + pad) * step)
        for a, b in spans if (b - a) * FRAME >= SHORTEST
    ]


def match(expected: list[float], found: list[float]) -> list[int]:
    """For each expected length, the index of the found piece read for it.

    Every line takes exactly one piece, in order; a piece left over is a
    repeated or false start and costs ``SKIP_COST``. Lengths are compared as a
    ratio after scaling by the reader's own pace, so a slow reader and a fast
    one match equally well. On a tie the later piece wins, which keeps the
    reader's last attempt at a line they read twice.
    """
    n, m = len(expected), len(found)
    if m < n:
        sys.exit(f"Found {m} spoken pieces for {n} lines. Leave about two seconds between lines.")
    pace = sorted(f / e for f, e in zip(sorted(found), sorted(expected)))[len(expected) // 2]
    cost = lambda i, j: abs(np.log(found[j] / (expected[i] * pace))) - j * 1e-6  # noqa: E731
    best = np.full((n, m), np.inf)
    back = np.zeros((n, m), dtype=int)
    for j in range(m):
        best[0, j] = cost(0, j) + SKIP_COST * j
    for i in range(1, n):
        for j in range(i, m):
            options = [best[i - 1, k] + SKIP_COST * (j - k - 1) for k in range(i - 1, j)]
            k = int(np.argmin(options))
            best[i, j], back[i, j] = options[k] + cost(i, j), k + i - 1
    tail = [best[n - 1, j] + SKIP_COST * (m - 1 - j) for j in range(m)]
    chosen = [int(np.argmin(tail))]
    for i in range(n - 1, 0, -1):
        chosen.append(back[i, chosen[-1]])
    return chosen[::-1]


def build(film: str, folder: str, out_path: str) -> None:
    lines = lines_of(film)
    takes = [p for p in glob.glob(os.path.join(folder, f"{film}.*"))]
    if len(takes) != 1:
        sys.exit(f"Expected one recording named {film}.<ext> in {folder}, found {len(takes)}.")
    timeline = json.load(open(os.path.join(HERE, "out", f"{film}.scenes.json")))
    with tempfile.TemporaryDirectory() as scratch:
        samples = read_audio(takes[0], scratch)
        spans = speech_spans(samples)
        expected = [len(spoken(line["text"], "Tessa", PACE, scratch)) / 2 / RATE for line in lines]
        chosen = match(expected, [(b - a) / RATE for a, b in spans])
        clips = [samples[spans[j][0]:spans[j][1]] for j in chosen]
        for index, line in enumerate(lines):
            redo = glob.glob(os.path.join(folder, f"{film}-{line['number']:02d}.*"))
            if redo:
                piece = read_audio(redo[0], scratch)
                a, b = speech_spans(piece)[0][0], speech_spans(piece)[-1][1]
                clips[index] = piece[a:b]
    left_out = len(spans) - len(lines)
    if left_out:
        print(f"{left_out} repeated or false start(s) left out.")
    track = np.zeros(int(timeline["seconds"] * RATE), dtype=np.float32)
    free_from = 0.0
    for index, (line, clip) in enumerate(zip(lines, clips)):
        at = max(line["begin"] + LEAD_IN, free_from)
        length = len(clip) / RATE
        late = at + length - (lines[index + 2]["begin"] if index + 2 < len(lines) else timeline["seconds"])
        status = "ok" if length <= line["seconds"] else f"runs {length - line['seconds']:.1f}s long"
        if late > 0:
            status += f", READ AGAIN: still speaking {late:.1f}s into a later scene"
        print(f"line {line['number']:>2}: {length:5.1f}s of {line['seconds']:5.1f}s  {status}")
        start = int(at * RATE)
        track[start:start + len(clip)] = clip[: max(0, len(track) - start)]
        free_from = at + length + BREATH
    peak = np.abs(track).max() or 1.0
    with wave.open(out_path, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes((track / peak * 0.89 * 32767).astype("<i2").tobytes())
    print(out_path)


if __name__ == "__main__":
    if sys.argv[1:] == ["--sheet"]:
        print(json.dumps({film: lines_of(film) for film in FILMS}, indent=1))
    else:
        build(*sys.argv[1:4])
