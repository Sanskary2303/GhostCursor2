FROM python:3.12-slim

WORKDIR /app

# Copy SDK package so it can be installed or imported
COPY packages/sdk-server-python /app/packages/sdk-server-python
RUN pip install --no-cache-dir -e /app/packages/sdk-server-python

# Install backend dependencies
COPY demo/shophive/backend/requirements.txt /app/demo/shophive/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/demo/shophive/backend/requirements.txt

# Copy backend code
COPY demo/shophive/backend /app/demo/shophive/backend

WORKDIR /app/demo/shophive/backend

EXPOSE 8081

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]

