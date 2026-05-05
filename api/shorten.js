import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { longUrl, customAlias } = req.body;

  if (!longUrl || !longUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Valid URL is required' });
  }

  try {
    let alias = customAlias ? customAlias.trim().replace(/^\/+/, '') : crypto.randomBytes(3).toString('hex');
    
    const existing = await kv.get(alias);
    if (existing) {
      if (customAlias) {
        return res.status(409).json({ error: '此短碼已經有人使用了，請換一個' });
      } else {
        alias = crypto.randomBytes(4).toString('hex');
      }
    }

    await kv.set(alias, longUrl);

    return res.status(200).json({ 
      success: true, 
      alias: alias,
      shortUrl: `/${alias}`
    });
  } catch (error) {
    console.error('KV Error:', error);
    return res.status(500).json({ error: '資料庫寫入失敗' });
  }
}
