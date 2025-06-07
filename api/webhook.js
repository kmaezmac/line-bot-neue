const line = require('@line/bot-sdk');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const events = req.body.events || [];
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);

  async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }

    // 外部APIへPOSTリクエスト
    let stockData;
    try {
      const apiRes = await fetch('https://stock-getter-orpin.vercel.app/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      stockData = await apiRes.json();
    } catch (e) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '株価情報の取得に失敗しました。'
      });
    }

    // 見やすい形でメッセージを作成
    const fx = stockData.fx_rate;
    const msg = [
      `為替レート: ${fx.toFixed(2)}円/USD`,
      ...stockData.results.map(s =>
        `${s.symbol} (${s.title})\n$${s.dollar_price} / ¥${Math.round(s.yen_price)}`
      )
    ].join('\n\n');

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: msg
    });
  }
};