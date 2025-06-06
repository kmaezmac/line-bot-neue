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

  // Vercelではbodyがパース済み
  const events = req.body.events || [];
  const results = await Promise.all(events.map(handleEvent));
  res.json(results);

  async function handleEvent(event) {
    if (event.type !== 'message' || event.message.type !== 'text') {
      return null;
    }
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: event.message.text
    });
    return 'ok';
  }
};