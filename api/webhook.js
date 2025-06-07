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
      const symbols = process.env.SYMBOLS.split(',').map(s => s.trim())
      const apiRes = await fetch(process.env.STOCK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
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
    let msg = [
      `為替レート: ${fx.toFixed(2)}円/USD`,
      ...stockData.results.map(s => {
        // titleだけ . を半角スペースに置換
        const safeTitle = s.title.replace(/\.(?=[a-z]{2,6}(\b|\/))/gi, ' ');
        if (s.symbol.endsWith('.T')) {
          // 日本株は円のみ表示
          return `${s.symbol} (${safeTitle})\n¥${s.yen_price.toFixed(2)}`;
        } else {
          // それ以外はドルと円を表示
          return `${s.symbol} (${safeTitle})\n$${s.dollar_price} / ¥${s.yen_price.toFixed(2)}`;
        }
      })
    ].join('\n\n');

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: msg
    });
  }
};