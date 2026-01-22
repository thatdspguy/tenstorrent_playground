"""Configuration settings for the playground backend."""

import logging
import sys

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Settings
    app_name: str = "Tenstorrent Simulator Playground"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000

    # WSL2 Settings
    wsl_distro: str = "Ubuntu"

    # Simulator Settings
    tt_metal_home: str = "~/tt-metal"
    tt_metal_simulator_wh: str = "~/ttsim/libttsim_wh.so"
    tt_metal_simulator_bh: str = "~/ttsim/libttsim_bh.so"
    simulator_timeout: int = 300  # seconds

    def get_simulator_path(self, chip: str) -> str:
        """Get the simulator library path for the specified chip."""
        if chip == "blackhole":
            return self.tt_metal_simulator_bh
        return self.tt_metal_simulator_wh

    def get_soc_descriptor(self, chip: str) -> str:
        """Get the SOC descriptor filename for the specified chip."""
        if chip == "blackhole":
            return "blackhole_140_arch.yaml"
        return "wormhole_b0_80_arch.yaml"

    # CORS Settings
    cors_origins: list[str] = Field(default=["http://localhost:5173", "http://localhost:3000"])

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


def configure_logging() -> logging.Logger:
    """Configure application logging based on DEBUG setting."""
    log_level = logging.DEBUG if settings.debug else logging.INFO

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    logger = logging.getLogger("playground")
    logger.setLevel(log_level)

    return logger


logger = configure_logging()
