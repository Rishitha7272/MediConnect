import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { uploadDoctorDocument } from '../services/fileService.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow PDF, JPG, JPEG, PNG
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
        }
    },
});

// Mock Gynecologists for comprehensive women's health consultation
export const MOCK_GYNECOLOGISTS = [
    {
        id: 'doc-gyn-001',
        first_name: 'Sunita',
        surname: 'Rao',
        specialty: 'Gynecology',
        hospital_name: 'Apollo Cradle & Children\'s Hospital',
        hospital_location: 'Indiranagar, Bangalore',
        years_of_experience: 16,
        price: 900,
        rating: 4.9,
        reviews: 240,
        image: 'https://images.unsplash.com/photo-1594824813504-80252ea9d3c5?auto=format&fit=crop&q=80&w=800',
        approval_status: 'approved',
        professional_bio: 'Senior Obstetrician & Gynecologist specializing in PCOS/PCOD management, reproductive endocrinology, and high-risk pregnancy.',
        nextAvailable: 'Today, 4:30 PM',
        travelTime: '12 mins',
        distance: '1.8 km'
    },
    {
        id: 'doc-gyn-002',
        first_name: 'Ananya',
        surname: 'Sharma',
        specialty: 'Gynecology',
        hospital_name: 'Fortis La Femme Speciality Hospital',
        hospital_location: 'Richmond Town, Bangalore',
        years_of_experience: 12,
        price: 850,
        rating: 4.8,
        reviews: 185,
        image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800',
        approval_status: 'approved',
        professional_bio: 'Consultant Gynecologist & Laparoscopic Surgeon with expertise in adolescent health, menstrual disorders, fibroids, and prenatal wellness.',
        nextAvailable: 'Tomorrow, 11:00 AM',
        travelTime: '20 mins',
        distance: '3.2 km'
    },
    {
        id: 'doc-gyn-003',
        first_name: 'Priya',
        surname: 'Patel',
        specialty: 'Gynecology',
        hospital_name: 'Cloudnine Hospital',
        hospital_location: 'Jayanagar, Bangalore',
        years_of_experience: 10,
        price: 800,
        rating: 4.9,
        reviews: 160,
        image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800',
        approval_status: 'approved',
        professional_bio: 'Specialist in fertility guidance, menopause management, preconception planning, and natural birth counseling.',
        nextAvailable: 'Today, 6:00 PM',
        travelTime: '15 mins',
        distance: '2.4 km'
    },
    {
        id: 'doc-gyn-004',
        first_name: 'Sarah',
        surname: 'Jenkins',
        specialty: 'Gynecology',
        hospital_name: 'Manipal Hospital Women\'s Wing',
        hospital_location: 'HAL Airport Road, Bangalore',
        years_of_experience: 15,
        price: 950,
        rating: 4.8,
        reviews: 210,
        image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800',
        approval_status: 'approved',
        professional_bio: 'Senior Consultant Gynecologist specializing in preventive cervical cancer screening, endometriosis, and bone density preservation.',
        nextAvailable: 'Tomorrow, 2:30 PM',
        travelTime: '25 mins',
        distance: '4.0 km'
    }
];

/**
 * GET /api/doctors
 * Get all approved doctors, optionally filtered by specialty
 */
router.get('/', async (req, res) => {
    try {
        const { specialty } = req.query;
        let query = supabase
            .from('doctors')
            .select('*')
            .eq('approval_status', 'approved');

        if (specialty && specialty !== 'All') {
            query = query.ilike('specialty', `%${specialty}%`);
        }

        const { data, error } = await query;
        let doctors = (data && data.length > 0) ? [...data] : [];

        // Always ensure Gynecologists are available for women's health consultations
        const hasGynecologist = doctors.some(d => d.specialty && d.specialty.toLowerCase().includes('gynecolog'));
        if (!hasGynecologist) {
            if (!specialty || specialty === 'All' || specialty.toLowerCase().includes('gynecolog')) {
                doctors = [...MOCK_GYNECOLOGISTS, ...doctors];
            }
        }

        res.json(doctors);
    } catch (error) {
        console.error('[Doctor Routes] Get doctors error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/doctors/:userId
 * Get doctor profile by user ID
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('doctors')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        res.json(data);
    } catch (error) {
        console.error('[Doctor Routes] Get doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/doctors/:userId/documents
 * Get all documents for a doctor
 */
router.get('/:userId/documents', async (req, res) => {
    try {
        const { userId } = req.params;

        // First get doctor_id from user_id
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (doctorError) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Get documents
        const { data: documents, error: docsError } = await supabase
            .from('doctor_documents')
            .select('*')
            .eq('doctor_id', doctor.id);

        if (docsError) {
            return res.status(400).json({ error: docsError.message });
        }

        res.json(documents);
    } catch (error) {
        console.error('[Doctor Routes] Get documents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/doctors/:userId/documents
 * Upload doctor documents
 */
router.post('/:userId/documents', upload.array('documents', 10), async (req, res) => {
    try {
        const { userId } = req.params;
        const files = req.files;
        const documentTypes = JSON.parse(req.body.documentTypes || '[]');

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Get doctor_id
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (doctorError) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        // Upload each file
        const uploadedDocs = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const documentType = documentTypes[i] || 'other';

            const result = await uploadDoctorDocument(
                doctor.id,
                userId,
                file,
                documentType
            );

            if (result.success) {
                uploadedDocs.push(result.document);
            }
        }

        res.status(201).json({
            message: 'Documents uploaded successfully',
            documents: uploadedDocs,
        });
    } catch (error) {
        console.error('[Doctor Routes] Upload documents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/doctors/:userId/approve
 * Approve a doctor (admin only)
 */
router.put('/:userId/approve', async (req, res) => {
    try {
        const { userId } = req.params;
        const { approvedBy } = req.body;

        const { data, error } = await supabase
            .from('doctors')
            .update({
                approval_status: 'approved',
                approved_by: approvedBy,
                approved_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Doctor approved successfully',
            data,
        });
    } catch (error) {
        console.error('[Doctor Routes] Approve doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/doctors/:userId
 * Update doctor profile
 */
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('doctors')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'Doctor profile updated successfully',
            data,
        });
    } catch (error) {
        console.error('[Doctor Routes] Update doctor error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
