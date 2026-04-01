#!/usr/bin/env python3
import argparse
import math
import random
import signal
import sys
import time

RUNNING = True


def stop_handler(_sig, _frame):
    global RUNNING
    RUNNING = False


def main() -> int:
    parser = argparse.ArgumentParser(description="Stream numeric data for Data Waveform testing")
    parser.add_argument("--interval", type=float, default=0.05, help="Seconds between samples")
    parser.add_argument("--count", type=int, default=0, help="Number of samples; 0 means infinite")
    parser.add_argument("--amplitude", type=float, default=50.0, help="Wave amplitude")
    parser.add_argument("--offset", type=float, default=100.0, help="Wave offset")
    parser.add_argument("--noise", type=float, default=1.5, help="Random noise amplitude")
    parser.add_argument("--freq", type=float, default=0.8, help="Wave frequency (Hz)")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, stop_handler)
    signal.signal(signal.SIGTERM, stop_handler)

    i = 0
    start = time.time()

    while RUNNING:
        if args.count > 0 and i >= args.count:
            break

        t = time.time() - start
        pure = args.offset + args.amplitude * math.sin(2 * math.pi * args.freq * t)
        value = pure + random.uniform(-args.noise, args.noise)

        # Example output for regex testing:
        # value=(-?\d+(?:\.\d+)?)
        # temperature=(-?\d+(?:\.\d+)?)
        # rpm=(\d+)
        temperature = 20.0 + 5.0 * math.sin(2 * math.pi * 0.15 * t)
        rpm = int(1200 + 400 * (1 + math.sin(2 * math.pi * 0.4 * t)))

        print(
            f"sample={i} value={value:.3f} temperature={temperature:.2f} rpm={rpm}",
            flush=True,
        )

        # Emit occasional spikes to make the waveform behavior obvious.
        if i > 0 and i % 120 == 0:
            spike = args.offset + args.amplitude * 2.5
            print(f"sample={i} value={spike:.3f} temperature={temperature:.2f} rpm={rpm}", flush=True)

        i += 1
        time.sleep(max(0.001, args.interval))

    return 0


if __name__ == "__main__":
    sys.exit(main())
