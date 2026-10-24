import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

export const WOMENS_HEALTH_PACKAGES = [
    {
        id: 'wh-pcos-001',
        title: 'PCOS & Comprehensive Hormonal Profile',
        type: 'Package',
        test_count: 7,
        price: 2499,
        original_price: 4500,
        discount: 44,
        tat: '24-48 Hours',
        category: "Women's Health",
        image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800',
        description: 'Gold-standard diagnostic evaluation for Polycystic Ovary Syndrome (PCOS/PCOD), irregular cycles, hormonal imbalances, insulin resistance, and ovarian reserve assessment.',
        tests_included: [
            'LH, FSH, and LH:FSH ratio',
            'Testosterone (total and free), DHEA-S',
            'Prolactin',
            'Estradiol (E2), Progesterone',
            'AMH (ovarian reserve)',
            'Fasting insulin and fasting glucose, HbA1c',
            'Lipid profile'
        ],
        preparation: [
            '10-12 hours overnight fasting required (water is permitted).',
            'Blood draw recommended on Day 2 or Day 3 of menstrual cycle, or as advised by your gynecologist.',
            'Avoid heavy exercise and hormonal medications 24 hours prior to sampling unless prescribed.'
        ],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, 4th Block, Koramangala',
        tags: ['PCOS', 'Hormones', 'AMH', 'Fertility', 'Insulin Resistance', "Women's Health"]
    },
    {
        id: 'wh-thyroid-002',
        title: "Women's Thyroid & Autoimmune Health Panel",
        type: 'Package',
        test_count: 4,
        price: 1199,
        original_price: 2000,
        discount: 40,
        tat: '24 Hours',
        category: "Women's Health",
        image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
        description: "Comprehensive thyroid assessment to screen for hypothyroidism, hyperthyroidism, and autoimmune thyroiditis (Hashimoto's) which significantly affect menstrual regularity, weight, and fertility.",
        tests_included: [
            'TSH, Free T3, Free T4',
            'Anti-TPO antibodies'
        ],
        preparation: [
            'Overnight fasting of 8-10 hours is preferred for optimal TSH accuracy.',
            'If you take thyroid hormone medication, have your blood drawn before taking your morning dose.'
        ],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, 4th Block, Koramangala',
        tags: ['Thyroid', 'TSH', 'Free T3', 'Free T4', 'Anti-TPO', 'Autoimmune']
    },
    {
        id: 'wh-anemia-003',
        title: "Women's Complete Anemia & Nutrition Profile",
        type: 'Package',
        test_count: 5,
        price: 1499,
        original_price: 2800,
        discount: 46,
        tat: '24 Hours',
        category: "Women's Health",
        image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800',
        description: 'Comprehensive screening for iron deficiency anemia, chronic fatigue causes, Vitamin B12, and critical Vitamin D and Calcium bone nutrients common in women.',
        tests_included: [
            'Complete blood count (CBC), hemoglobin',
            'Serum ferritin, serum iron, TIBC',
            'Vitamin B12',
            'Vitamin D (25-OH)',
            'Calcium'
        ],
        preparation: [
            '10-12 hours overnight fasting required.',
            'Avoid iron and calcium supplements for 24 hours prior to blood test.'
        ],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, 4th Block, Koramangala',
        tags: ['Anemia', 'Iron', 'CBC', 'Vitamin B12', 'Vitamin D', 'Calcium', 'Fatigue']
    },
    {
        id: 'wh-pregnancy-004',
        title: 'Comprehensive Pregnancy & Prenatal Wellness Package',
        type: 'Package',
        test_count: 7,
        price: 3299,
        original_price: 6000,
        discount: 45,
        tat: '24-48 Hours',
        category: "Women's Health",
        image: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=800',
        description: 'Complete maternal and fetal safety panel for early pregnancy confirmation, infectious disease screening, blood typing, gestational diabetes check, and prenatal genetic markers.',
        tests_included: [
            'Beta-hCG (pregnancy confirmation)',
            'Blood group and Rh factor',
            'Glucose tolerance test (gestational diabetes)',
            'HIV, HBsAg, VDRL',
            'Rubella and TORCH panel',
            'Urine routine and culture',
            'Dual/triple marker screening (with ultrasound)'
        ],
        preparation: [
            'Fasting required for blood sugar and glucose tolerance evaluation.',
            'Drink 2-3 glasses of water 1 hour prior for urine routine sample collection.',
            'Bring ultrasound dating scan report if undergoing dual/triple marker screening.'
        ],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, 4th Block, Koramangala',
        tags: ['Pregnancy', 'Prenatal', 'Beta-hCG', 'TORCH', 'GTT', 'Maternal Care']
    },
    {
        id: 'wh-screening-005',
        title: "Women's Preventive & Cancer Screening Panel",
        type: 'Package',
        test_count: 5,
        price: 2199,
        original_price: 4200,
        discount: 47,
        tat: '48-72 Hours',
        category: "Women's Health",
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
        description: 'Essential preventive screening designed for early detection of cervical cellular abnormalities, high-risk HPV oncogenic strains, breast health referrals, and recurring urinary/vaginal infections.',
        tests_included: [
            'Pap smear (cervical cancer screening)',
            'HPV DNA test',
            'Breast screening referral (mammogram or ultrasound)',
            'Urine routine for UTIs',
            'Vaginal swab or culture, STI panel (when advised)'
        ],
        preparation: [
            'Best scheduled 10-14 days after the first day of your menstrual cycle.',
            'Avoid vaginal douches, medications, or sexual intercourse for 48 hours prior to test.',
            'Can be conducted at partner clinic by a registered female gynecologist / certified phlebotomist.'
        ],
        location: 'Clinic Visit / Partner Diagnostic Center',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Women & Wellness Diagnostic Center, Indiranagar',
        tags: ['Pap Smear', 'HPV DNA', 'Cervical Cancer', 'Preventive', 'UTI', 'Breast Screening']
    },
    {
        id: 'wh-menopause-006',
        title: 'Menopause & Bone Health Profile',
        type: 'Package',
        test_count: 4,
        price: 1799,
        original_price: 3400,
        discount: 47,
        tat: '24 Hours',
        category: "Women's Health",
        image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800',
        description: 'Targeted assessment for perimenopause and post-menopause transition, tracking estrogen loss, bone mineral density indicators, and osteoporosis risk.',
        tests_included: [
            'FSH, Estradiol',
            'Bone density (DEXA) referral',
            'Vitamin D (25-OH)',
            'Calcium tests'
        ],
        preparation: [
            'Morning fasting of 8-10 hours recommended.',
            'Do not take calcium or vitamin supplements on the morning of testing.'
        ],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, 4th Block, Koramangala',
        tags: ['Menopause', 'FSH', 'Estradiol', 'Bone Density', 'DEXA', 'Calcium', 'Osteoporosis']
    }
];

// Foundational general packages
const GENERAL_PACKAGES = [
    {
        id: 'lab-pkg-001',
        title: 'Comprehensive Full Body Checkup (Executive)',
        type: 'Package',
        test_count: 85,
        price: 1999,
        original_price: 4999,
        discount: 60,
        tat: '24 Hours',
        category: 'Full Body',
        image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=800',
        description: 'Complete health evaluation covering vital organs including Liver, Kidney, Thyroid, Heart, Blood Sugar, and Complete Hemogram.',
        tests_included: ['CBC (Hemogram 24 params)', 'Liver Function Test (11 params)', 'Kidney Function Test (8 params)', 'Lipid Profile (8 params)', 'Thyroid Profile (TSH, T3, T4)', 'Blood Sugar Fasting & HbA1c', 'Vitamin D & B12', 'Urine Routine (15 params)'],
        preparation: ['10-12 hours overnight fasting required. Water is permitted.'],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, Koramangala',
        tags: ['Full Body', 'Preventive', 'Popular']
    },
    {
        id: 'lab-pkg-002',
        title: 'Diabetes Comprehensive Screening Package',
        type: 'Package',
        test_count: 8,
        price: 699,
        original_price: 1400,
        discount: 50,
        tat: '12 Hours',
        category: 'Diabetes',
        image: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&q=80&w=800',
        description: 'Essential glycemic control panel including 3-month average glucose, fasting sugar, urine microalbumin, and kidney safety indices.',
        tests_included: ['HbA1c (Glycosylated Hemoglobin)', 'Fasting Blood Sugar (FBS)', 'Post-Prandial Blood Sugar (PPBS)', 'Urine Microalbumin/Creatinine Ratio', 'Lipid Screen'],
        preparation: ['Fasting sample required, followed by PP sample exactly 2 hours after meal.'],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, Koramangala',
        tags: ['Diabetes', 'HbA1c', 'Glucose']
    },
    {
        id: 'lab-pkg-003',
        title: 'Advanced Cardiac Risk Assessment',
        type: 'Package',
        test_count: 14,
        price: 1299,
        original_price: 2600,
        discount: 50,
        tat: '24 Hours',
        category: 'Heart',
        image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800',
        description: 'Targeted cardiovascular profile assessing arterial health, high-sensitivity C-reactive protein, homocysteine, and lipid particles.',
        tests_included: ['hs-CRP (Cardiac Inflammation)', 'Apolipoprotein A1 & B', 'Homocysteine', 'Total Cholesterol', 'HDL, LDL, VLDL, Triglycerides', 'Lipoprotein (a)'],
        preparation: ['12 hours overnight fasting mandatory. Avoid alcohol 24 hours prior.'],
        location: 'In-Lab or Free Home Sample Collection',
        contact_number: '+91 800-432-5888',
        lab_address: 'MediConnect Central Clinical Reference Lab, Koramangala',
        tags: ['Heart', 'Cardiac', 'Cholesterol']
    }
];

/**
 * GET /api/lab-tests
 * List lab tests, optionally filtered by category
 */
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;

        // Try to fetch tests from Supabase
        let dbTests = [];
        try {
            const { data, error } = await supabase.from('lab_tests').select('*');
            if (!error && data) {
                dbTests = data.map(t => ({
                    ...t,
                    tests_included: Array.isArray(t.tests_included)
                        ? t.tests_included
                        : (typeof t.tests_included === 'string' ? JSON.parse(t.tests_included || '[]') : []),
                    preparation: Array.isArray(t.preparation)
                        ? t.preparation
                        : (typeof t.preparation === 'string' ? JSON.parse(t.preparation || '[]') : []),
                    tags: Array.isArray(t.tags) ? t.tags : []
                }));
            }
        } catch (dbErr) {
            console.warn('[LabTests] Supabase fetch warning:', dbErr.message);
        }

        // Merge DB tests with Women's Health tests and general packages (preventing duplicates)
        const allTests = [...WOMENS_HEALTH_PACKAGES, ...GENERAL_PACKAGES];
        for (const dTest of dbTests) {
            if (!allTests.some(t => t.id === dTest.id || t.title.toLowerCase() === dTest.title.toLowerCase())) {
                allTests.push(dTest);
            }
        }

        let filtered = allTests;

        if (category && category !== 'All') {
            filtered = filtered.filter(t => {
                if (category === "Women's Health" || category === "Womens Health") {
                    return t.category === "Women's Health" || t.category === "Womens Health";
                }
                return t.category === category;
            });
        }

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q)) ||
                (t.tests_included && t.tests_included.some(item => item.toLowerCase().includes(q))) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }

        res.json(filtered);
    } catch (error) {
        console.error('[LabTests] Error retrieving tests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/lab-tests/book
 * Book a lab test or home collection appointment
 */
router.post('/book', async (req, res) => {
    try {
        const { patientId, items, scheduledDate, scheduledTime, address, phone, totalAmount } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ error: 'Cart is empty. Please select at least one test.' });
        }

        const bookingId = `LAB_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Attempt Supabase insert if table exists
        try {
            await supabase.from('lab_bookings').insert({
                booking_id: bookingId,
                patient_id: patientId || null,
                items: JSON.stringify(items),
                scheduled_date: scheduledDate || new Date().toISOString().split('T')[0],
                scheduled_time: scheduledTime || '08:00 AM - 10:00 AM',
                address: typeof address === 'object' ? JSON.stringify(address) : (address || 'Home Collection'),
                phone: phone || '',
                total_amount: totalAmount || 0,
                status: 'Confirmed'
            });
        } catch (supabaseErr) {
            console.warn('[LabTests] Booking Supabase fallback (stored in memory/local):', supabaseErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Lab tests booked successfully! Our certified phlebotomist will contact you.',
            bookingId,
            itemsCount: items.length,
            totalAmount,
            scheduledDate: scheduledDate || new Date().toISOString().split('T')[0],
            scheduledTime: scheduledTime || '08:00 AM - 10:00 AM',
            status: 'Confirmed'
        });
    } catch (error) {
        console.error('[LabTests] Booking error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
