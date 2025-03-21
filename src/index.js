// index.js
import yahooFinance from 'yahoo-finance2';

export default {
  async scheduled(event, env, ctx) {
    // Get market data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 201);
    
    const result = await yahooFinance.chart('^GSPC', {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    // Calculate MA200 and check crossover
    const quotes = result.quotes.filter(q => q.close).map(q => q.close);
    const currentPrice = quotes[0];
    const ma200 = quotes.slice(0, 200).reduce((a,b) => a + b, 0) / 200;
    
    // Send Discord message if crossover detected
    if ((currentPrice > ma200 && env.LAST_STATUS === 'below') || 
       (currentPrice < ma200 && env.LAST_STATUS === 'above')) {
      await sendDiscordMessage(env.DISCORD_WEBHOOK, currentPrice, ma200);
    }

    // Update KV storage
    await env.STONKS_BOT_KV.put('LAST_STATUS', currentPrice > ma200 ? 'above' : 'below');
  }
};

async function sendDiscordMessage(webhookUrl, price, ma200) {
  const status = price > ma200 ? 'ABOVE 📈' : 'BELOW 📉';
  const message = {
    content: `**MARKET ALERT**\nS&P 500 closed ${status} 200-Day MA!\n` +
             `Price: $${price.toFixed(2)}\nMA200: $${ma200.toFixed(2)}`
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(message)
  });
}