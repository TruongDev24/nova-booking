FROM node:20-alpine
WORKDIR /app

# Install development dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application files
COPY . .

# Expose port and start Next.js dev server for Fast Refresh compatibility
EXPOSE 3000
CMD ["npm", "run", "dev"]
