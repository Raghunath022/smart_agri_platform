FROM node:18-bullseye-slim

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN ln -s /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Install Python dependencies for the ML scripts
COPY python_reqs.txt ./
RUN pip install --no-cache-dir -r python_reqs.txt
# Try installing PyTorch CPU, but do not fail the build if it runs out of memory on the free tier
RUN pip install --no-cache-dir torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu || echo "Warning: PyTorch install failed, using fallback mode"

# Install Node.js dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source code and Python scripts
COPY . .

# Expose backend port
EXPOSE 10000

# Start the Node.js API Gateway (which internally spawns Python scripts)
CMD ["node", "server.js"]
