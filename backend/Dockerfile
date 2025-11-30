FROM python:3.11-slim

WORKDIR /app

# Copy .env from root directory
COPY .env /app/.env

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Expose port
EXPOSE 8080

# Run the application with Gunicorn
CMD ["gunicorn", "--config", "config/gunicorn.conf.py", "main:app"]
