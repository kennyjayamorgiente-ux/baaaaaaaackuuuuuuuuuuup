# Realtime Scaling Setup (Phase 2)

This backend now supports Socket.IO horizontal scaling using Redis Pub/Sub.

## Environment Variables

- `SOCKET_REDIS_ENABLED=true` to enable Redis adapter.
- `SOCKET_REDIS_REQUIRED=true` to fail startup when Redis is unreachable.
- `REDIS_URL=redis://<host>:6379` Redis connection string.

## Local Development

Use defaults in `.env`:

- `SOCKET_REDIS_ENABLED=false`

Server runs without Redis in single-instance mode.

## Production (multi-instance)

Use:

- `SOCKET_REDIS_ENABLED=true`
- `SOCKET_REDIS_REQUIRED=true`
- Valid `REDIS_URL`

If Redis cannot connect, startup exits to avoid inconsistent realtime behavior.

## Load Balancer Requirement

For Socket.IO/WebSocket in multi-instance deployments, enable sticky sessions in your load balancer.

