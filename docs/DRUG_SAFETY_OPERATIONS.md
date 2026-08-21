# Drug Safety Operations

## 1. External Data Sources
*   MediChain integrates with the **RxNorm API** (NLM) for authoritative drug interaction data.

## 2. Fallback Procedures
*   If the RxNorm API is unreachable, the system will instantly fallback to a local cache for the top 500 most common drug interactions.
*   If the interaction is not in the cache, the UI must explicitly render a warning: *"Drug Safety check unavailable. Consult your pharmacist."*
*   **Rule:** The system must never silently fail and show "0 Interactions Found" if the external API is down.

## 3. Version Tracking
*   The system logs the RxNorm dataset version used for each prescription check in the Audit Log for liability and compliance purposes.
