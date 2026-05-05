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
    let alias = '';
    
    if (customAlias) {
      let rawAlias = customAlias.trim().replace(/^\/+/, '');
      // 強制加上 fgu/ 前綴
      if (rawAlias.startsWith('fgu/')) {
        alias = rawAlias;
      } else if (rawAlias === 'fgu') {
        alias = 'fgu/';
      } else {
        alias = `fgu/${rawAlias}`;
      }
    } else {
      // 針對網址生成雜湊 (Hash)
      const hash = crypto.createHash('md5').update(longUrl).digest('hex').substring(0, 6);
      alias = `fgu/${hash}`;
    }
    
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
      
      // 發生碰撞（不同網址或已被使用），自動加上隨機後綴
      alias = `${alias}-${crypto.randomBytes(2).toString('hex')}`;
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
