import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Mock store for resilient offline/development fallback
const appointmentsStore = [];

/**
 * GET /api/appointments
 * List appointments for a patient or doctor
 */
router.get('/', async (req, res) => {
    try {
        const { patientId, doctorId } = req.query;

        let query = supabase.from('appointments').select('*');
        if (patientId) query = query.eq('patient_id', patientId);
        if (doctorId) query = query.eq('doctor_id', doctorId);

        const { data, error } = await query;
        let appointments = data || [];

        // Merge with any in-memory stored appointments for this patient
        if (patientId) {
            const extra = appointmentsStore.filter(a => a.patient_id === patientId && !appointments.some(dbA => dbA.id === a.id));
            appointments = [...appointments, ...extra];
        }

        res.json(appointments);
    } catch (error) {
        console.error('[Appointments Route] Fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/appointments
 * Create a new appointment with a doctor (including Gynecologists)
 */
router.post('/', async (req, res) => {
    try {
        const {
            patientId,
            doctorId,
            doctorName,
            specialty,
            date,
            time,
            type,
            notes,
            amount
        } = req.body;

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        const appointmentId = `APT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const scheduledDate = date === 'Today' ? new Date().toISOString().split('T')[0] : (date || new Date().toISOString().split('T')[0]);
        const scheduledTime = time || '10:00 AM';

        const newAppointment = {
            id: appointmentId,
            patient_id: patientId || 'guest-patient',
            doctor_id: doctorId,
            doctor_name: doctorName || 'Specialist Doctor',
            specialty: specialty || 'General Medicine',
            date: scheduledDate,
            time: scheduledTime,
            type: type || 'video',
            status: 'Upcoming',
            notes: notes || '',
            amount: amount || 800,
            created_at: new Date().toISOString()
        };

        // Try inserting into Supabase
        try {
            const { data: dbData, error: dbError } = await supabase
                .from('appointments')
                .insert({
                    patient_id: patientId || null,
                    doctor_id: doctorId.startsWith('doc-gyn') ? null : doctorId,
                    date: scheduledDate,
                    time: scheduledTime.includes(':') ? (scheduledTime.length <= 8 ? scheduledTime : '10:00:00') : '10:00:00',
                    type: type || 'video',
                    status: 'upcoming',
                    notes: notes || ''
                })
                .select()
                .single();

            if (dbData) {
                newAppointment.id = dbData.id;
            }
        } catch (supabaseErr) {
            console.warn('[Appointments Route] Supabase insert warning (persisting to store):', supabaseErr.message);
        }

        appointmentsStore.unshift(newAppointment);

        res.status(201).json({
            success: true,
            message: `Appointment scheduled successfully with ${doctorName || 'your doctor'}!`,
            appointment: newAppointment
        });
    } catch (error) {
        console.error('[Appointments Route] Booking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
