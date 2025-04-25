export default function handler(req, res) {
    const secretKey = process.env.BOT_TOKEN; // .env dosyasındaki değişken
  
    if (!secretKey) {
      return res.status(500).json({ error: 'SECRET_API_KEY could not be found!' });
    }
  
    res.status(200).json({ message: `Secret Key: ${secretKey}` });
  }
  