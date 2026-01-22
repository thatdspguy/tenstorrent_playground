"""Configuration settings for the playground backend."""

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
    tt_metal_simulator: str = "~/ttsim/libttsim_wh.so"
    simulator_timeout: int = 300  # seconds

    # CORS Settings
    cors_origins: list[str] = Field(default=["http://localhost:5173", "http://localhost:3000"])

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
