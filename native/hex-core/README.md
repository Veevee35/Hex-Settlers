# Local C++ self-play and CUDA validation

The trainer can load the C++ scoring, route lengths, dice production, bank inventory trades, and Largest Army through Node-API.
JavaScript still drives the match, chooses AI actions, and resolves Longest Road
ownership. CUDA refines the existing neural model using samples from completed
matches. The same dice-production implementation also runs in the standalone CUDA
parity runner, which covers normalized bank trades as well.

## Windows build

From an x64 Visual Studio developer prompt, use the Node headers and
`node.lib` for your Node installation and architecture.

```bat
native\hex-core\Build-Node-Windows.cmd "C:\path\to\include\node" "C:\path\to\node.lib"
native\hex-core\Build-Core-Windows.cmd
npm run test:cpp:parity
```

With the NVIDIA Toolkit on PATH and a compatible MSVC toolchain, run
`scripts\cuda-exact\Build-Exact-CUDA.cmd` to build and validate the standalone
CUDA kernel. CUDA Toolkit 13.0 was verified with Visual Studio 2022 and an
RTX 3090 Ti. CUDA-enabled PyTorch is used separately by the trainer.

## Run self-play

In the local trainer dashboard, set **Self-play rules** to
**C++ rules**. Set the accelerator to **CUDA** to require GPU
learning. Auto uses the compiled addon for new runs when available.

Run the isolated 100-match validation from PowerShell.

```powershell
$env:TRAINING_ACCELERATOR = 'cuda'
npm.cmd run test:games:100
```

The runner writes the validation summary, complete match report, isolated
model, and logs to `scripts/output/validation-native-rules-100/`. Set
`TEST_GAME_WORKSPACE` to a different directory to start a fresh run. New runs
require native production receipts from every completed match.
