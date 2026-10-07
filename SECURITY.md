# Security

Report vulnerabilities privately using the repository's GitHub private vulnerability reporting when enabled. If unavailable, open an issue requesting a private contact without publishing exploit details or keys. The supported release line is 0.1.x.

Provider keys are stored locally without encryption. Do not import untrusted configurations without reviewing destinations, headers, actions and rules. Exports omit API keys and custom headers. User-initiated translation sends selected webpage segments to configured providers; sensitive pages should only be sent to endpoints you trust.

The extension has no remote code execution, telemetry or page-access host grant. It requests individual provider origins on save or Translate. Revoking permissions can make providers fail; grant again from settings. Reset clears configuration; existing optional permissions can be revoked through the browser's extension settings. A model can return incorrect translations, but its output is rendered as plain text.

Run `pnpm audit --audit-level high`. Browser/network integrations and third-party packages retain their upstream security and maintenance responsibilities. Google's keyless endpoint is a convenience integration, not a service guarantee.
