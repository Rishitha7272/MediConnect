---
description: Set up the local development environment for MediConnect
---

# MediConnect Local Setup Workflow

Follow these steps to get MediConnect running on your local machine.

## Prerequisites
- Node.js (v18+)
- Supabase Project (URL and Service Role Key)

## Steps

1. **Install Dependencies**
   Run the following command in the root directory:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory (or `backend/.env` if applicable) with your Supabase credentials.
   You can use the `.env.example` as a template if it exists.
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

// turbo
3. **Data Seeding (Optional)**
   If you want to start with a fresh set of test data, run:
   ```bash
   node backend/scripts/seed-data.js
   ```
   This will reset existing users and create:
   - 1 Admin
   - 20 Doctors (across various specialties)
   - 5 Patients

4. **Verify Credentials**
   After seeding, check [USER_CREDENTIALS.md](./USER_CREDENTIALS.md) for the generated login details.

5. **Run the Application**
   Start the development server:
   ```bash
   npm run dev
   ```

6. **Access the App**
   Open [http://localhost:5173](http://localhost:5173) in your browser.
