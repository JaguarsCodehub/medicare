# Medicare App MVP

## 🎯 Goal
Build a React Native app using Expo Router + TypeScript for patients and caregivers to manage medication schedules, track adherence, and connect with caregivers. This is a medication reminder and logging system. Notifications and advanced features will be added later — only focus on MVP.

## 🧱 Tech Stack
- Frontend: React Native (Expo Router + TypeScript)
- Backend: Node.js (Express)
- DB + Auth: Supabase (PostgreSQL, row-level security, auth)
- ORM: Prisma

## 🧪 MVP (P0) Features
1. **User Roles**: `patient`, `caregiver`
2. **Auth**: Supabase email/password authentication
3. **Patient can:**
   - Add medications (name, dosage, frequency, time)
   - View medication schedule
   - Mark medications as "Taken" or "Missed" (toggle switch per med)
4. **Caregiver can:**
   - Link to a patient via patient email or invite code
   - View patient’s medications and adherence history

## 🗂️ Structure
- Frontend: Expo Router-based navigation (app/, components/, lib/)
- Backend: Simple REST API to serve app with Prisma
- Supabase: Auth, Database, Row-level security

## 🔐 Supabase Auth Rules
- Patients can only manage their own medications.
- Caregivers can only read data of linked patients.

