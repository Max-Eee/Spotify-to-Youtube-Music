FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

# Install dependencies (supports npm, pnpm, or yarn)
RUN if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install; \
    elif [ -f yarn.lock ]; then \
    yarn install --frozen-lockfile; \
    else \
    npm ci; \
    fi

# Copy source code
COPY . .

# Build the app
RUN if [ -f pnpm-lock.yaml ]; then \
    pnpm run build; \
    elif [ -f yarn.lock ]; then \
    yarn build; \
    else \
    npm run build; \
    fi

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
