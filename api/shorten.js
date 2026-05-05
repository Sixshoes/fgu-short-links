import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
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
    
    const existing = await redis.get(alias);
    if (existing) {
      if (existing === longUrl) {
        // Idempotent: exact same mapping already exists, just return success
        return res.status(200).json({ 
          success: true, 
          alias: alias,
          shortUrl: `/${alias}`
        });
      }
      
      if (customAlias) {
        // 此短碼已被其他人使用，自動加上隨機後綴幫他重新生成一個
        alias = `${customAlias.trim().replace(/^\/+/, '')}-${crypto.randomBytes(2).toString('hex')}`;
      } else {
        alias = crypto.randomBytes(4).toString('hex');
      }
    }

    await redis.set(alias, longUrl);

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
