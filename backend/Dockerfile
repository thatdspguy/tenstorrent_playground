# Tenstorrent Simulator Playground - Backend Dockerfile
# Includes ttsim simulator for full simulation support

FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# ============================================================================
# Install ttsim simulator dependencies
# ============================================================================

# Download ttsim simulator libraries (Wormhole and Blackhole)
RUN mkdir -p /opt/ttsim && \
    wget -q https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_wh.so \
    -O /opt/ttsim/libttsim_wh.so && \
    wget -q https://github.com/tenstorrent/ttsim/releases/download/v1.3.0/libttsim_bh.so \
    -O /opt/ttsim/libttsim_bh.so

# Clone tt-metal for SOC descriptors (shallow clone, only what's needed)
RUN git clone --depth 1 https://github.com/tenstorrent/tt-metal.git /opt/tt-metal && \
    cp /opt/tt-metal/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml /opt/ttsim/soc_descriptor.yaml && \
    cp /opt/tt-metal/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml /opt/ttsim/wormhole_soc_descriptor.yaml && \
    cp /opt/tt-metal/tt_metal/soc_descriptors/blackhole_140_arch.yaml /opt/ttsim/blackhole_soc_descriptor.yaml

# Install SFPI firmware dependencies, libatomic (for ttnn), and SFPI
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmpc3 \
    libmpfr6 \
    libatomic1 \
    && wget -q https://github.com/tenstorrent/sfpi/releases/download/7.17.0/sfpi_7.17.0_x86_64_debian.deb \
    -O /tmp/sfpi.deb && \
    dpkg -i /tmp/sfpi.deb && \
    rm /tmp/sfpi.deb && \
    rm -rf /var/lib/apt/lists/*

# Install ttnn (from PyPI) and PyTorch CPU (from PyTorch index)
RUN pip install --no-cache-dir ttnn && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Set ttsim environment variables
ENV TT_METAL_HOME=/opt/tt-metal
ENV TT_METAL_SIMULATOR_WH=/opt/ttsim/libttsim_wh.so
ENV TT_METAL_SIMULATOR_BH=/opt/ttsim/libttsim_bh.so
ENV TT_METAL_SIMULATOR=/opt/ttsim/libttsim_wh.so
ENV TT_METAL_SLOW_DISPATCH_MODE=1

# ============================================================================
# Install application
# ============================================================================

# Copy dependency files and README (required by pyproject.toml)
COPY pyproject.toml README.md ./

# Create venv with access to system packages (ttnn, torch are installed globally)
# Then install app dependencies
RUN uv venv --system-site-packages && \
    uv sync --no-dev

# Copy application code
COPY src/ ./src/

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Run the application
CMD ["uv", "run", "uvicorn", "playground.main:app", "--host", "0.0.0.0", "--port", "8000"]
