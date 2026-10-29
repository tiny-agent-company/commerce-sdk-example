# Agentcard Commerce SDK example

A terminal chat agent that buys from real stores with the [Agentcard Commerce SDK](https://www.npmjs.com/package/@agent-cards/commerce-sdk). Ask it for something, and it searches stores, builds a cart and checks out. Your shopper adds a card once in the Agentcard Vault and approves each purchase.

It's one file, [`src/index.ts`](src/index.ts): an Anthropic chat loop with Agentcard's buy tool.

## Run it

You need Node 22 or later, an Anthropic API key and your company's Agentcard credentials.

```bash
git clone https://github.com/tiny-agent-company/commerce-sdk-example
cd commerce-sdk-example
npm install
cp .env.example .env
```

Fill in `.env`, then start it:

```bash
npm start
```

Then ask it for something, such as "two packs of AA batteries from Amazon" or "get me tacos".

To get your Agentcard client ID and secret, run `npx agent-cards credentials`. Production credentials place real orders: nothing is charged until your shopper adds a card and approves the payment.

## How it works

- **One client:** `new AgentcardClient({ clientId, clientSecret })`.
- **One buy tool per shopper:** `buyTool({ agentcard, externalUserId })`, kept between messages.
- **Each message is a turn:** `buy.turn(text)` is the tool the model calls, passed as `tools: [turn]` with `turn.messages(history)`.
- **Messages between turns:** `agentcard.listen()` prints card saved, order placed and approval notices without a webhook.
- **Links:** product and store cards print with the words that pick them. Add a card, approve the payment and store sign-in print as links to open in your browser.

## Build your own

Run `npx agent-cards init` in your app's folder. It installs the SDK and has Agentcard's agent build the buy tool into your code.

Docs: [docs.agentcard.sh](https://docs.agentcard.sh)
