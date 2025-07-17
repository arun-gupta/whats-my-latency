# What's My Latency?

**What's My Latency?** is a web app and Cloudflare Worker project that helps users measure their real-time latency to multiple Cloudflare edge locations (POPs).

## Purpose
This repository provides a tool for:
- Measuring your latency to various Cloudflare edge locations around the world
- Visualizing which Cloudflare POP is fastest for you in real time
- Learning about global network performance from your browser

## How It Works
- A Cloudflare Worker is deployed to the edge and returns its POP location and timestamp in a JSON response.
- The frontend (coming soon) will make parallel requests to the Worker, measure roundtrip times, and display the results in a terminal-inspired UI.

## Phase 1: Test the Worker Endpoint

You can test the backend by visiting this URL pattern in your browser or with `curl`:

```
https://whats-my-latency-worker.<my-subdomain>.workers.dev
```

**Example (using my subdomain):**
[https://whats-my-latency-worker.arungupta.workers.dev](https://whats-my-latency-worker.arungupta.workers.dev)

### What to Expect
You will receive a JSON response like this:

```json
{
  "pop": "SFO",
  "timestamp": "2024-06-10T18:00:00Z",
  "cf_ray": "7a1b2c3d4e5f1234-SFO",
  "country": "US"
}
```
- `pop`: The Cloudflare edge location that handled your request (e.g., SFO, LHR)
- `timestamp`: The UTC time the request was processed
- `cf_ray`: The Cloudflare Ray ID (includes POP code)
- `country`: The detected country code

## Project Phases
### Phase 1 (Complete)
- Cloudflare Worker backend that returns POP, timestamp, and related info
- Setup and deployment instructions
- Ready for frontend integration

### Phase 2 (Planned)
- Frontend UI to display latency results in a table, leaderboard, and map
- Anonymous aggregate stats using Cloudflare KV or D1
- Region ranking and "Re-Test" button
- Local region estimation via browser timezone or IP

## Directory Structure
- `cloudflare-worker/` — Cloudflare Worker backend and deployment config
- (root) — Frontend and documentation (to be added)

---

**Stay tuned for the frontend and more features!** 