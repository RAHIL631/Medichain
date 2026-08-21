# MediChain Production Architecture

## 1. Network Topology
*   **CDN / WAF:** Cloudflare (handles TLS termination, DDoS protection, static frontend caching).
*   **Frontend Tier:** React application hosted on static blob storage (S3/CloudFront) or Vercel.
*   **API Gateway:** Nginx Reverse Proxy routing traffic to Node.js backend.
*   **Backend Tier:** Node.js Express API (horizontally scaled across 3+ ECS containers).
*   **AI Tier:** Python Flask gunicorn service (scaled independently, optimized for CPU/Memory).

## 2. Data Persistence Layer
*   **Primary Database:** MongoDB 6.0 Replica Set (3 nodes minimum).
*   **Cache / Session:** Redis 7.0 (handles JWT blocklists, rate limiting, and temporary state).
*   **Decentralized Storage:** IPFS (via Pinata) for immutable, encrypted medical PDF/Image blobs.
*   **Blockchain:** Ethereum L2 (e.g., Polygon/Arbitrum) or Enterprise EVM (Hyperledger Besu) executing `MediChain.sol`.

## 3. Secret Management
*   Secrets are injected at runtime via AWS Secrets Manager or HashiCorp Vault. 
*   **NO `.env` files** exist on the physical production servers.

## 4. Domain Structure
*   `app.medichain.example` -> Frontend Application
*   `api.medichain.example` -> Backend REST API
*   `admin.medichain.example` -> Internal Hospital Management Dashboard
