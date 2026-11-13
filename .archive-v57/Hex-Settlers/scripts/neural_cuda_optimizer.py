#!/usr/bin/env python3
"""CUDA batch refinement of Hex Settlers' existing 17->8->1 tanh neural model.

Self-play remains on the CPU. This optimizer only runs on real finished-game
examples collected and committed by the isolated training server. It never
changes trainedGames and atomically replaces the same JSON model format.
"""
import argparse
import json
import math
import os
import sys
import tempfile


def get_torch():
    try:
        import torch
    except ImportError as exc:
        raise RuntimeError(
            "PyTorch is not installed in the selected Python. Install a CUDA-enabled "
            "PyTorch build from https://pytorch.org/get-started/locally/"
        ) from exc
    return torch


def check_cuda():
    torch = get_torch()
    status = {
        "torch": torch.__version__,
        "cudaAvailable": bool(torch.cuda.is_available()),
        "cudaVersion": torch.version.cuda,
        "device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
    }
    print(json.dumps(status), flush=True)
    if not status["cudaAvailable"]:
        raise RuntimeError("CUDA is not available to PyTorch. Verify the NVIDIA driver and CUDA-enabled torch installation.")


def validate_samples(file_path, expected_features):
    records = []
    seen = set()
    with open(file_path, "r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            item = json.loads(line)
            game_id = item.get("gameId")
            if not game_id or game_id in seen:
                raise ValueError(f"Duplicate or missing game ID at line {line_number}")
            seen.add(game_id)
            for sample in item.get("samples", []):
                x = sample.get("features")
                y = sample.get("target")
                if not isinstance(x, list) or len(x) != expected_features or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in x):
                    raise ValueError(f"Invalid features at line {line_number}")
                if not isinstance(y, (float, int)) or not math.isfinite(y) or not -1 <= y <= 1:
                    raise ValueError(f"Invalid training target at line {line_number}")
                records.append((x, float(y)))
    if not records:
        raise ValueError("No committed training examples were collected for this batch")
    return records, len(seen)


def run_refinement(args, device_name="cuda:0"):
    torch = get_torch()
    if device_name.startswith("cuda") and not torch.cuda.is_available():
        raise RuntimeError("CUDA is not available. No model changes were made.")
    with open(args.model, encoding="utf-8") as handle:
        model = json.load(handle)
    params = model["params"]
    inputs = len(params["w1"][0])
    hidden = len(params["w1"])
    if hidden != len(params["w2"]) or hidden != len(params["b1"]):
        raise ValueError("Model shape is invalid")
    examples, games = validate_samples(args.samples, inputs)
    device = torch.device(device_name)
    x = torch.tensor([sample[0] for sample in examples], dtype=torch.float32, device=device)
    y = torch.tensor([[sample[1]] for sample in examples], dtype=torch.float32, device=device)
    w1 = torch.nn.Parameter(torch.tensor(params["w1"], dtype=torch.float32, device=device))
    b1 = torch.nn.Parameter(torch.tensor(params["b1"], dtype=torch.float32, device=device))
    w2 = torch.nn.Parameter(torch.tensor(params["w2"], dtype=torch.float32, device=device).reshape(-1, 1))
    b2 = torch.nn.Parameter(torch.tensor(float(params["b2"]), dtype=torch.float32, device=device))
    variables = [w1, b1, w2, b2]
    optimizer = torch.optim.Adam(variables, lr=args.learning_rate)

    def loss():
        predictions = torch.tanh(torch.tanh(x @ w1.T + b1) @ w2 + b2)
        return torch.mean((predictions - y) ** 2)

    with torch.no_grad():
        initial_loss = float(loss().item())
    seed = 7731 + int(model.get("trainedGames", 0)) % 100000
    rng = torch.Generator(device="cpu").manual_seed(seed)
    for _ in range(args.epochs):
        indices = torch.randperm(len(examples), generator=rng).tolist()
        for begin in range(0, len(indices), args.mini_batch):
            chunk = indices[begin : begin + args.mini_batch]
            optimizer.zero_grad(set_to_none=True)
            batch_pred = torch.tanh(torch.tanh(x[chunk] @ w1.T + b1) @ w2 + b2)
            batch_loss = torch.mean((batch_pred - y[chunk]) ** 2)
            if not bool(torch.isfinite(batch_loss).item()):
                raise RuntimeError("CUDA training produced a non-finite loss; model not written")
            batch_loss.backward()
            torch.nn.utils.clip_grad_norm_(variables, max_norm=1.0)
            optimizer.step()
            with torch.no_grad():
                for variable in variables:
                    variable.clamp_(-8, 8)

    with torch.no_grad():
        final_loss = float(loss().item())
    if not math.isfinite(final_loss):
        raise RuntimeError("CUDA training produced invalid model weights")
    # Only commit improvements on the *same* collected samples. This is a
    # conservative anti-regression gate, not an unbiased generalization test.
    improved = final_loss < initial_loss - 1e-8
    if improved:
        params["w1"] = w1.detach().cpu().tolist()
        params["b1"] = b1.detach().cpu().tolist()
        params["w2"] = w2.detach().cpu().reshape(-1).tolist()
        params["b2"] = float(b2.detach().cpu().item())
        model["meta"] = {
            **model.get("meta", {}),
            "lastCudaRefinement": {
                "backend": "pytorch-cuda", "samples": len(examples),
                "games": games, "epochs": args.epochs,
                "initialLoss": initial_loss, "finalLoss": final_loss,
            },
        }
        directory = os.path.dirname(os.path.abspath(args.model))
        file_desc, temp_path = tempfile.mkstemp(prefix=".neural-cuda-", suffix=".json", dir=directory)
        try:
            with os.fdopen(file_desc, "w", encoding="utf-8") as handle:
                json.dump(model, handle, indent=2, allow_nan=False)
                handle.write("\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, args.model)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    print(json.dumps({
        "device": torch.cuda.get_device_name(0) if device.type == "cuda" else "CPU test reference", "examples": len(examples),
        "games": games, "epochs": args.epochs, "initialLoss": round(initial_loss, 7),
        "finalLoss": round(final_loss, 7), "committed": improved,
        "trainedGames": model["trainedGames"],
    }), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Print CUDA availability and device")
    parser.add_argument("--model")
    parser.add_argument("--samples")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--mini-batch", type=int, default=256)
    parser.add_argument("--learning-rate", type=float, default=0.0008)
    args = parser.parse_args()
    if args.check:
        check_cuda()
        return
    if not args.model or not args.samples:
        parser.error("--model and --samples are required")
    if not 1 <= args.epochs <= 20 or not 16 <= args.mini_batch <= 8192 or not 0 < args.learning_rate <= 0.01:
        parser.error("Invalid optimizer settings")
    run_refinement(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"[cuda] {error}", file=sys.stderr, flush=True)
        sys.exit(1)
