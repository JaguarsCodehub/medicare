import express, { Request, Response } from 'express';
import { supabase } from '../utils/db';
import prisma from '../utils/prisma';
import { authMiddleware } from '../middleware/authmiddleware';
import { Medication, TakenLog } from '@prisma/client';

const router = express.Router();
// router.use(authMiddleware);

// Helper → get user id from token
// function getUserId(req: any): string {
//   return req.user.sub;
// }

// POST /medications → Add medication
router.post('/', async (req: Request, res: Response) => {
  const { name, dosage, frequency, times, email, startDate, endDate } = req.body;

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
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
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

    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
    });

    if (!medication || medication.patientId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Create timestamp: today + time slot
    const today = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    // Create timestamp in UTC
    const timestamp = new Date(Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      hours,
      minutes,
      0, // seconds
      0  // milliseconds
    ));

    console.log('Creating taken log:', {
      medicationId,
      time,
      status,
      timestamp: timestamp.toISOString(),
      localTime: timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });

    // Check if a log already exists for this medication and time today
    const existingLog = await prisma.takenLog.findFirst({
      where: {
        medicationId,
        timestamp: {
          equals: timestamp
        }
      }
    });

    let log;
    if (existingLog) {
      log = await prisma.takenLog.update({
        where: { id: existingLog.id },
        data: { status }
      });
      console.log('Updated existing log:', log);
    } else {
      log = await prisma.takenLog.create({
        data: {
          medicationId,
          status,
          timestamp,
        },
      });
      console.log('Created new log:', log);
    }

    // Return the updated medication with its logs
    const updatedMedication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: { 
        takenLog: {
          where: {
            timestamp: {
              gte: new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())),
              lt: new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1))
            }
          }
        }
      }
    });

    console.log('Returning updated medication:', updatedMedication);
    res.json(updatedMedication);
  } catch (err) {
    console.error('Error in taken-log:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /medications/schedule?email=xyz@gmail.com&date=2024-03-20
router.get('/schedule', async (req: Request, res: Response) => {
  const email = req.query.email as string;
  const dateStr = req.query.date as string;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse the date or use today's date if not provided
    const selectedDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    ));
    const endOfDay = new Date(Date.UTC(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate() + 1
    ));

    console.log('Fetching schedule for date range:', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    const medications = await prisma.medication.findMany({
      where: { 
        patientId: user.id,
        startDate: {
          lte: endOfDay
        },
        OR: [
          { endDate: null },
          { endDate: { gte: startOfDay } }
        ]
      },
      include: {
        takenLog: {
          where: {
            timestamp: {
              gte: startOfDay,
              lt: endOfDay
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        }
      },
    });

    console.log('Found medications:', medications.map(m => ({
      id: m.id,
      name: m.name,
      times: m.times,
      startDate: m.startDate,
      endDate: m.endDate,
      takenLogs: m.takenLog.map(log => ({
        time: log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        status: log.status
      }))
    })));

    const result = medications.map((med) => {
      const timesWithStatus = med.times.map((time) => {
        // Check if there is a TakenLog for this med + this time + selected date
        const log = med.takenLog.find((log) => {
          // Convert UTC time to local time for comparison
          const logTime = log.timestamp.toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'UTC'
          });
          const matches = logTime === time;
          console.log(`Checking time match for ${med.name}:`, {
            logTime,
            scheduledTime: time,
            matches,
            status: log?.status
          });
          return matches;
        });

        let status: 'TAKEN' | 'MISSED' | 'PENDING' = 'PENDING';
        if (log) {
          status = log.status;
        }

        return {
          time,
          status,
        };
      });

      return {
        medicationId: med.id,
        name: med.name,
        dosage: med.dosage,
        times: timesWithStatus,
      };
    });

    // Add isToday flag to help frontend determine if actions should be enabled
    const isToday = new Date().toDateString() === selectedDate.toDateString();

    console.log('Sending response:', { result, isToday });
    res.json({ medications: result, isToday });
  } catch (err) {
    console.error('Error in schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /medications/activity?email=xyz@gmail.com
router.get('/activity', async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get the start of today and 7 days ago in UTC
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 6 days ago to include today

    // Convert to UTC start and end of days
    const startOfSevenDaysAgo = new Date(Date.UTC(
      sevenDaysAgo.getFullYear(),
      sevenDaysAgo.getMonth(),
      sevenDaysAgo.getDate(),
      0, 0, 0, 0
    ));
    
    const endOfToday = new Date(Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      0, 0, 0, 0
    ));

    console.log('Fetching activity data for date range:', {
      startOfSevenDaysAgo: startOfSevenDaysAgo.toISOString(),
      endOfToday: endOfToday.toISOString()
    });

    // Get all medications and their taken logs for the past 7 days
    const medications = await prisma.medication.findMany({
      where: { patientId: user.id },
      include: {
        takenLog: {
          where: {
            timestamp: {
              gte: startOfSevenDaysAgo,
              lt: endOfToday
            }
          }
        }
      }
    });

    console.log('Found medications with logs:', medications.map(m => ({
      name: m.name,
      logs: m.takenLog.map(log => ({
        timestamp: log.timestamp.toISOString(),
        status: log.status
      }))
    })));

    // Create an array for the last 7 days
    const activityData = Array(7).fill(null).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      
      // Convert to UTC start and end of day
      const startOfDay = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0, 0, 0, 0
      ));
      
      const endOfDay = new Date(Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + 1,
        0, 0, 0, 0
      ));

      // Get all logs for this day
      const dayLogs = medications.flatMap(med => 
        med.takenLog.filter(log => 
          log.timestamp >= startOfDay && log.timestamp < endOfDay
        )
      );

      console.log(`Processing day ${date.toISOString()}:`, {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        logs: dayLogs.map(log => ({
          timestamp: log.timestamp.toISOString(),
          status: log.status
        }))
      });

      // Calculate status for the day
      let status: 'TAKEN' | 'MISSED' | 'PENDING' = 'PENDING';
      if (dayLogs.length > 0) {
        const hasMissed = dayLogs.some(log => log.status === 'MISSED');
        status = hasMissed ? 'MISSED' : 'TAKEN';
      }

      return {
        date: date.toISOString(),
        status,
        totalMedications: medications.length,
        takenCount: dayLogs.filter(log => log.status === 'TAKEN').length,
        missedCount: dayLogs.filter(log => log.status === 'MISSED').length
      };
    });

    console.log('Sending activity data:', activityData);
    res.json(activityData);
  } catch (err) {
    console.error('Error in activity:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
