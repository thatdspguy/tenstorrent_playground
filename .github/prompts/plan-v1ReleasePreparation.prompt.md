# Plan: Prepare Tenstorrent Simulator Playground for v1.0 Release

This plan will clean up debug code, update all documentation, and streamline the installation process so users can clone the repo and run the tool locally with minimal friction.

---

## Steps

1. **Remove debug code from backend** - Delete all `[DEBUG]` print statements in `backend/src/playground/services/simulator.py` (~20 occurrences) and `backend/src/playground/services/sweep_service.py`. Replace critical logging with Python's `logging` module configured via `DEBUG` environment variable.

2. **Align version numbers to 1.0.0** - Update version in `backend/pyproject.toml`, `backend/src/playground/__init__.py`, and `frontend/package.json` from `0.0.0`/`0.1.0` to `1.0.0`.

3. **Update main README.md** - Replace `yourusername` placeholder with actual repo URL, fix Python version inconsistency (3.12 vs 3.13), add `.env` configuration section, and document environment variables.

4. **Write missing documentation** - Create content for empty `backend/README.md` (API docs, setup, env vars) and replace Vite boilerplate in `frontend/README.md` with project-specific component/build documentation.

5. **Create `.env.example` file** - Add a template documenting all required environment variables (`DEBUG`, `WSL_DISTRO`, `TT_METAL_HOME`, `TT_METAL_SIMULATOR`, `CORS_ORIGINS`) with sensible defaults and comments.

6. **Simplify installation scripts** - Complete the truncated `scripts/setup.sh`, create a Windows PowerShell equivalent `setup.ps1`, and ensure `dev.ps1`/`dev.sh` have clear error messages if dependencies are missing.

---

## Further Considerations

1. **Remove legacy entry point?** - `backend/main.py` only contains `print("Hello from playground!")`. Should it be deleted or repurposed as a simple CLI launcher?

2. **Archive design document?** - `docs/tenstorrent_simulator_playground_guide_uv.md` is an outdated planning document. Move to `docs/design/` or remove?

3. **Add Docker option?** - A `docker-compose.yml` would provide the easiest one-command installation (`docker compose up`). Worth adding for v1.0 or defer to a later release?

## Answers to Further Considerations

1. **Remove legacy entry point?** - Yes, delete `backend/main.py` to avoid confusion since it serves no functional purpose.

2. Maybe a docs/archive/ folder would be a good place to keep old design docs without cluttering the main docs directory.

3. Adding a Docker option would be beneficial for users seeking a quick setup. It should be included in the v1.0 release