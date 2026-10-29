import Anthropic from '@anthropic-ai/sdk';
import { AgentcardClient, buyTool, type BuyToolLink } from '@agent-cards/commerce-sdk';
import * as readline from 'node:readline/promises';

// A tiny terminal chat agent with Agentcard's buy tool.
const anthropic = new Anthropic();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let history: Anthropic.Beta.BetaMessageParam[] = [];

const agentcard = new AgentcardClient({
  clientId: process.env.AGENTCARD_CLIENT_ID ?? '',
  clientSecret: process.env.AGENTCARD_CLIENT_SECRET ?? '',
  baseUrl: process.env.AGENTCARD_BASE_URL,
});

// One shopper in this terminal: one stable id, one buy tool, kept.
const shopperId = process.env.SHOPPER_ID ?? 'terminal-user';
const buy = buyTool({ agentcard, externalUserId: shopperId, ack: 'text' });

// Card saved, order placed and approval-expiring messages arrive here, without a webhook.
agentcard.listen({ onMessage: (_shopper, message) => console.log(`\nagent: ${message.text}`) });

/** Product and store cards show their title, price and picture, with the words that pick them; steps open in the browser. */
function showLink(link: BuyToolLink) {
  if (link.kind === 'product') {
    const open = link.url ? ` ${link.url}` : '';
    console.log(`  [product] ${link.title} ${link.price ?? ''}${open}\n    buy: "${link.title}${link.price ? ` (${link.price})` : ''}" ${link.imageUrl ?? ''}`);
  } else if (link.kind === 'store') {
    const eta = link.etaMinutes != null ? `, ${link.etaMinutes} min` : '';
    console.log(`  [store] ${link.title}${eta} ${link.url ?? ''}\n    order here: "Order from ${link.title}" ${link.imageUrl ?? ''}`);
  } else {
    const what = { vault: 'add a card', approval: 'approve the payment', store_login: `sign in to ${link.store ?? 'the store'}` }[link.kind];
    console.log(`  [${what}] open in your browser: ${link.url}`);
  }
}

while (true) {
  const text = await rl.question('you: ');
  const turn = buy.turn(text, {
    onItem: (item) => (item.kind === 'text' ? console.log(`agent: ${item.text}`) : showLink(item.link)),
    onResult: (result) => {
      for (const cart of result.carts) {
        const lines = cart.items.map((line) => `${line.qty} x ${line.name}`).join(', ');
        console.log(`  [cart] ${cart.merchant_name}: ${lines} (total ${(cart.totalCents / 100).toFixed(2)} ${cart.currency ?? ''}, ${result.status})`);
      }
    },
  });
  try {
    const runner = anthropic.beta.messages.toolRunner({
      model: 'claude-sonnet-5-5',
      max_tokens: 1024,
      tools: [turn],
      messages: turn.messages(history),
      stream: true,
    });
    for await (const stream of runner) {
      const paragraphs = turn.messageStream();
      stream.on('text', (delta) => paragraphs.push(delta));
      await stream.done();
      await paragraphs.end();
    }
    history = runner.params.messages;
  } catch (error) {
    turn.end();
    if (!turn.stopped) console.log(`agent: (the turn failed: ${(error as Error).message})`);
  }
}
