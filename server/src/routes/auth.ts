import express, { Request, Response } from 'express';
import { supabase } from '../utils/db';
import prisma from '../utils/prisma';

const router = express.Router();

router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data.user?.email || !data.user?.id) {
    return res
      .status(400)
      .json({ error: 'Invalid user data returned from Supabase' });
  }

  await prisma.user.create({
    data: {
      id: data.user.id,
      email: data.user.email,
      role: 'PATIENT',
    },
  });

  res.json({ message: 'User registered', user: data.user });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: data.user,
  });

  // console.log(data.session?.access_token)
});

export default router;
