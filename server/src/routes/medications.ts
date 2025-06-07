import express, { Request, Response } from 'express';
import { supabase } from '../utils/db';
import prisma from '../utils/prisma';
import { authMiddleware } from '../middleware/authmiddleware';

const router = express.Router();
// router.use(authMiddleware);

// Helper → get user id from token
// function getUserId(req: any): string {
//   return req.user.sub;
// }

// POST /medications → Add medication
router.post('/', async (req: Request, res: Response) => {
  const { name, dosage, frequency, times, email } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    // console.log(user?.email)

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const medication = await prisma.medication.create({
      data: {
        name,
        dosage,
        frequency,
        times,
        patientId: user.id,
      },
    });

    res.json(medication);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /medications → List medications
router.get('/', async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email) {
    console.log("No Email")
  }

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    console.log(email)

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const medications = await prisma.medication.findMany({
      where: { patientId: user.id },
      include: { takenLog: true },
    });

    res.json(medications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /medications/:id/taken-log → Mark as TAKEN or MISSED
router.post('/:id/taken-log', async (req: Request, res: Response) => {
  const { email } = req.body;
  const medicationId = req.params.id;
  const { time, status } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if medication belongs to user
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication || medication.patientId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Create timestamp: today + time slot
    const today = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    const timestamp = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes
    );

    const log = await prisma.takenLog.create({
      data: {
        medicationId,
        status,
        timestamp,
      },
    });

    res.json(log);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
