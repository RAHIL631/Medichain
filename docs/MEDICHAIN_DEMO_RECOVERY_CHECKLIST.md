# MediChain Demo Recovery Checklist

**Applies to:** Isolated local demonstration using synthetic data only  
**Safety rule:** Do not bypass authentication, consent, encryption, or wallet checks. Do not retry a non-idempotent operation until its state is known. Never use production accounts, production data, or a public-chain private key.

When a live patient/doctor record-sharing workflow is requested, stop: the current release gate is **NOT READY**. Use the [final demo script](MEDICHAIN_FINAL_DEMO_SCRIPT.md) to continue with source and local-test evidence only.

## Recovery Actions

### Frontend unavailable

1. **Recognize:** The local page does not load, renders a blank/error screen, or the development server reports a build failure.
2. **Safest action:** Do not switch to a live production URL. Use the latest successful build/test evidence and source files. Restart only the isolated local frontend if the environment is already configured.
3. **Continue or skip:** Continue with the architecture and test-report walkthrough; skip UI claims.
4. **Tell the evaluator:** "The frontend is unavailable in this rehearsal. The recorded build succeeded, but a live browser workflow has not been verified."

### Backend unavailable

1. **Recognize:** A local readiness/health endpoint fails or UI requests return network/server errors.
2. **Safest action:** Do not change URLs to production, disable auth, or edit data to recover the demo. Use source and existing local test evidence.
3. **Continue or skip:** Continue with static/source evidence; skip login, patient lookup, upload, and retrieval.
4. **Tell the evaluator:** "The API is unavailable in this session; its recorded tests use local test services and do not establish deployed availability."

### Login failure

1. **Recognize:** Login rejects credentials, OTP, or session setup; no dedicated synthetic account was confirmed beforehand.
2. **Safest action:** Stop after one normal retry only if the account and isolated environment were provisioned and checked. Do not use credentials from old documents, create an account in a shared database, or bypass authentication.
3. **Continue or skip:** Skip authenticated screens and use the code/report walkthrough.
4. **Tell the evaluator:** "A dedicated demo account was not verified, so I will not substitute an unapproved account or weaken authentication."

### OTP delivery delay

1. **Recognize:** The expected one-time code has not arrived or has expired.
2. **Safest action:** Check the configured synthetic test mailbox/console through the approved local setup, wait for delivery, and use the product's normal resend flow only if it is safe to do so. Do not print or expose real OTPs.
3. **Continue or skip:** Skip the login-dependent steps if delivery is not promptly available.
4. **Tell the evaluator:** "OTP delivery is not available in this environment; I will not bypass the authentication step."

### AI service unavailable

1. **Recognize:** The local AI health check or CDSS request fails, times out, returns a service error, or produces no result.
2. **Safest action:** Do not retry with real patient information or present a hand-entered result as system output. Use the local source, model manifest, and recorded three-test result.
3. **Continue or skip:** Continue with a source walkthrough; skip live AI output.
4. **Tell the evaluator:** "The deployed AI integration was not verified, and this service is unavailable now. The recorded local tests are not clinical validation."

### IPFS upload or retrieval failure

1. **Recognize:** Pinning returns an error, a CID is absent, a gateway cannot retrieve data, or decryption fails.
2. **Safest action:** Do not retry an upload until its previous outcome is known. Do not treat a test-only synthetic CID as a persisted IPFS object, change gateways to conceal failure, or use a real document.
3. **Continue or skip:** Skip upload/retrieval and show the encryption implementation and test evidence instead.
4. **Tell the evaluator:** "Real IPFS persistence and retrieval were not verified; this step is being skipped rather than simulated."

### MetaMask disconnected

1. **Recognize:** The application cannot detect a wallet/provider, or MetaMask asks for account access unexpectedly.
2. **Safest action:** Do not import a development key into a public network or connect an unapproved wallet. Connect only a dedicated wallet to the explicitly isolated local Hardhat network if that environment was prepared and verified.
3. **Continue or skip:** Skip wallet and transaction steps if local network identity or contract deployment is uncertain.
4. **Tell the evaluator:** "No wallet transaction is being claimed; local contract tests are separate from a live wallet session."

### Wrong blockchain network

1. **Recognize:** Wallet chain ID differs from the explicitly selected isolated test network or the contract address is not deployed there.
2. **Safest action:** Cancel the transaction. Verify the local chain ID and deployment before any retry. Do not accept a prompt to switch to mainnet or an unknown network.
3. **Continue or skip:** Skip the blockchain interaction unless the local test network is confirmed; continue with local Hardhat test evidence.
4. **Tell the evaluator:** "The wallet is on the wrong or unverified network, so I cancelled instead of submitting a transaction."

### Rejected or pending transaction

1. **Recognize:** The user rejects the wallet prompt, the wallet shows pending, or the UI has not received a confirmed transaction result.
2. **Safest action:** For a rejection, stop. For pending, wait and check the transaction in the same network before taking further action. Do not submit duplicates or report pending as confirmed.
3. **Continue or skip:** Skip the step unless confirmation is independently visible and the transaction is on the isolated test network. This does not remove the API consent blocker.
4. **Tell the evaluator:** "The transaction was rejected or remains pending; there is no confirmed state change to report."

### Internet interruption

1. **Recognize:** Remote API, RxNorm, gateway, wallet RPC, or other network requests fail.
2. **Safest action:** Stop remote writes and avoid duplicate submissions. Use only already available local reports, source, and test output. The stack is not established as fully air-gapped; do not imply that it is.
3. **Continue or skip:** Continue with offline evidence only; skip any live integration step.
4. **Tell the evaluator:** "Connectivity is interrupted, so the live integration cannot be demonstrated. I will distinguish the local evidence from unavailable remote services."

## Stop Conditions

- Any real patient information, production credentials, or unapproved wallet appears.
- A route would expose a patient record without verified consent.
- It is unclear whether a previous upload or transaction succeeded.
- A UI status conflicts with server, chain, or gateway evidence.

On a stop condition, cancel the action, preserve the current state, and continue only with non-sensitive source/test evidence.