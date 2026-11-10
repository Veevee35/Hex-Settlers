# V68 · Expert AI Training Lab (admin.hexsettlers.org)

## What was added

**Admin Management → Expert AI Training** is a private experiment dashboard for the existing neural Expert AI and its real-match self-play trainer. Only a signed-in administrator on `admin.hexsettlers.org` may call the training endpoints. The public game hostname cannot access them.

### Workflow

1. Select **Neural self-play training** or **Isolated server stress test** (no neural model updates).
2. Select the current live model for the initial experiment, or the saved candidate to continue training.
3. Choose all standard maps or the full curriculum including test boards.
4. Specify **games per batch**, **number of batches**, **virtual game/server slots (1–1,000)** and **checkpoint interval**.
5. Start the job. The page shows actual completed matches, retries, last active map and real parallel-game capacity. You can close the browser; the server-side process runs independently of the tab, but the Cloudflare container can stop/restart, in which case the saved checkpoint remains available to resume as a new job.
6. Review the last 25 experiment records, completion, average turns, victory margins and p95 simulated-game duration. Download the last full JSON report or the candidate weights.
7. Keep training from the candidate, restore the previous candidate, or explicitly **Promote candidate to live AI** after manual validation. Promotion saves a recoverable backup of the former live model. **Rollback live model** reverses promotion. These actions require typed confirmations.

### Important infrastructure distinction

The existing Cloudflare deployment has **one authoritative game container** (`max_instances: 1`), not 1,000 independent Cloudflare Containers. This page supports requesting **up to 1,000 logical simulation slots**, and up to **100,000 actual completed games per experiment**, but the default maximum number of games executing simultaneously in the local training server is **two**. The UI always displays the effective concurrency, and queues the rest. Use a dedicated, larger staging environment and configure `HEX_TRAINING_MAX_CONCURRENCY` (1–32) if appropriate. Do not expect this configuration to benchmark 1,000 separate machines/Cloudflare container instances. That would require a separately provisioned distributed fleet and its own capacity and billing plan.

### Isolation and persistence

- The experiment starts the existing `scripts/train_neural_ai_all_maps.js` in a child process. That script launches a **loopback Node server** with actual room creation, AI-only player seats, game rules, victory checks and training updates. This is not a fabricated outcome generator.
- Training data uses a private temporary directory. The child inherits **no Cloudflare R2 state endpoint**, admin password, or upstream trust secret, so it cannot write into live accounts, rooms, or ratings.
- Every training checkpoint saves a **candidate model**, distinct from `neural_ai_model.json`. Metadata and the latest full completed run report are also stored in R2. Model promotion is explicit.
- If an experiment is interrupted, the last completed checkpoint can be used to start a new experiment from **Saved training candidate**. A new job begins from that saved model; it does not replay the unfinished jobs automatically.
- Stress testing uses the same actual game engine but disables neural weight updates, so it measures isolated game completion/latency without silently training.
- The underlying policy is a small neural network that learns from completed matches. These self-play metrics are diagnostic, **not proof the model is better against human or baseline opponents**. Keep a held-out evaluation set and compare actual win rates before promoting high-stakes updates.

### API routes

All are POST-only, authenticated, admin-host-only:

- `/api/admin/training-status`
- `/api/admin/training-start`
- `/api/admin/training-stop`
- `/api/admin/training-report`
- `/api/admin/training-model`
- `/api/admin/training-promote`
- `/api/admin/training-rollback-live`
- `/api/admin/training-restore-candidate`

### Files saved in Cloudflare R2

- `state/training_runs.json`
- `state/training_candidate.json`
- `state/training_previous_candidate.json`
- `state/training_previous_live.json`
- `state/training_report.json`

These are included in the container bootstrapping state list. The existing `neural_ai_model.json` remains the *only* authoritative live Expert AI model.

### Safety and performance

Use short initial runs (10–50 completed games with one or two active games) before increasing batch sizes. Even isolated child processes consume CPU and memory on the shared host. The node container is configured with a capacity-bound concurrency limit; cloud billing and restarts remain your responsibility. Long jobs can be interrupted by container sleep/restart; save checkpoints frequently. Stop a running job before starting another.

### Validation status

The new orchestration, authorization-path, persistence-contract, version-stamping, and simulated-process tests passed locally. A complete live WebSocket game training cycle was **not run** in this development container because the extracted archive does not include its `ws` dependency and network package installation was unavailable. Deploy first to staging and perform a small live run before assuming large batches will succeed.
