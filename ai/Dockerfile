# Production Dockerfile for AI Service (CPU-Optimized)
FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies (minimal for faster builds)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies (CPU-only torch, no CUDA = 500MB vs 3.5GB)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create models directory
RUN mkdir -p models embeddings_cache

# Create non-root user
RUN useradd -m -u 1000 aiuser && chown -R aiuser:aiuser /app
USER aiuser

# Environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=5001

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Start with gunicorn for production (Flask app)
# --preload loads models once, shared across workers
CMD gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 300 --preload api_server_v2:app
