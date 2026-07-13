# TODO

## Upgrade copilot to Claude API

- **Status:** Pending
- **Docs:** [docs/copilot-upgrade.md](./docs/copilot-upgrade.md)
- **Summary:** Replace the rule-based answer engine (`components/copilot/rules.ts`) with a real Claude-API copilot. Create a serverless route (`app/api/copilot/route.ts`) that calls the Anthropic Messages API with live search/part data as context and streams responses. Fall back to the rule engine when `ANTHROPIC_API_KEY` is not set.
