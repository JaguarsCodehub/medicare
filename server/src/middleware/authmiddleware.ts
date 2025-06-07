import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// In real usage, fetch JWKS from Supabase. For dev, use SUPABASE_JWT_SECRET.
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No auth header' });

  const token = authHeader.split('')[1];
  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET);
    (req as any).user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
