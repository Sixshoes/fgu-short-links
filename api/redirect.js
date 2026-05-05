import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { alias } = req.query;

  if (!alias) {
    return res.redirect(302, '/');
  }

  try {
    const longUrl = await kv.get(alias);
    
    if (longUrl) {
      return res.redirect(302, longUrl);
    } else {
      return res.redirect(302, '/');
    }
  } catch (error) {
    console.error('KV Error during redirect:', error);
    return res.redirect(302, '/');
  }
}
