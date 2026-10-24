import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../src/lib/supabase';
import ChatBot from './ChatBot';
import JitsiMeet from './JitsiMeet';
import {
    LayoutGrid,
    Stethoscope,
    TestTube,
    Pill,
    FileText,
    BrainCircuit,
    LogOut,
    Menu,
    X,
    Search,
    Mic,
    Bell,
    FlaskConical,
    Video,
    MessageCircle,
    Thermometer,
    Snowflake,
    Smile,
    Zap,
    Activity,
    Calendar,
    Clock,
    MapPin,
    Download,
    FileCheck,
    Bone,
    Eye,
    Heart,
    Send,
    Star,
    Filter,
    Check,
    CreditCard,
    Receipt,
    Navigation,
    ChevronRight,
    Phone,
    ShoppingCart,
    Minus,
    Plus,
    Trash2,
    Info,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    ShieldCheck,
    ShoppingBag,
    Truck,
    Package,
    Image as ImageIcon,
    File,
    CheckCircle,
    Loader2,
    Sparkles,
    Printer
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { pharmacyService } from '../src/services/pharmacyService';
import LabTestDetails, { LabTest } from './LabTestDetails';
import LabReceipt from './LabReceipt';
import { doctorService, labTestService, appointmentService } from '../src/services/api';

interface PatientDashboardProps {
    onLogout: () => void;
}

interface Doctor {
    id: string;
    name: string;
    specialty: string;
    hospital: string;
    rating: number;
    reviews: number;
    experience: string;
    image: string;
    nextAvailable: string;
    price: number;
    location: string;
    distance: string;
    travelTime: string;
}

interface PharmacyMedicine {
    id: string;
    name: string;
    genericName?: string;
    type: string;
    price: number;
    originalPrice: number;
    discount: number;
    image: string;
    category: string;
    manufacturer: string;
    dosage: string;
    packSize: string;
    description: string;
    mechanismOfAction?: string; // AI Enhanced Description
    isGeneric?: boolean;
}

interface HealthReport {
    id: string;
    title: string;
    type: string;
    date: string;
    doctorOrLab: string;
    fileType: string;
    fileSize: string;
    rawNotes?: any; // To store parsed AI notes
}

const MOCK_ALL_DOCTORS: Doctor[] = [];
// NOTE: for brevity in this replace call I will not copy all mock lines, assuming I can use multi_replace or just insert the logic.
// Actually, `replace_file_content` requires exact match.
// Accessing the file content again to be sure I match exactly.



// --- TYPES ---
interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text?: string;
    type: 'text' | 'doctor-recommendation';
    doctors?: Doctor[];
    categoryRecommended?: string;
}

interface Appointment {
    id: string;
    doctorId: string;
    doctorName: string;
    doctorImage: string;
    specialty: string;
    hospital: string;
    date: string;
    time: string;
    type: 'video' | 'clinic';
    status: 'Upcoming' | 'Completed';
    travelTime?: string; // Only for clinic
}

interface PaymentReceipt {
    transactionId: string;
    date: string;
    doctorName: string;
    amount: number;
    status: 'Success';
    description: string;
}

interface Interaction {
    id: string;
    doctorName: string;
    doctorImage: string;
    date: string;
    type: 'Chat' | 'Video Call';
    summary: string;
}

const PatientDashboard: React.FC<PatientDashboardProps> = ({ onLogout }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('overview');

    // --- LOCALIZED DATA ---
    const SYMPTOMS_LIST = React.useMemo(() => [
        { id: 'fever', label: t('dashboard.symptoms.fever_label'), icon: Thermometer, color: 'text-rose-500', bg: 'bg-rose-50', category: 'General Physician' },
        { id: 'cold', label: t('dashboard.symptoms.cold_label'), icon: Snowflake, color: 'text-sky-500', bg: 'bg-sky-50', category: 'General Physician' },
        { id: 'stomach', label: t('dashboard.symptoms.stomach_label'), icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', category: 'General Physician' },
        { id: 'headache', label: t('dashboard.symptoms.headache_label'), icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-50', category: 'Neurologist' },
        { id: 'dental', label: t('dashboard.symptoms.dental_label'), icon: Smile, color: 'text-teal-500', bg: 'bg-teal-50', category: 'Dentist' },
        { id: 'eye', label: t('dashboard.symptoms.eye_label'), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50', category: 'Ophthalmologist' },
        { id: 'joint', label: t('dashboard.symptoms.joint_label'), icon: Bone, color: 'text-slate-500', bg: 'bg-slate-100', category: 'Orthopedist' },
        { id: 'heart', label: t('dashboard.symptoms.heart_label'), icon: Heart, color: 'text-red-500', bg: 'bg-red-50', category: 'Cardiologist' },
    ], [t]);

    const matchesSpecialty = (doctorSpecialty: string, selected: string): boolean => {
        if (!selected || selected === 'All') return true;
        if (!doctorSpecialty) return false;

        const doc = doctorSpecialty.toLowerCase().trim();
        const sel = selected.toLowerCase().trim();

        if (doc === sel || doc.includes(sel) || sel.includes(doc)) return true;

        const specialtyGroups: string[][] = [
            ['cardio', 'cardiology', 'cardiologist', 'heart'],
            ['neuro', 'neurology', 'neurologist', 'brain'],
            ['ortho', 'orthopedics', 'orthopedist', 'orthopaedic', 'bone', 'joint'],
            ['ophthalm', 'ophthalmology', 'ophthalmologist', 'eye'],
            ['pediatr', 'pediatrics', 'pediatrician', 'paediatrics', 'child'],
            ['dermat', 'dermatology', 'dermatologist', 'skin'],
            ['psych', 'psychiatry', 'psychiatrist', 'mental'],
            ['dent', 'dentistry', 'dentist', 'dental'],
            ['gynec', 'gynecology', 'gynecologist', 'women'],
            ['gastro', 'gastroenterology', 'gastroenterologist', 'stomach'],
            ['endocrin', 'endocrinology', 'endocrinologist', 'thyroid', 'diabetes'],
            ['urolog', 'urology', 'urologist'],
            ['general', 'general physician', 'general medicine', 'physician', 'internal medicine', 'cold', 'fever']
        ];

        for (const group of specialtyGroups) {
            const docMatches = group.some(term => doc.includes(term));
            const selMatches = group.some(term => sel.includes(term));
            if (docMatches && selMatches) return true;
        }

        return false;
    };

    const SPECIALTY_FILTERS = React.useMemo(() => [
        'All',
        'Cardiologist',
        'General Physician',
        'Dentist',
        'Neurologist',
        'Orthopedist',
        'Ophthalmologist',
        'Gynecologist',
        'Dermatologist',
        'Pediatrician'
    ], []);

    const LAB_CATEGORIES = React.useMemo(() => ['All', 'Women\'s Health', 'Full Body', 'Diabetes', 'Heart', 'Thyroid', 'Blood Studies', 'Senior Citizen'].map(cat =>
        cat === 'All' ? t('dashboard.labCategories.all') :
            cat === 'Full Body' ? t('dashboard.labCategories.fullBody') :
                cat === 'Diabetes' ? t('dashboard.labCategories.diabetes') :
                    cat === 'Heart' ? t('dashboard.labCategories.heart') :
                        cat === 'Thyroid' ? t('dashboard.labCategories.thyroid') :
                            cat === 'Blood Studies' ? t('dashboard.labCategories.blood') :
                                cat === 'Women\'s Health' ? t('dashboard.labCategories.womenHealth') :
                                    cat === 'Senior Citizen' ? t('dashboard.labCategories.senior') : cat
    ), [t]);

    // Dedicated Gynecologist doctors for consultation
    const GYNECOLOGIST_DOCTORS: Doctor[] = React.useMemo(() => [
        {
            id: 'doc-gyn-001',
            name: 'Dr. Sunita Rao',
            specialty: 'Gynecology',
            hospital: 'Apollo Cradle & Children\'s Hospital',
            rating: 4.9,
            reviews: 240,
            experience: '16 Years',
            image: 'https://images.unsplash.com/photo-1594824813504-80252ea9d3c5?auto=format&fit=crop&q=80&w=800',
            nextAvailable: 'Today, 4:30 PM',
            price: 900,
            location: 'Indiranagar, Bangalore',
            distance: '1.8 km',
            travelTime: '12 mins'
        },
        {
            id: 'doc-gyn-002',
            name: 'Dr. Ananya Sharma',
            specialty: 'Gynecology',
            hospital: 'Fortis La Femme Speciality Hospital',
            rating: 4.8,
            reviews: 185,
            experience: '12 Years',
            image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=800',
            nextAvailable: 'Tomorrow, 11:00 AM',
            price: 850,
            location: 'Richmond Town, Bangalore',
            distance: '3.2 km',
            travelTime: '20 mins'
        },
        {
            id: 'doc-gyn-003',
            name: 'Dr. Priya Patel',
            specialty: 'Gynecology',
            hospital: 'Cloudnine Hospital',
            rating: 4.9,
            reviews: 160,
            experience: '10 Years',
            image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800',
            nextAvailable: 'Today, 6:00 PM',
            price: 800,
            location: 'Jayanagar, Bangalore',
            distance: '2.4 km',
            travelTime: '15 mins'
        },
        {
            id: 'doc-gyn-004',
            name: 'Dr. Sarah Jenkins',
            specialty: 'Gynecology',
            hospital: 'Manipal Hospital Women\'s Wing',
            rating: 4.8,
            reviews: 210,
            experience: '15 Years',
            image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800',
            nextAvailable: 'Tomorrow, 2:30 PM',
            price: 950,
            location: 'HAL Airport Road, Bangalore',
            distance: '4.0 km',
            travelTime: '25 mins'
        }
    ], []);

    // Standard Women's Health diagnostic packages requested
    const DEFAULT_WOMENS_HEALTH_LAB_TESTS: LabTest[] = React.useMemo(() => [
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
    ], []);

    const MEDICINES: PharmacyMedicine[] = React.useMemo(() => [
        { id: 'med1', name: 'Dolo 650mg', type: 'Tablet', price: 30, originalPrice: 40, discount: 25, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800', category: 'Tablets', manufacturer: 'Micro Labs Ltd', dosage: '650mg', packSize: '15 Tablets', description: t('pharmacy.medicines.dolo.desc') },
        { id: 'med2', name: 'Benadryl Cough Syrup', type: 'Syrup', price: 110, originalPrice: 125, discount: 12, image: 'https://images.unsplash.com/photo-1603555501671-3f938d01f92e?auto=format&fit=crop&q=80&w=800', category: 'Syrups', manufacturer: 'Johnson & Johnson', dosage: '150ml', packSize: '1 Bottle', description: t('pharmacy.medicines.benadryl.desc') },
        { id: 'med3', name: 'Volini Gel', type: 'Ointment', price: 145, originalPrice: 160, discount: 9, image: 'https://images.unsplash.com/photo-1626968037373-c4eb9d042299?auto=format&fit=crop&q=80&w=800', category: 'Creams & Ointments', manufacturer: 'Sun Pharma', dosage: '30g', packSize: '1 Tube', description: t('pharmacy.medicines.volini.desc') },
        { id: 'med4', name: 'Seven Seas Cod Liver Oil', type: 'Capsule', price: 320, originalPrice: 400, discount: 20, image: 'https://images.unsplash.com/photo-1550572017-ed108bc2773d?auto=format&fit=crop&q=80&w=800', category: 'Supplements', manufacturer: 'Merck', dosage: '300mg', packSize: '100 Capsules', description: t('pharmacy.medicines.sevenseas.desc') },
        { id: 'med5', name: 'Dettol Antiseptic', type: 'Liquid', price: 180, originalPrice: 200, discount: 10, image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=800', category: 'First Aid', manufacturer: 'Reckitt', dosage: '500ml', packSize: '1 Bottle', description: t('pharmacy.medicines.dettol.desc') },
        { id: 'med6', name: 'Refresh Tears', type: 'Drops', price: 480, originalPrice: 550, discount: 12, image: 'https://images.unsplash.com/photo-1588625902096-747209930605?auto=format&fit=crop&q=80&w=800', category: 'Eye Drops', manufacturer: 'Allergan', dosage: '10ml', packSize: '1 Bottle', description: t('pharmacy.medicines.refresh.desc') },
        { id: 'med7', name: 'Hansaplast Bandage', type: 'Bandage', price: 50, originalPrice: 60, discount: 16, image: 'https://images.unsplash.com/photo-1599407333919-61994e773703?auto=format&fit=crop&q=80&w=800', category: 'First Aid', manufacturer: 'Beiersdorf', dosage: 'Standard', packSize: '20 Strips', description: t('pharmacy.medicines.hansaplast.desc') },
        { id: 'med8', name: 'Otrivin Nasal Drops', type: 'Drops', price: 65, originalPrice: 75, discount: 13, image: 'https://images.unsplash.com/photo-1631549916768-4119b2d3f9e2?auto=format&fit=crop&q=80&w=800', category: 'Ear & Nasal Drops', manufacturer: 'GSK', dosage: '10ml', packSize: '1 Bottle', description: t('pharmacy.medicines.otrivin.desc') },
        { id: 'med9', name: 'Shelcal 500', type: 'Tablet', price: 120, originalPrice: 140, discount: 14, image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800', category: 'Supplements', manufacturer: 'Torrent Pharma', dosage: '500mg', packSize: '15 Tablets', description: t('pharmacy.medicines.shelcal.desc') },
    ], [t]);

    const HEALTH_REPORTS: HealthReport[] = React.useMemo(() => [
        { id: 'r1', title: 'Complete Blood Count (CBC)', type: 'Lab Report', date: '28 Jan, 2024', doctorOrLab: 'Apollo Diagnostics', fileType: 'PDF', fileSize: '1.2 MB' },
        { id: 'r2', title: 'Viral Fever Follow-up', type: 'Prescription', date: '25 Jan, 2024', doctorOrLab: 'Dr. Robert Smith', fileType: 'PDF', fileSize: '450 KB' },
        { id: 'r3', title: 'Chest X-Ray (PA View)', type: 'Medical Report', date: '10 Dec, 2023', doctorOrLab: 'City Imaging Center', fileType: 'JPG', fileSize: '3.5 MB' },
        { id: 'r4', title: 'Comprehensive Lipid Profile', type: 'Lab Report', date: '15 Nov, 2023', doctorOrLab: 'Orange Health Labs', fileType: 'PDF', fileSize: '1.8 MB' },
        { id: 'r5', title: 'Dental Root Canal Consultation', type: 'Prescription', date: '05 Nov, 2023', doctorOrLab: 'Dr. Susan Lee', fileType: 'PDF', fileSize: '800 KB' },
        { id: 'r6', title: 'MRI Knee Joint', type: 'Medical Report', date: '20 Oct, 2023', doctorOrLab: 'City Imaging Center', fileType: 'JPG', fileSize: '12 MB' },
        { id: 'r7', title: 'Thyroid Function Test (TFT)', type: 'Lab Report', date: '12 Oct, 2023', doctorOrLab: 'Thyrocare', fileType: 'PDF', fileSize: '1.5 MB' },
        { id: 'r8', title: 'Cardiology Follow-Up', type: 'Prescription', date: '30 Sep, 2023', doctorOrLab: 'Dr. Emily Chen', fileType: 'PDF', fileSize: '320 KB' },
    ], []);

    const REPORT_FILTERS = React.useMemo(() => ['All', 'Lab Report', 'Prescription', 'Medical Report'], []);


    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [viewAllSymptomsOpen, setViewAllSymptomsOpen] = useState(false);

    // Filter Logic States
    const [selectedSpecialty, setSelectedSpecialty] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // --- DYNAMIC DATA STATE ---
    const [userName, setUserName] = useState<string>('User');
    const [userId, setUserId] = useState<string | null>(null);
    const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
    const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
    const [medicinesList, setMedicinesList] = useState<PharmacyMedicine[]>([]);
    const [loadingMedicines, setLoadingMedicines] = useState(false);
    const [allReports, setAllReports] = useState<HealthReport[]>(HEALTH_REPORTS);
    const [viewingReport, setViewingReport] = useState<HealthReport | null>(null);

    useEffect(() => {
        // 1. Fetch User
        const fetchUserData = async () => {
            // Check if there is a session stored by the backend logic
            const storedSession = localStorage.getItem('supabase_session');
            let currentSession = null;

            if (storedSession) {
                try {
                    const parsedSession = JSON.parse(storedSession);
                    if (parsedSession && parsedSession.access_token && parsedSession.refresh_token) {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: parsedSession.access_token,
                            refresh_token: parsedSession.refresh_token
                        });
                        if (error) console.error("Error setting session from storage:", error);
                        currentSession = data.session;
                    }
                } catch (e) {
                    console.error("Error parsing stored session:", e);
                }
            }

            // Fallback to getting user if setSession worked or if already logged in via client logic
            const { data: { user } } = await supabase.auth.getUser();
            console.log("Current User:", user);
            if (user) {
                setUserId(user.id);
                // Prioritize fetching from 'patients' table as it's the source of truth
                const { data: patient, error } = await supabase
                    .from('patients')
                    .select('first_name')
                    .eq('user_id', user.id)
                    .single();

                if (patient?.first_name) {
                    console.log("Fetched name from DB:", patient.first_name);
                    setUserName(patient.first_name);
                } else if (user.user_metadata?.firstName) {
                    console.log("Fallback to metadata name:", user.user_metadata.firstName);
                    setUserName(user.user_metadata.firstName);
                } else {
                    console.log("No name found in DB or metadata.");
                    if (user.email) {
                        setUserName(user.email.split('@')[0]); // Fallback to email prefix
                    }
                }

                if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                    console.error("Error fetching patient profile:", error);
                }

                // --- FETCH DASHBOARD DATA (APPOINTMENTS & INTERACTIONS) ---
                // Helper to fetch appointments
                const { data: appointments, error: appError } = await supabase
                    .from('appointments')
                    .select(`
                        id, 
                        doctor_id,
                        date, 
                        time, 
                        type, 
                        doctor:doctors(first_name, surname, specialty, hospital_name, hospital_location),
                        meeting_link
                    `)
                    .eq('patient_id', user.id)
                    .eq('status', 'upcoming')
                    .order('date', { ascending: true });

                // --- FETCH REPORTS (Completed Apps) ---
                const { data: historyApps, error: histError } = await supabase
                    .from('appointments')
                    .select(`
                        id, 
                        doctor_id,
                        date, 
                        time, 
                        type, 
                        notes,
                        doctor:doctors(first_name, surname, specialty, hospital_name),
                        meeting_link
                    `)
                    .eq('patient_id', user.id)
                    .eq('status', 'completed')
                    .order('date', { ascending: false });

                if (historyApps) {
                    const dbReports: HealthReport[] = historyApps.map((app: any) => {
                        let title = 'Consultation Report';
                        let type: 'Prescription' | 'Medical Report' | 'Lab Report' = 'Medical Report';
                        let parsedNotes = null;

                        if (app.notes) {
                            try {
                                const n = typeof app.notes === 'string' ? JSON.parse(app.notes) : app.notes;
                                parsedNotes = n;
                                if (n.medicines && n.medicines.length > 0) type = 'Prescription';
                                title = `Rx: Dr. ${app.doctor?.first_name || 'Doctor'} - ${n.diagnosis?.substring(0, 20) || 'General'}`;
                            } catch (e) {
                                console.log("Error parsing notes", e);
                            }
                        }

                        return {
                            id: app.id,
                            title: title,
                            type: type,
                            date: new Date(app.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                            doctorOrLab: app.doctor ? `Dr. ${app.doctor.first_name} ${app.doctor.surname}` : 'MediConnect Doctor',
                            fileType: 'View',
                            fileSize: 'N/A',
                            rawNotes: parsedNotes || app.notes
                        };
                    });
                    setAllReports([...HEALTH_REPORTS, ...dbReports]);
                }

                const localApts: Appointment[] = JSON.parse(localStorage.getItem('mediconnect_local_appointments') || '[]');
                const mappedApps: Appointment[] = (appointments || []).map((app: any) => ({
                    id: app.id,
                    doctorId: app.doctor_id,
                    doctorName: `Dr. ${app.doctor?.first_name || ''} ${app.doctor?.surname || ''}`.trim() || 'Specialist Doctor',
                    specialty: app.doctor?.specialty || 'General',
                    date: app.date,
                    time: app.time ? app.time.substring(0, 5) : '10:00',
                    type: app.type as 'video' | 'clinic',
                    doctorImage: `https://ui-avatars.com/api/?name=${app.doctor?.first_name || 'Dr'}+${app.doctor?.surname || 'Doctor'}&background=random`,
                    status: 'Upcoming' as 'Upcoming',
                    hospital: app.doctor?.hospital_name,
                    location: app.doctor?.hospital_location
                }));

                const remoteIds = new Set(mappedApps.map(a => a.id));
                const mergedApts = [...mappedApps, ...localApts.filter(a => !remoteIds.has(a.id))];
                setMyAppointments(mergedApts);

                // Helper to fetch interactions
                const { data: interactions, error: intError } = await supabase
                    .from('interactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (interactions) {
                    const mappedInts = interactions.map((int: any) => ({
                        id: int.id,
                        doctorName: int.title || 'MediConnect AI',
                        doctorImage: int.icon === 'calendar'
                            ? 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'
                            : `https://ui-avatars.com/api/?name=AI&background=random`,
                        date: new Date(int.created_at).toLocaleDateString([], { day: 'numeric', month: 'short' }),
                        type: (int.type === 'Chat' || int.type === 'Video Call') ? int.type : 'Chat' as 'Chat',
                        summary: int.description || 'System interaction recorded'
                    }));
                    setRecentInteractions(mappedInts);
                }
                if (intError) console.error("Error fetching interactions:", intError);

            } else {
                console.log("No active session found.");
            }
        };

        // 2. Fetch Doctors
        const fetchDoctors = async () => {
            const { data, error } = await supabase.from('doctors').select('*').eq('approval_status', 'approved');
            const dbDoctors: Doctor[] = (data || []).map((doc: any) => ({
                id: doc.id,
                name: `Dr. ${doc.first_name} ${doc.surname}`,
                specialty: doc.specialty,
                hospital: doc.hospital_name,
                rating: 4.8,
                reviews: 120,
                experience: `${doc.years_of_experience} Years`,
                image: `https://ui-avatars.com/api/?name=${doc.first_name}+${doc.surname}&background=random`,
                nextAvailable: 'Today, 4:00 PM',
                price: 800,
                location: doc.hospital_location,
                distance: '2.5 km',
                travelTime: '15 mins'
            }));

            // Ensure gynecologists are always available (merge fallback, prevent duplicates)
            const hasGynecologist = dbDoctors.some(d => d.specialty?.toLowerCase().includes('gynecolog'));
            const merged: Doctor[] = hasGynecologist
                ? dbDoctors
                : [...GYNECOLOGIST_DOCTORS, ...dbDoctors.filter(d => !GYNECOLOGIST_DOCTORS.some(g => g.id === d.id))];

            setDoctorsList(merged);
            setFilteredDoctors(merged);
        };

        fetchUserData();
        fetchDoctors();
        fetchLabTests();
        fetchMedicines();
    }, []);

    const mapMedicineData = (m: any, searchQuery?: string): PharmacyMedicine => {
        const query = searchQuery?.toLowerCase() || '';
        const isGenericMatch = m.generic_name?.toLowerCase().includes(query) ||
            m.brand_name?.toLowerCase().includes(query);

        // Show only the first generic name/substitute to avoid cluttering the UI
        const firstGeneric = m.generic_name?.split(',')[0] || m.brand_name;

        // Enhance description if it's too short or contains only brief information
        let enhancedDescription = m.description || m.side_effects || 'Professional healthcare product approved for clinical use.';
        if (enhancedDescription.length < 30 && m.therapeutic_class) {
            enhancedDescription = `Clinically used for ${m.therapeutic_class.toLowerCase()} management. Often prescribed for: ${enhancedDescription}`;
        }

        return {
            id: m.id,
            name: m.brand_name,
            genericName: firstGeneric,
            type: m.dosage_form,
            price: m.price,
            originalPrice: Math.floor(m.price * 1.2),
            discount: 20,
            image: m.image || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
            category: m.therapeutic_class || 'General',
            manufacturer: m.manufacturer || 'MediConnect Partner',
            dosage: m.strength || 'Standard Dose',
            packSize: m.dosage_form === 'Syrup' ? '100ml' : m.dosage_form === 'Injection' ? '1 Vial' : '10 Units',
            description: enhancedDescription,
            mechanismOfAction: m.therapeutic_class ? `This medicine works as a ${m.therapeutic_class.toLowerCase()}, primarily targeting the ${m.action_class ? m.action_class.toLowerCase() : 'underlying condition'} to provide relief.` : 'Mechanism of action verified by clinical standards.',
            isGeneric: isGenericMatch && !!searchQuery
        };
    };

    const fetchMedicines = async () => {
        setLoadingMedicines(true);
        const { data, error } = await supabase
            .from('medicines')
            .select('*')
            .limit(20);

        if (data) {
            setMedicinesList(data.map((m: any) => mapMedicineData(m)));
        }
        setLoadingMedicines(false);
    };

    const handleSearchMedicines = async (query: string) => {
        if (!query) {
            fetchMedicines();
            setAiSuggestedAlternatives([]);
            return;
        }
        setLoadingMedicines(true);
        setIsSearchingAI(true);

        // 1. Call standard Supabase search
        const { data, error } = await supabase
            .from('medicines')
            .select('*')
            .textSearch('search_vector', query, {
                type: 'websearch',
                config: 'english'
            })
            .limit(20);

        // 2. Call AI Generic Finder
        try {
            const aiResponse = await pharmacyService.findGenericAlternatives(query);
            if (aiResponse && aiResponse.alternatives && aiResponse.alternatives.length > 0) {
                setAiSuggestedAlternatives(aiResponse.alternatives);
            } else {
                setAiSuggestedAlternatives([]);
            }
        } catch (err) {
            console.error("AI Search Failed:", err);
            setAiSuggestedAlternatives([]);
        }

        if (data) {
            setMedicinesList(data.map((m: any) => mapMedicineData(m, query)));
        }
        setIsSearchingAI(false);
        setLoadingMedicines(false);
    };

    const fetchLabTests = async () => {
        setLoadingLabs(true);
        try {
            const { data, error } = await supabase
                .from('lab_tests')
                .select('*');

            const dbTests: LabTest[] = (data || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                type: t.type,
                test_count: t.test_count,
                price: t.price,
                original_price: t.original_price,
                discount: t.discount,
                tat: t.tat,
                category: t.category,
                image: t.image,
                description: t.description,
                tests_included: Array.isArray(t.tests_included) ? t.tests_included : [],
                preparation: Array.isArray(t.preparation) ? t.preparation : [],
                location: t.location,
                contact_number: t.contact_number,
                lab_address: t.lab_address,
                tags: Array.isArray(t.tags) ? t.tags : []
            }));

            // Always merge Women's Health fallback packages (prevent duplicates by ID)
            const mergedTests = [...DEFAULT_WOMENS_HEALTH_LAB_TESTS];
            for (const dbTest of dbTests) {
                if (!mergedTests.some(t => t.id === dbTest.id)) {
                    mergedTests.push(dbTest);
                }
            }
            setLabTests(mergedTests);
            if (error) console.warn('[LabTests] Supabase fetch warning:', error.message);
        } catch (err: any) {
            console.error('[LabTests] Error fetching lab tests:', err);
            // Fallback: use only in-code Women's Health packages
            setLabTests([...DEFAULT_WOMENS_HEALTH_LAB_TESTS]);
        }
        setLoadingLabs(false);
    };

    // Filter Logic
    // Filter Logic
    useEffect(() => {
        let result = doctorsList;

        // 1. Filter by Specialty
        if (selectedSpecialty !== 'All') {
            result = result.filter(d => matchesSpecialty(d.specialty, selectedSpecialty));
        }

        // 2. Filter by Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(doc =>
                doc.name.toLowerCase().includes(query) ||
                doc.specialty.toLowerCase().includes(query) ||
                matchesSpecialty(doc.specialty, query) ||
                (doc.hospital && doc.hospital.toLowerCase().includes(query)) ||
                (doc.location && doc.location.toLowerCase().includes(query))
            );
        }

        setFilteredDoctors(result);
    }, [selectedSpecialty, searchQuery, doctorsList]);

    // Data States
    const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
    const [recentInteractions, setRecentInteractions] = useState<Interaction[]>([]);




    const [paymentHistory, setPaymentHistory] = useState<PaymentReceipt[]>([
        { transactionId: 'TXN_123456', date: 'Jan 28, 2024', doctorName: 'Dr. James Wilson', amount: 2500, status: 'Success', description: 'Video Consultation' }
    ]);

    // Medicine Orders State
    const [medicineOrders, setMedicineOrders] = useState<any[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Fetch Medicine Orders
    const fetchMedicineOrders = async () => {
        if (!userId) return;
        setLoadingOrders(true);
        try {
            const { data, error } = await supabase
                .from('medicine_orders')
                .select('*')
                .eq('patient_id', userId)
                .order('created_at', { ascending: false });

            const localOrders = JSON.parse(localStorage.getItem('mediconnect_local_medicine_orders') || '[]');
            const remoteOrders = (!error && data) ? data : [];

            // Merge remote and local orders without duplicate IDs
            const remoteIds = new Set(remoteOrders.map(o => o.id));
            const merged = [...remoteOrders, ...localOrders.filter((o: any) => !remoteIds.has(o.id))];

            setMedicineOrders(merged);
        } catch (err) {
            console.error('Failed to fetch medicine orders:', err);
            const localOrders = JSON.parse(localStorage.getItem('mediconnect_local_medicine_orders') || '[]');
            setMedicineOrders(localOrders);
        } finally {
            setLoadingOrders(false);
        }
    };

    // Fetch orders when tab changes to 'orders' or when userId is available
    useEffect(() => {
        if (activeTab === 'orders' && userId) {
            fetchMedicineOrders();
        }
    }, [activeTab, userId]);

    // Booking Modal State
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [bookingDate, setBookingDate] = useState<string>('Today');
    const [bookingTime, setBookingTime] = useState<string>('');
    const [bookingType, setBookingType] = useState<'video' | 'clinic'>('video');
    const [bookingStep, setBookingStep] = useState<'details' | 'payment' | 'success'>('details');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [bookingNotes, setBookingNotes] = useState<string>('');

    // Doctor Filter State (Moved up)

    // Lab Tests State
    const [labTests, setLabTests] = useState<LabTest[]>([]);
    const [loadingLabs, setLoadingLabs] = useState(false);
    const [selectedLabCategory, setSelectedLabCategory] = useState('All');
    const [cart, setCart] = useState<LabTest[]>([]); // Changed to store Objects for Receipt
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [labBookingStep, setLabBookingStep] = useState<'cart' | 'payment' | 'success'>('cart');
    const [isProcessingLabPayment, setIsProcessingLabPayment] = useState(false);
    const [viewLabTest, setViewLabTest] = useState<LabTest | null>(null);
    const [showLabReceipt, setShowLabReceipt] = useState(false);
    const [lastTransactionId, setLastTransactionId] = useState<string>('');



    // Pharmacy State
    const [pharmacyCart, setPharmacyCart] = useState<string[]>([]);
    const [pharmacyBookingStep, setPharmacyBookingStep] = useState<'cart' | 'shipping' | 'payment' | 'success'>('cart');
    const [isProcessingPharmaPayment, setIsProcessingPharmaPayment] = useState(false);
    const [viewMedicine, setViewMedicine] = useState<PharmacyMedicine | null>(null);
    const [aiSuggestedAlternatives, setAiSuggestedAlternatives] = useState<string[]>([]);
    const [isSearchingAI, setIsSearchingAI] = useState(false);
    const [shippingAddress, setShippingAddress] = useState({
        fullName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });

    // Reports State
    const [reportFilter, setReportFilter] = useState('All');


    // VIDEO CALL STATE
    const [isCallOpen, setIsCallOpen] = useState(false);
    const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);

    // --- SCROLL LOCK LOGIC ---
    useEffect(() => {
        const anyModalOpen = !!viewLabTest || !!viewingReport || !!selectedDoctor || isCartOpen || !!showLabReceipt || !!isCallOpen || !!viewMedicine;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    }, [viewLabTest, viewingReport, selectedDoctor, isCartOpen, showLabReceipt, isCallOpen, viewMedicine]);

    const handleJoinCall = async (appointment: Appointment) => {
        try {
            const backendUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5001';
            const response = await fetch(`${backendUrl}/api/video/generate-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointmentId: appointment.id,
                    userId: userId,
                    role: 'patient'
                })
            });

            const data = await response.json();

            if (data.success) {
                // Determine if we can join (Check handled by backend effectively, but extra safety here)
                // Since this is Patient, if backend returned success=true, it means link exists (or created if we allowed it, which we blocked now)
                setActiveCallRoom(data.roomId);
                setIsCallOpen(true);
            } else {
                alert(data.message || "Failed to join call. Doctor may not have started yet.");
            }
        } catch (error) {
            console.error("Error joining call:", error);
            alert("Connection error. Please try again.");
        }
    };

    const handleCloseCall = useCallback(() => {
        setIsCallOpen(false);
        setActiveCallRoom(null);
    }, []);



    const sidebarItems = [
        { id: 'overview', icon: LayoutGrid, label: t('dashboard.overview') },
        { id: 'book-doctor', icon: Stethoscope, label: t('dashboard.bookDoctor') },
        { id: 'lab-tests', icon: FlaskConical, label: t('dashboard.labTests'), badge: 'Offer' },
        { id: 'pharmacy', icon: ShoppingBag, label: t('dashboard.pharmacy') },
        { id: 'orders', icon: Package, label: t('dashboard.myOrders') },
        { id: 'payments', icon: CreditCard, label: t('dashboard.payments') },
        { id: 'reports', icon: FileText, label: t('dashboard.healthReports') },
    ];

    const specialties = [
        { label: 'Cardiology', icon: Heart, doctors: 12 },
        { label: 'Dentistry', icon: Smile, doctors: 8 },
        { label: 'Orthopedics', icon: Bone, doctors: 5 },
        { label: 'Neurology', icon: BrainCircuit, doctors: 7 },
        { label: 'Ophthalmology', icon: Eye, doctors: 4 },
        { label: 'General', icon: Stethoscope, doctors: 15 },
    ];

    // --- FILTERED DOCTORS ---
    // (Logic moved to useEffect)

    // --- FILTERED LAB TESTS ---
    const isWomensHealthSelected = selectedLabCategory === "Women's Health" ||
        selectedLabCategory === t('dashboard.labCategories.womenHealth');
    const filteredLabTests = labTests.filter(test => {
        const matchesCategory = selectedLabCategory === 'All' ||
            selectedLabCategory === t('dashboard.labCategories.all') ||
            test.category === selectedLabCategory ||
            (isWomensHealthSelected && (test.category === "Women's Health" || test.category === "Womens Health"));
        const matchesSearch = !searchQuery || test.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
    const gynecologistsForPanel = GYNECOLOGIST_DOCTORS;

    // --- FILTERED MEDICINES ---
    const filteredMedicines = medicinesList;

    // Use a separate effect for medicine search to debounce or trigger Supabase search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'pharmacy') {
                handleSearchMedicines(searchQuery);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    // --- FILTERED REPORTS ---
    const filteredReports = allReports.filter(report => {
        const matchesFilter = reportFilter === 'All' || report.type === reportFilter;
        const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.doctorOrLab.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // --- CART LOGIC ---
    const toggleCartItem = (test: LabTest) => {
        setCart(prev => {
            const exists = prev.find(item => item.id === test.id);
            if (exists) {
                return prev.filter(item => item.id !== test.id);
            } else {
                return [...prev, test];
            }
        });
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => total + item.price, 0);
    };

    const togglePharmacyCartItem = (id: string) => {
        setPharmacyCart(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const getPharmacyCartTotal = () => {
        return pharmacyCart.reduce((total, id) => {
            const med = medicinesList.find(m => m.id === id);
            return total + (med?.price || 0);
        }, 0);
    };

    const handleOpenCart = () => {
        if (activeTab === 'pharmacy') {
            setPharmacyBookingStep('cart');
        } else {
            setLabBookingStep('cart');
        }
        setIsCartOpen(true);
    };

    const handleLabCheckout = () => {
        setLabBookingStep('payment');
    };

    const handlePharmacyCheckout = () => {
        setPharmacyBookingStep('shipping');
    };

    const handlePharmacyShipping = () => {
        setPharmacyBookingStep('payment');
    }

    const handleConfirmLabPayment = async () => {
        const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
        if (!currentUserId) {
            alert("Please login to book.");
            return;
        }
        setIsProcessingLabPayment(true);

        try {
            const txnId = `LAB_${Math.floor(Math.random() * 1000000)}`;
            const totalAmount = getCartTotal();
            const todayStr = new Date().toISOString().split('T')[0];

            // 1. Create booking entries
            const bookings = cart.map(test => ({
                id: `LB_${Date.now()}_${test.id}`,
                patient_id: currentUserId,
                test_id: test.id,
                test_title: test.title,
                booking_date: todayStr,
                amount: test.price,
                payment_status: 'paid',
                status: 'confirmed'
            }));

            // Attempt Supabase insert safely (graceful if table does not exist)
            try {
                const { error: bookingError } = await supabase.from('lab_bookings').insert(
                    bookings.map(({ test_title, id, ...b }) => b)
                );
                if (bookingError) {
                    console.warn("Supabase lab_bookings table note:", bookingError.message);
                }
            } catch (err) {
                console.warn("Supabase lab_bookings skipped:", err);
            }

            try {
                const { error: receiptError } = await supabase.from('lab_receipts').insert({
                    patient_id: currentUserId,
                    transaction_id: txnId,
                    items: cart.map(item => ({ id: item.id, title: item.title, price: item.price })),
                    total_amount: totalAmount
                });
                if (receiptError) {
                    console.warn("Supabase lab_receipts table note:", receiptError.message);
                }
            } catch (err) {
                console.warn("Supabase lab_receipts skipped:", err);
            }

            // Persist lab bookings locally so they remain accessible
            const existingLabBookings = JSON.parse(localStorage.getItem('mediconnect_lab_bookings') || '[]');
            localStorage.setItem('mediconnect_lab_bookings', JSON.stringify([...bookings, ...existingLabBookings]));

            // 2. Update UI
            setLabBookingStep('success');
            setLastTransactionId(txnId);

            // 3. Generate Receipt for History (Local UI state)
            const newReceipt: PaymentReceipt = {
                transactionId: txnId,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                doctorName: 'MediConnect Labs',
                amount: totalAmount,
                status: 'Success',
                description: `Lab Order: ${cart.length} Tests`
            };
            setPaymentHistory(prev => [newReceipt, ...prev]);

        } catch (err) {
            console.error("Error booking lab tests:", err);
            alert("Payment failed. Please try again.");
        } finally {
            setIsProcessingLabPayment(false);
        }
    };

    const handleShowLabReceipt = () => {
        setShowLabReceipt(true);
    };

    const handleConfirmPharmacyPayment = async () => {
        const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;
        if (!currentUserId) {
            alert("Please login to place orders.");
            return;
        }
        setIsProcessingPharmaPayment(true);

        try {
            const totalAmount = getPharmacyCartTotal() + (getPharmacyCartTotal() > 500 ? 0 : 50);

            // 1. Get full medicine details for the order
            const orderItems = pharmacyCart.map(id => {
                const med = MEDICINES.find(m => m.id === id);
                return {
                    id: med?.id,
                    medicine_id: med?.id,
                    name: med?.name,
                    medicine_name: med?.name,
                    price: med?.price,
                    image: med?.image,
                    quantity: 1
                };
            });

            const newOrder = {
                patient_id: currentUserId,
                items: orderItems,
                total_amount: totalAmount,
                shipping_address: shippingAddress,
                status: 'Placed'
            };

            // 2. Insert into Supabase matching the actual database schema
            const { data: insertedOrder, error } = await supabase
                .from('medicine_orders')
                .insert(newOrder)
                .select()
                .maybeSingle();

            if (error) {
                console.warn("Supabase medicine_orders insert notice, saving order locally:", error.message);
                const localOrder = {
                    ...newOrder,
                    id: `ORD_${Date.now()}`,
                    created_at: new Date().toISOString()
                };
                const localOrders = JSON.parse(localStorage.getItem('mediconnect_local_medicine_orders') || '[]');
                localOrders.unshift(localOrder);
                localStorage.setItem('mediconnect_local_medicine_orders', JSON.stringify(localOrders));
                setMedicineOrders(prev => [localOrder, ...prev]);
            } else if (insertedOrder) {
                setMedicineOrders(prev => [insertedOrder, ...prev]);
            }

            // 3. Update UI
            setPharmacyBookingStep('success');

            const newReceipt: PaymentReceipt = {
                transactionId: `PHR_${Math.floor(Math.random() * 1000000)}`,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                doctorName: 'MediConnect Pharmacy',
                amount: totalAmount,
                status: 'Success',
                description: `Pharmacy Order: ${pharmacyCart.length} Items`
            };
            setPaymentHistory(prev => [newReceipt, ...prev]);

        } catch (err) {
            console.error("Error placing pharmacy order:", err);
            alert("Payment failed. Please try again.");
        } finally {
            setIsProcessingPharmaPayment(false);
        }
    };

    const handleLabOrderComplete = () => {
        setCart([]);
        setIsCartOpen(false);
        setLabBookingStep('cart');
        setActiveTab('payments');
    };

    const handlePharmacyOrderComplete = () => {
        setPharmacyCart([]);
        setIsCartOpen(false);
        setPharmacyBookingStep('cart');
        setActiveTab('payments');
    }

    const handleViewLabTest = (test: LabTest) => {
        setViewLabTest(test);
    };

    const handleViewMedicine = (med: PharmacyMedicine) => {
        setViewMedicine(med);
    }

    const closeLabTestModal = () => {
        setViewLabTest(null);
    };

    const closeMedicineModal = () => {
        setViewMedicine(null);
    }

    const [isDownloadingReport, setIsDownloadingReport] = useState(false);
    const reportPrintRef = useRef<HTMLDivElement>(null);

    const getReportDetails = (report: HealthReport) => {
        if (report.rawNotes) {
            return {
                type: report.type || 'Prescription',
                notes: report.rawNotes
            };
        }
        const titleLower = (report.title || '').toLowerCase();
        if (titleLower.includes('blood count') || titleLower.includes('cbc')) {
            return {
                type: 'Lab Report',
                department: 'Hematology Department',
                testRows: [
                    { test: 'Hemoglobin (Hb)', result: '14.2', unit: 'g/dL', normal: '13.0 - 17.0', status: 'Normal' },
                    { test: 'Total RBC Count', result: '4.85', unit: 'mil/µL', normal: '4.50 - 5.50', status: 'Normal' },
                    { test: 'Total Leukocyte Count (WBC)', result: '6,800', unit: '/µL', normal: '4,000 - 11,000', status: 'Normal' },
                    { test: 'Platelet Count', result: '245,000', unit: '/µL', normal: '150,000 - 450,000', status: 'Normal' },
                    { test: 'Packed Cell Volume (PCV)', result: '42.8', unit: '%', normal: '40.0 - 50.0', status: 'Normal' },
                    { test: 'Mean Corpuscular Volume (MCV)', result: '88.2', unit: 'fL', normal: '80.0 - 96.0', status: 'Normal' },
                    { test: 'ESR (Westergren Method)', result: '9', unit: 'mm/hr', normal: '0 - 15', status: 'Normal' }
                ],
                interpretation: 'All peripheral blood counts and hematological indices are within biologically normal reference intervals.'
            };
        }
        if (titleLower.includes('lipid')) {
            return {
                type: 'Lab Report',
                department: 'Clinical Biochemistry',
                testRows: [
                    { test: 'Total Cholesterol', result: '182', unit: 'mg/dL', normal: '< 200', status: 'Normal' },
                    { test: 'HDL Cholesterol (High-Density)', result: '54', unit: 'mg/dL', normal: '> 40', status: 'Optimal' },
                    { test: 'LDL Cholesterol (Low-Density)', result: '96', unit: 'mg/dL', normal: '< 100', status: 'Optimal' },
                    { test: 'Serum Triglycerides', result: '138', unit: 'mg/dL', normal: '< 150', status: 'Normal' },
                    { test: 'VLDL Cholesterol', result: '27.6', unit: 'mg/dL', normal: '10 - 30', status: 'Normal' },
                    { test: 'Cholesterol / HDL Ratio', result: '3.37', unit: 'Ratio', normal: '< 4.5', status: 'Desirable' }
                ],
                interpretation: 'Desirable lipid parameters with healthy cardiovascular risk marker ratios.'
            };
        }
        if (titleLower.includes('thyroid') || titleLower.includes('tft')) {
            return {
                type: 'Lab Report',
                department: 'Endocrinology & Immunology',
                testRows: [
                    { test: 'Total Triiodothyronine (T3)', result: '1.24', unit: 'ng/mL', normal: '0.80 - 2.00', status: 'Normal' },
                    { test: 'Total Thyroxine (T4)', result: '8.1', unit: 'µg/dL', normal: '5.1 - 14.1', status: 'Normal' },
                    { test: 'Thyroid Stimulating Hormone (TSH)', result: '2.35', unit: 'µIU/mL', normal: '0.40 - 4.50', status: 'Normal' }
                ],
                interpretation: 'Euthyroid profile. Normal pituitary-thyroid feedback axis function.'
            };
        }
        if (titleLower.includes('x-ray') || titleLower.includes('xray')) {
            return {
                type: 'Medical Report',
                department: 'Diagnostic Radiology',
                modality: 'Digital Radiography (PA View)',
                findings: 'Bilateral lung fields appear clear without active consolidation, focal lesions, or pleural effusions. Cardiothoracic ratio is normal (< 0.50). Mediastinal contours, aortic knob, and diaphragmatic domes appear within normal anatomical limits. Visualized bony ribcage is intact.',
                impression: 'Normal study. No acute cardiopulmonary abnormality detected.'
            };
        }
        if (titleLower.includes('mri')) {
            return {
                type: 'Medical Report',
                department: 'Advanced Neuro & Musculoskeletal Imaging',
                modality: '3.0T High Resolution MRI',
                findings: 'Medial and lateral menisci show normal morphology and homogeneous low signal on all sequences without surface-extending tear. Anterior and posterior cruciate ligaments are intact. Collateral ligaments and extensor mechanism preserved. Joint space and articular cartilage unremarkable.',
                impression: 'Unremarkable MRI examination. No evidence of ligament tear or chondral defect.'
            };
        }
        return {
            type: report.type || 'Medical Report',
            department: 'General Outpatient Clinic',
            findings: 'Clinical consultation and review conducted. Patient vitals, examination parameters, and treatment progress recorded and filed in MediConnect Electronic Health Record system.',
            impression: 'Condition stable and satisfactory. Continue routine care plan.'
        };
    };

    const generateReportHTML = (report: HealthReport, patientName: string): string => {
        const details = getReportDetails(report);
        const dateStr = report.date || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        const doctorOrLab = report.doctorOrLab || 'MediConnect Healthcare Center';

        let contentHTML = '';

        if (report.rawNotes) {
            const notes = report.rawNotes;
            contentHTML = `
                ${notes.diagnosis ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">Diagnosis</h4>
                        <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 14px 18px; border-radius: 12px; color: #b91c1c; font-weight: 600; font-size: 16px;">
                            ${notes.diagnosis}
                        </div>
                    </div>
                ` : ''}

                ${notes.symptoms ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">Reported Symptoms</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${Array.isArray(notes.symptoms) ? notes.symptoms.map((s: string) => `
                                <span style="background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500; color: #334155;">${s}</span>
                            `).join('') : `<p style="color: #334155; margin: 0;">${notes.symptoms}</p>`}
                        </div>
                    </div>
                ` : ''}

                ${notes.medicines && notes.medicines.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 12px;">Prescribed Medication</h4>
                        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;">
                                    <th style="padding: 10px 14px;">Medicine</th>
                                    <th style="padding: 10px 14px;">Dosage</th>
                                    <th style="padding: 10px 14px;">Duration</th>
                                    <th style="padding: 10px 14px;">Instructions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${notes.medicines.map((m: any) => `
                                    <tr style="border-bottom: 1px solid #f1f5f9;">
                                        <td style="padding: 12px 14px; font-weight: 600; color: #0f172a;">${m.name}</td>
                                        <td style="padding: 12px 14px; color: #334155;">${m.dosage}</td>
                                        <td style="padding: 12px 14px; color: #334155;">${m.duration}</td>
                                        <td style="padding: 12px 14px; color: #64748b;">${m.instructions}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${notes.notes ? `
                    <div>
                        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">Doctor's Clinical Notes</h4>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 12px; color: #334155; font-style: italic; font-size: 14px;">
                            ${notes.notes}
                        </div>
                    </div>
                ` : ''}
            `;
        } else if (details.testRows) {
            contentHTML = `
                <div style="margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569;">
                                <th style="padding: 12px 14px;">Test Parameter</th>
                                <th style="padding: 12px 14px;">Observed Value</th>
                                <th style="padding: 12px 14px;">Reference Range</th>
                                <th style="padding: 12px 14px;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details.testRows.map((r: any) => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 14px; font-weight: 600; color: #0f172a;">${r.test}</td>
                                    <td style="padding: 12px 14px; font-weight: bold; color: #0284c7;">${r.result} <span style="font-size: 11px; font-weight: normal; color: #64748b;">${r.unit}</span></td>
                                    <td style="padding: 12px 14px; color: #64748b;">${r.normal} ${r.unit}</td>
                                    <td style="padding: 12px 14px;"><span style="background: #ecfdf5; color: #059669; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 12px;">${r.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                ${details.interpretation ? `
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 12px; margin-top: 20px;">
                        <h5 style="margin: 0 0 6px 0; color: #166534; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Interpretation</h5>
                        <p style="margin: 0; color: #15803d; font-size: 14px;">${details.interpretation}</p>
                    </div>
                ` : ''}
            `;
        } else {
            contentHTML = `
                ${details.modality ? `
                    <div style="margin-bottom: 20px;">
                        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 6px;">Modality</h4>
                        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${details.modality}</p>
                    </div>
                ` : ''}

                ${details.findings ? `
                    <div style="margin-bottom: 24px;">
                        <h4 style="font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 8px;">Detailed Findings</h4>
                        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
                            ${details.findings}
                        </p>
                    </div>
                ` : ''}

                ${details.impression ? `
                    <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 16px; border-radius: 12px;">
                        <h4 style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #0369a1; letter-spacing: 1px;">Impression</h4>
                        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0284c7;">${details.impression}</p>
                    </div>
                ` : ''}
            `;
        }

        return `
            <div style="background: #ffffff; color: #0f172a; padding: 32px; border-radius: 16px; max-width: 760px; margin: 0 auto; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="background: #0284c7; color: #ffffff; padding: 4px 10px; border-radius: 8px; font-weight: bold; font-size: 16px;">+</span>
                            <h2 style="margin: 0; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">MediConnect</h2>
                        </div>
                        <p style="margin: 0; font-size: 13px; color: #64748b;">Digital Healthcare & Clinical Records Network</p>
                        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Document Ref: MC-${report.id.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="background: #f1f5f9; color: #0369a1; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 16px; text-transform: uppercase;">
                            ${report.type || 'Official Record'}
                        </span>
                        <p style="margin: 8px 0 0 0; font-size: 14px; font-weight: bold; color: #0f172a;">${dateStr}</p>
                        <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;">${doctorOrLab}</p>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 28px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 13px;">
                    <div>
                        <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Patient Name:</span>
                        <strong style="display: block; color: #0f172a; font-size: 15px;">${patientName || 'Registered Patient'}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Document:</span>
                        <strong style="display: block; color: #0f172a; font-size: 15px;">${report.title}</strong>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Status:</span>
                        <strong style="display: block; color: #16a34a; font-size: 15px;">Verified Electronic Record</strong>
                    </div>
                </div>

                ${contentHTML}

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #64748b;">
                    <div>
                        <p style="margin: 0; font-weight: 600; color: #0f172a;">MediConnect Diagnostics & Telehealth</p>
                        <p style="margin: 2px 0 0 0;">This electronic record is digitally authenticated and legally valid.</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-family: 'Courier New', monospace; font-size: 11px; color: #0284c7; font-weight: bold; letter-spacing: 1px; margin-bottom: 4px;">DIGITALLY AUTHENTICATED</div>
                        <span style="color: #475569; font-weight: 500;">${doctorOrLab}</span>
                    </div>
                </div>
            </div>
        `;
    };

    const handleDownloadReport = async (report: HealthReport) => {
        setIsDownloadingReport(true);
        try {
            let elementToCapture = reportPrintRef.current;
            let tempContainer: HTMLElement | null = null;

            if (!elementToCapture || viewingReport?.id !== report.id) {
                tempContainer = document.createElement('div');
                tempContainer.style.position = 'fixed';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '0';
                tempContainer.style.width = '780px';
                tempContainer.style.background = '#ffffff';
                tempContainer.style.padding = '24px';
                tempContainer.innerHTML = generateReportHTML(report, userName);
                document.body.appendChild(tempContainer);
                elementToCapture = tempContainer;
            }

            const canvas = await html2canvas(elementToCapture, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
            });

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const sanitizedTitle = (report.title || 'Medical_Report').replace(/[^a-zA-Z0-9]/g, '_');
            link.download = `MediConnect_${sanitizedTitle}.png`;
            link.href = image;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (tempContainer) {
                document.body.removeChild(tempContainer);
            }
        } catch (error) {
            console.error("Error generating report download:", error);
            // Fallback: download as printable HTML file
            const html = generateReportHTML(report, userName);
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MediConnect_${(report.title || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}.html`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setIsDownloadingReport(false);
        }
    };

    const handlePrintReport = (report: HealthReport) => {
        const printWindow = window.open('', '_blank', 'width=850,height=900');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${report.title} - MediConnect</title>
                    <style>
                        body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    ${generateReportHTML(report, userName)}
                    <script>
                        window.onload = function() {
                            window.focus();
                            window.print();
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    const handleViewReport = (report: HealthReport) => {
        setViewingReport(report);
    };

    const closeReportModal = () => {
        setViewingReport(null);
    };

    // --- CHAT LOGIC ---

    const handleSymptomClick = (symptom: typeof SYMPTOMS_LIST[0]) => {
        setViewAllSymptomsOpen(false);
        setIsChatOpen(true);
    };

    // --- BOOKING LOGIC ---
    const openBookingModal = (doctor: Doctor, notes?: string) => {
        setSelectedDoctor(doctor);
        setBookingDate('Today');
        setBookingTime('');
        setBookingType('video');
        setBookingStep('details');
        setBookingNotes(notes || '');
    };

    const handleProceedToPayment = () => {
        setBookingStep('payment');
    };

    const handleConfirmPayment = async () => {
        if (!selectedDoctor || isProcessingPayment) return;
        setIsProcessingPayment(true);

        try {
            const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'patient-user-default';

            // Resolve formatted date (YYYY-MM-DD)
            let formattedDate = new Date().toISOString().split('T')[0];
            if (bookingDate === 'Tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                formattedDate = tomorrow.toISOString().split('T')[0];
            } else if (bookingDate && bookingDate !== 'Today') {
                const parsed = new Date(bookingDate);
                if (!isNaN(parsed.getTime())) {
                    formattedDate = parsed.toISOString().split('T')[0];
                }
            }

            // Resolve formatted time (HH:MM:00)
            let formattedTime = '10:00:00';
            if (bookingTime) {
                const match = bookingTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
                if (match) {
                    let hours = parseInt(match[1], 10);
                    const minutes = match[2];
                    const modifier = match[3] ? match[3].toUpperCase() : null;
                    if (modifier === 'PM' && hours < 12) hours += 12;
                    if (modifier === 'AM' && hours === 12) hours = 0;
                    formattedTime = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
                } else if (bookingTime.includes(':')) {
                    formattedTime = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
                }
            }

            const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
            let bookedAppointmentId = `apt_${Date.now()}`;

            // 1. Attempt remote insert if both IDs are valid UUIDs
            if (isUUID(currentUserId) && isUUID(selectedDoctor.id)) {
                try {
                    const { data: newApt, error } = await supabase
                        .from('appointments')
                        .insert({
                            patient_id: currentUserId,
                            doctor_id: selectedDoctor.id,
                            date: formattedDate,
                            time: formattedTime,
                            type: bookingType,
                            status: 'upcoming',
                            notes: bookingNotes || 'Consultation'
                        })
                        .select()
                        .maybeSingle();

                    if (error) {
                        console.warn("Supabase appointment insert notice, continuing with local persistence:", error.message);
                    } else if (newApt?.id) {
                        bookedAppointmentId = newApt.id;
                    }
                } catch (insertErr) {
                    console.warn("Supabase appointment network/policy notice:", insertErr);
                }
            } else {
                console.info("Using local appointment persistence for specialty/curated doctor:", selectedDoctor.name);
            }

            // 2. Map appointment object
            const mappedApt: Appointment = {
                id: bookedAppointmentId,
                doctorId: selectedDoctor.id,
                doctorName: selectedDoctor.name,
                doctorImage: selectedDoctor.image,
                specialty: selectedDoctor.specialty,
                hospital: selectedDoctor.hospital,
                date: formattedDate,
                time: bookingTime || formattedTime.substring(0, 5),
                type: bookingType as 'video' | 'clinic',
                status: 'Upcoming',
                travelTime: bookingType === 'clinic' ? selectedDoctor.travelTime : undefined
            };

            // 3. Save to localStorage
            const existingLocal = JSON.parse(localStorage.getItem('mediconnect_local_appointments') || '[]');
            const updatedLocal = [mappedApt, ...existingLocal.filter((a: any) => a.id !== mappedApt.id)];
            localStorage.setItem('mediconnect_local_appointments', JSON.stringify(updatedLocal));

            // 4. Update appointment state
            setMyAppointments(prev => [mappedApt, ...prev.filter(a => a.id !== mappedApt.id)]);

            // 5. Generate Payment Receipt
            const newReceipt: PaymentReceipt = {
                transactionId: `TXN_${Math.floor(100000 + Math.random() * 900000)}`,
                date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                doctorName: selectedDoctor.name,
                amount: selectedDoctor.price + 50,
                status: 'Success',
                description: bookingType === 'video' ? 'Video Consultation' : 'In-Clinic Consultation'
            };
            setPaymentHistory(prev => [newReceipt, ...prev]);

            // Save receipt to localStorage
            const existingReceipts = JSON.parse(localStorage.getItem('mediconnect_local_receipts') || '[]');
            localStorage.setItem('mediconnect_local_receipts', JSON.stringify([newReceipt, ...existingReceipts]));

            // 6. Record interaction
            const newInteraction: Interaction = {
                id: `int_${Date.now()}`,
                doctorName: selectedDoctor.name,
                doctorImage: selectedDoctor.image,
                date: 'Just now',
                type: bookingType === 'video' ? 'Video Call' : 'Chat',
                summary: `Appointment confirmed for ${formattedDate} at ${bookingTime || formattedTime.substring(0, 5)}`
            };
            setRecentInteractions(prev => [newInteraction, ...prev]);

            // 7. Success state
            setBookingStep('success');
        } catch (error) {
            console.error("Error booking appointment:", error);
            setBookingStep('success');
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const closeBookingModal = () => {
        setSelectedDoctor(null);
        setBookingStep('details');
        setActiveTab('overview');
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex overflow-hidden">

            {/* DESKTOP SIDEBAR (Fixed 260px) */}
            <aside className="hidden lg:flex flex-col w-[260px] h-screen fixed left-0 top-0 bg-white/80 backdrop-blur-xl border-r border-slate-100 z-40">
                <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
                            <Activity size={20} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                                MediConnect
                            </span>
                            <span className="text-xs font-medium text-brand-600 tracking-wider uppercase">Medical</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 group ${activeTab === item.id
                                ? 'bg-brand-50 text-brand-600 shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-brand-600'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon size={20} className={activeTab === item.id ? 'stroke-[2.5px]' : 'stroke-2 group-hover:stroke-[2.5px]'} />
                                {item.label}
                            </div>
                            {item.badge && (
                                <span className="bg-brand-100 text-brand-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="bg-gradient-to-br from-brand-50 to-white p-3 rounded-2xl border border-brand-100 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
                            <p className="text-xs text-brand-500 truncate">Patient</p>
                        </div>
                        <button onClick={onLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-600 text-white rounded-lg flex items-center justify-center">
                        <Activity size={18} />
                    </div>
                    <span className="font-bold text-slate-900">MediConnect</span>
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* MOBILE MENU */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-white pt-20 px-6 animate-fade-in">
                    <nav className="space-y-4">
                        {sidebarItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id);
                                    setMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium ${activeTab === item.id ? 'bg-brand-50 text-brand-600' : 'text-slate-500'
                                    }`}
                            >
                                <item.icon size={24} />
                                {item.label}
                            </button>
                        ))}
                        <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-lg font-medium text-red-500 mt-8 bg-red-50">
                            <LogOut size={24} /> Logout
                        </button>
                    </nav>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 lg:pl-[260px] w-full relative">
                <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-8 pt-20 lg:pt-8 max-w-7xl mx-auto">

                    {/* HEADER SECTION (Greeting & Search) */}
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-2">
                        <div className="animate-fade-in-down">
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                                {activeTab === 'overview' ? `Good Morning, ${userName}` :
                                    activeTab === 'book-doctor' ? 'Book a Doctor' :
                                        activeTab === 'lab-tests' ? 'Lab Tests & Packages' :
                                            activeTab === 'pharmacy' ? 'Pharmacy' :
                                                activeTab === 'reports' ? 'Health Reports' :
                                                    activeTab === 'payments' ? 'Payments & Receipts' : 'Dashboard'}
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">
                                {activeTab === 'overview' ? 'Here is your daily health intelligence summary.' :
                                    activeTab === 'lab-tests' ? 'Book health checkups from top certified labs.' :
                                        activeTab === 'pharmacy' ? 'Order medicines and healthcare products.' :
                                            activeTab === 'reports' ? 'Access your medical records and prescriptions securely.' : 'Manage your health journey.'}
                            </p>
                        </div>

                        <div className="flex items-center gap-4 animate-fade-in-down" style={{ animationDelay: '0.1s' }}>
                            <div className="relative hidden md:block group">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={activeTab === 'pharmacy' ? "Search medicines, syrup..." : activeTab === 'reports' ? "Search records, doctors..." : "Search doctors..."}
                                    className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium focus:outline-none focus:ring-4 focus:ring-brand-100 focus:border-brand-500 transition-all w-64 shadow-sm"
                                />
                                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                                    <Mic size={12} />
                                </button>
                            </div>
                            <button className="relative w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-all shadow-sm">
                                <Bell size={18} />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            </button>
                            {/* Cart Icon (Lab Tests & Pharmacy) */}
                            {(activeTab === 'lab-tests' || activeTab === 'pharmacy') && (
                                <button
                                    onClick={handleOpenCart}
                                    className="relative w-10 h-10 bg-brand-600 text-white rounded-full flex items-center justify-center hover:bg-brand-700 transition-all shadow-md"
                                >
                                    <ShoppingCart size={18} />
                                    {(activeTab === 'pharmacy' ? pharmacyCart.length : cart.length) > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                            {activeTab === 'pharmacy' ? pharmacyCart.length : cart.length}
                                        </span>
                                    )}
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="space-y-8 pb-20">

                        {/* --- VIEW: OVERVIEW --- */}
                        {activeTab === 'overview' && (
                            <>
                                {/* 1. SYMPTOM QUICK CONNECT */}
                                <section className="animate-fade-in-up">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-slate-900">Feeling unwell?</h3>
                                        <span
                                            onClick={() => setViewAllSymptomsOpen(true)}
                                            className="text-xs font-bold text-brand-600 cursor-pointer hover:underline"
                                        >
                                            View all symptoms
                                        </span>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                        {SYMPTOMS_LIST.slice(0, 5).map((symptom, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSymptomClick(symptom)}
                                                className="flex-shrink-0 flex items-center gap-3 bg-white p-3 pr-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-brand-200 transition-all group"
                                            >
                                                <div className={`w-10 h-10 rounded-xl ${symptom.bg} ${symptom.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                    <symptom.icon size={20} />
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">{t(`dashboard.symptoms.${symptom.id}`)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {/* 2. UPCOMING SCHEDULE (DYNAMIC) */}
                                <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">Upcoming Schedule</h3>
                                    {myAppointments.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {myAppointments.map((apt) => (
                                                <div key={apt.id} className={`relative overflow-hidden rounded-[2rem] shadow-xl p-6 flex flex-col justify-between min-h-[220px] transition-all hover:scale-[1.01] ${apt.type === 'video' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-900'}`}>
                                                    {apt.type === 'video' && <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>}

                                                    <div className="relative z-10">
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${apt.type === 'video' ? 'bg-white/20 backdrop-blur-md border-white/20' : 'bg-brand-50 text-brand-700 border-brand-100'}`}>
                                                                {apt.type === 'video' ? <Video size={12} /> : <MapPin size={12} />}
                                                                {apt.type === 'video' ? t('dashboard.appointmentTypes.video') : t('dashboard.appointmentTypes.clinic')}
                                                            </div>
                                                            <div className={`w-10 h-10 rounded-full border-2 overflow-hidden ${apt.type === 'video' ? 'border-white/30 bg-white/10' : 'border-slate-100'}`}>
                                                                <img src={apt.doctorImage} alt="Doctor" className="w-full h-full object-cover" />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-2xl font-bold mb-1">{apt.doctorName}</h3>
                                                        <p className={`text-sm ${apt.type === 'video' ? 'text-indigo-100' : 'text-slate-500'}`}>{t(`dashboard.specialties.${apt.specialty.toLowerCase()}`) || apt.specialty} • {apt.hospital}</p>
                                                    </div>

                                                    <div className={`relative z-10 mt-6 rounded-xl p-3 flex items-center justify-between ${apt.type === 'video' ? 'bg-black/10 backdrop-blur-sm' : 'bg-slate-50 border border-slate-100'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${apt.type === 'video' ? 'bg-white/20 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                                                <Clock size={20} />
                                                            </div>
                                                            <div>
                                                                <p className={`text-xs font-medium ${apt.type === 'video' ? 'text-indigo-200' : 'text-slate-400'}`}>{apt.date}</p>
                                                                <p className={`font-bold ${apt.type === 'video' ? 'text-white' : 'text-slate-900'}`}>{apt.time}</p>
                                                            </div>
                                                        </div>
                                                        {apt.type === 'video' ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleJoinCall(apt);
                                                                }}
                                                                className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50 transition-colors z-20 relative"
                                                            >
                                                                {t('dashboard.joinCall')}
                                                            </button>
                                                        ) : (
                                                            <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-1">
                                                                <Navigation size={12} /> {t('common.action') || 'Directions'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center">
                                            <p className="text-slate-500">{t('dashboard.noAppointments')}</p>
                                            <button onClick={() => setActiveTab('book-doctor')} className="mt-4 text-brand-600 font-bold hover:underline">{t('dashboard.bookDoctor')}</button>
                                        </div>
                                    )}
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* 3. RECENT INTERACTIONS (NEW) */}
                                    <section className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-900">{t('dashboard.recentInteractions')}</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {recentInteractions.map((interaction) => (
                                                <div key={interaction.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:border-brand-200 transition-colors group">
                                                    <img src={interaction.doctorImage} alt={interaction.doctorName} className="w-12 h-12 rounded-xl object-cover" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between">
                                                            <h4 className="font-bold text-slate-900 text-sm">{interaction.doctorName}</h4>
                                                            <span className="text-xs text-slate-400">{interaction.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${interaction.type === 'Chat' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                                {interaction.type === 'Chat' ? t('dashboard.interactionTypes.chat') : t('dashboard.interactionTypes.videoCall')}
                                                            </span>
                                                            <p className="text-xs text-slate-500 truncate">{interaction.summary}</p>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                                                        <MessageCircle size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* 4. SPECIALIST CATEGORIES */}
                                    <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-slate-900">{t('specialists.bookConsultation')}</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {specialties.map((spec, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setActiveTab('book-doctor');
                                                        setSelectedSpecialty(spec.label === 'General' ? 'General Physician' : spec.label);
                                                    }}
                                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-brand-200 hover:shadow-md transition-all cursor-pointer group text-center"
                                                >
                                                    <div className="w-10 h-10 mx-auto bg-slate-50 text-slate-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                                        <spec.icon size={20} />
                                                    </div>
                                                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-700">{t(`dashboard.specialties.${spec.label.toLowerCase()}`)}</h4>
                                                    <p className="text-[10px] text-slate-400 mt-1">{spec.doctors} Doctors</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </>
                        )}

                        {/* --- VIEW: HEALTH REPORTS (NEW) --- */}
                        {activeTab === 'reports' && (
                            <div className="animate-fade-in">
                                {/* Filters */}
                                <div className="mb-8 overflow-x-auto pb-2 custom-scrollbar">
                                    <div className="flex gap-3">
                                        {REPORT_FILTERS.map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => setReportFilter(filter)}
                                                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${reportFilter === filter
                                                    ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/30'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                                                    }`}
                                            >
                                                {t(`dashboard.reportTypes.${filter === 'All' ? 'all' : (filter === 'Lab Report' ? 'labReport' : (filter === 'Prescription' ? 'prescription' : 'medicalReport'))}`) || filter}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reports Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredReports.map((report) => (
                                        <div key={report.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all group cursor-pointer relative overflow-hidden flex flex-col justify-between">
                                            {/* Decor Strip REMOVED */}

                                            <div>
                                                <div className="flex justify-between items-start mb-4 pl-1">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${report.type === 'Lab Report' ? 'bg-blue-50 text-blue-600' :
                                                        report.type === 'Prescription' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'
                                                        }`}>
                                                        {report.type === 'Lab Report' && <FlaskConical size={24} />}
                                                        {report.type === 'Prescription' && <Pill size={24} />}
                                                        {report.type === 'Medical Report' && <FileText size={24} />}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        {report.fileType === 'PDF' ? <FileText size={12} className="text-red-500" /> : <ImageIcon size={12} className="text-blue-500" />}
                                                        <span className="text-[10px] font-bold text-slate-500">{report.fileType}</span>
                                                    </div>
                                                </div>

                                                <div className="pl-1 mb-4">
                                                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 group-hover:text-brand-600 transition-colors">{report.title}</h3>
                                                    <p className="text-sm text-slate-500">{report.doctorOrLab}</p>
                                                </div>
                                            </div>

                                            <div className="pl-1 mt-2 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{report.date}</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleViewReport(report)}
                                                        className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-600 hover:text-white transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownloadReport(report);
                                                        }}
                                                        className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-900 hover:text-white transition-colors"
                                                        title="Download Report"
                                                    >
                                                        <Download size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Empty State */}
                                {filteredReports.length === 0 && (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <File size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">{t('common.noResults')}</h3>
                                        <p className="text-slate-500">{t('doctor.searchHint')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- VIEW: PHARMACY (RE-DESIGNED) --- */}
                        {activeTab === 'pharmacy' && (
                            <div className="animate-fade-in space-y-8">

                                {/* AI SEARCH SUGGESTIONS PANEL */}
                                {aiSuggestedAlternatives.length > 0 && (
                                    <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-brand-500/20 relative overflow-hidden animate-fade-in-up">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Sparkles size={20} className="text-brand-200" />
                                                <h3 className="font-bold text-lg">AI Generic Suggestions</h3>
                                            </div>
                                            <p className="text-brand-100 text-sm mb-6 max-w-lg">
                                                We found more cost-effective generic alternatives for your search. These contain the same active ingredients but at significant savings.
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {aiSuggestedAlternatives.map((alt, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSearchQuery(alt)}
                                                        className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-sm font-bold hover:bg-white/30 transition-all flex items-center gap-2"
                                                    >
                                                        <Search size={14} /> {alt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pharmacy Header & Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Verified Quality</h4>
                                        <p className="text-xs text-slate-500 mt-1">All medicines are checked for authenticity.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mb-4">
                                            <Sparkles size={20} />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Generic First</h4>
                                        <p className="text-xs text-slate-500 mt-1">Save up to 80% with molecular substitutes.</p>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                                            <Truck size={20} />
                                        </div>
                                        <h4 className="font-bold text-slate-900">Fast Delivery</h4>
                                        <p className="text-xs text-slate-500 mt-1">Free delivery on orders above ₹500.</p>
                                    </div>
                                </div>

                                {/* Medicines Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredMedicines.map((med: PharmacyMedicine) => (
                                        <div
                                            key={med.id}
                                            onClick={() => handleViewMedicine(med)}
                                            className="bg-white rounded-[2rem] border border-slate-200 flex flex-col justify-between hover:shadow-2xl hover:shadow-brand-900/10 transition-all group relative overflow-hidden cursor-pointer"
                                        >
                                            {/* Badge for Generic */}
                                            {med.isGeneric && (
                                                <div className="absolute top-4 left-4 z-20">
                                                    <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                                                        <ShieldCheck size={10} /> GENERIC
                                                    </span>
                                                </div>
                                            )}

                                            {/* Image Banner */}
                                            <div className="h-48 overflow-hidden relative bg-slate-50 flex items-center justify-center">
                                                <img
                                                    src={med.image}
                                                    alt={med.name}
                                                    className="h-36 object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>

                                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[10px] font-bold">
                                                    <span className="px-2 py-1 rounded-md border border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
                                                        {med.type}
                                                    </span>
                                                    {med.discount > 0 && (
                                                        <span className="text-white bg-green-500 px-2 py-1 rounded-full shadow-md">
                                                            SAVE {med.discount}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-6 flex flex-col flex-1">
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-brand-600 transition-colors line-clamp-2 uppercase">
                                                        {med.name}
                                                    </h3>
                                                    {med.genericName && (
                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                            <div className="px-1.5 py-0.5 bg-brand-50 rounded text-brand-600 font-bold text-[9px] border border-brand-100 uppercase">Molecule</div>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{med.genericName.split(',')[0]}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-400 mb-4 font-medium">{med.packSize} • {med.manufacturer}</p>

                                                {/* Mechanism of Action (Shortened for Card) */}
                                                <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-500 italic line-clamp-2">
                                                        {med.mechanismOfAction || "Mechanism of action verified by clinical standards."}
                                                    </p>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-slate-100">
                                                    <div className="flex items-end justify-between mb-4">
                                                        <div className="flex items-end gap-2">
                                                            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{med.price}</span>
                                                            <span className="text-sm text-slate-300 line-through mb-1">₹{med.originalPrice}</span>
                                                        </div>
                                                        <div className="text-[9px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                                            Best Price
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePharmacyCartItem(med.id);
                                                        }}
                                                        className={`w-full py-3.5 font-black text-sm rounded-2xl border transition-all flex items-center justify-center gap-2 ${pharmacyCart.includes(med.id)
                                                            ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                                            : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-xl shadow-brand-500/20 active:scale-95'
                                                            }`}
                                                    >
                                                        {pharmacyCart.includes(med.id) ? (
                                                            <><Trash2 size={16} /> Remove From Cart</>
                                                        ) : (
                                                            <><ShoppingCart size={16} /> Add To Cart</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Empty State */}
                                {filteredMedicines.length === 0 && !loadingMedicines && (
                                    <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                            <ShoppingBag size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">{t('pharmacy.noProducts')}</h3>
                                        <p className="text-slate-500 mt-2 max-w-xs mx-auto">{t('pharmacy.searchHint')}</p>
                                    </div>
                                )}

                                {loadingMedicines && (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 size={40} className="text-brand-600 animate-spin mb-4" />
                                        <p className="text-slate-500 font-bold animate-pulse">Consulting AI for alternatives...</p>
                                    </div>
                                )}

                                {/* CART FLOATING BAR */}
                                {pharmacyCart.length > 0 && (
                                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 lg:left-[calc(50%+130px)] z-[60] w-full max-w-lg px-6 animate-fade-in-up">
                                        <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between border border-white/10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center text-white font-bold">
                                                    {pharmacyCart.length}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estimated Total</p>
                                                    <p className="text-2xl font-black">₹{getPharmacyCartTotal()}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleOpenCart}
                                                className="bg-white text-slate-900 px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-brand-50 transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                                            >
                                                Checkout <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- VIEW: LAB TESTS (RESTORED & NEW UI) --- */}
                        {activeTab === 'lab-tests' && (
                            <div className="animate-fade-in">
                                {/* Categories Filter */}
                                <div className="mb-8 overflow-x-auto pb-2 custom-scrollbar">
                                    <div className="flex gap-3">
                                        {LAB_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedLabCategory(cat)}
                                                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${selectedLabCategory === cat
                                                    ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/30'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tests Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredLabTests.map((test) => (
                                        <div
                                            key={test.id}
                                            onClick={() => handleViewLabTest(test)}
                                            className="bg-white rounded-3xl border border-slate-200 flex flex-col justify-between hover:shadow-xl hover:shadow-brand-900/5 transition-all group relative overflow-hidden cursor-pointer"
                                        >
                                            {/* Image Banner */}
                                            <div className="h-40 overflow-hidden relative">
                                                <img src={test.image} alt={test.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border text-white backdrop-blur-md ${test.type === 'Package' ? 'bg-purple-500/80 border-purple-400' : 'bg-blue-500/80 border-blue-400'}`}>
                                                        {test.type}
                                                    </span>
                                                    {test.tat && (
                                                        <span className="text-[10px] font-bold text-white/90 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                                                            <Clock size={10} /> {test.tat}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-5 flex flex-col flex-1">
                                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 group-hover:text-brand-600 transition-colors">{test.title}</h3>
                                                <p className="text-xs text-slate-500 mb-3">{test.test_count} Tests Included</p>

                                                {test.tags && test.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {test.tags.map((tag, i) => (
                                                            <span key={i} className="text-[10px] font-bold bg-green-50 text-green-700 px-2 py-1 rounded-md border border-green-100">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="mt-auto pt-4 border-t border-slate-50">
                                                    <div className="flex items-end gap-2 mb-4">
                                                        <span className="text-2xl font-bold text-slate-900">₹{test.price}</span>
                                                        <span className="text-sm text-slate-400 line-through mb-1">₹{test.original_price}</span>
                                                        <span className="text-sm font-bold text-green-600 mb-1">{test.discount}% off</span>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent opening modal
                                                            toggleCartItem(test);
                                                        }}
                                                        className={`w-full py-3 font-bold rounded-xl border transition-colors flex items-center justify-center gap-2 ${cart.some(item => item.id === test.id)
                                                            ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'
                                                            : 'bg-brand-600 text-white border-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20'
                                                            }`}
                                                    >
                                                        {cart.some(item => item.id === test.id) ? (
                                                            <><Trash2 size={16} /> Remove</>
                                                        ) : (
                                                            <>Add To Cart</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Empty State */}
                                {filteredLabTests.length === 0 && (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <FlaskConical size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">No tests found</h3>
                                        <p className="text-slate-500">Try changing the category or search term.</p>
                                    </div>
                                )}

                                {/* ── GYNECOLOGIST CONSULTATION SECTION (Women's Health) ── */}
                                {isWomensHealthSelected && (
                                    <div className="mt-12 animate-fade-in">
                                        {/* Section Header */}
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30 flex-shrink-0">
                                                <Stethoscope size={22} className="text-white" />
                                            </div>
                                            <div>
                                                <h2 className="text-2xl font-black text-slate-900">Consult a Gynaecologist</h2>
                                                <p className="text-slate-500 text-sm">Board-certified specialists for PCOS, prenatal care, hormonal health &amp; more</p>
                                            </div>
                                        </div>

                                        {/* Hero Banner */}
                                        <div className="relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-700 p-8 text-white shadow-2xl">
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                                            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                                <div className="max-w-lg">
                                                    <span className="text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 rounded-full uppercase tracking-wider">Women's Wellness</span>
                                                    <h3 className="text-3xl font-black mt-3 leading-tight">Expert Women's Health Care, At Your Convenience</h3>
                                                    <p className="mt-2 text-white/80 text-sm">Video &amp; in-clinic consultations with top-rated female gynecologists. PCOS, fertility, menopause, prenatal care &amp; more.</p>
                                                    <div className="flex flex-wrap gap-3 mt-4">
                                                        {['PCOS & Hormones', 'Prenatal Care', 'Menopause', 'Fertility'].map(tag => (
                                                            <span key={tag} className="text-xs font-bold bg-white/20 border border-white/30 px-3 py-1 rounded-full">{tag}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <div className="text-center">
                                                        <p className="text-4xl font-black">4.9★</p>
                                                        <p className="text-white/70 text-xs mt-1">Avg. Rating</p>
                                                    </div>
                                                    <div className="w-px h-16 bg-white/20" />
                                                    <div className="text-center">
                                                        <p className="text-4xl font-black">500+</p>
                                                        <p className="text-white/70 text-xs mt-1">Consultations</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Doctors Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5">
                                            {gynecologistsForPanel.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-rose-900/10 transition-all group cursor-pointer"
                                                    onClick={() => setSelectedDoctor(doc)}
                                                >
                                                    {/* Doctor Image */}
                                                    <div className="relative h-48 overflow-hidden">
                                                        <img
                                                            src={doc.image}
                                                            alt={doc.name}
                                                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                                        <div className="absolute bottom-3 left-3">
                                                            <span className="inline-flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full">
                                                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                                Available {doc.nextAvailable.split(',')[0]}
                                                            </span>
                                                        </div>
                                                        <div className="absolute top-3 right-3">
                                                            <span className="bg-white/90 backdrop-blur-sm text-rose-600 text-xs font-black px-2.5 py-1 rounded-full shadow">
                                                                ★ {doc.rating}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Doctor Info */}
                                                    <div className="p-5">
                                                        <h3 className="font-black text-slate-900 text-base leading-tight group-hover:text-rose-600 transition-colors">{doc.name}</h3>
                                                        <p className="text-rose-500 text-xs font-bold mt-0.5">{doc.specialty}</p>
                                                        <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                                                            <MapPin size={10} className="flex-shrink-0" />
                                                            {doc.hospital}
                                                        </p>

                                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50">
                                                            <div className="text-center flex-1">
                                                                <p className="text-xs text-slate-400">Experience</p>
                                                                <p className="text-sm font-bold text-slate-800">{doc.experience}</p>
                                                            </div>
                                                            <div className="w-px h-8 bg-slate-100" />
                                                            <div className="text-center flex-1">
                                                                <p className="text-xs text-slate-400">Reviews</p>
                                                                <p className="text-sm font-bold text-slate-800">{doc.reviews}</p>
                                                            </div>
                                                            <div className="w-px h-8 bg-slate-100" />
                                                            <div className="text-center flex-1">
                                                                <p className="text-xs text-slate-400">Fee</p>
                                                                <p className="text-sm font-bold text-rose-600">₹{doc.price}</p>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedDoctor(doc); }}
                                                            className="mt-4 w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl hover:from-rose-600 hover:to-pink-700 transition-all shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 text-sm active:scale-95"
                                                        >
                                                            <Calendar size={15} /> Book Consultation
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* CART FLOATING BAR */}
                                {cart.length > 0 && (
                                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:left-[calc(50%+130px)] z-[60] w-full max-w-md px-4 animate-fade-in-up">
                                        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase font-bold">{cart.length} Items Selected</p>
                                                <p className="text-xl font-bold">₹{getCartTotal()}</p>
                                            </div>
                                            <button
                                                onClick={handleOpenCart}
                                                className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold hover:bg-brand-50 transition-colors flex items-center gap-2 cursor-pointer"
                                            >
                                                View Cart <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- VIEW: PAYMENTS & RECEIPTS (NEW) --- */}
                        {activeTab === 'payments' && (
                            <div className="animate-fade-in space-y-6">
                                {/* ... (Payments content unchanged) ... */}
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div>
                                            <p className="text-slate-400 text-sm mb-1">Total Spent (This Year)</p>
                                            <h2 className="text-4xl font-bold">₹{paymentHistory.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</h2>
                                        </div>
                                        <button className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors flex items-center gap-2">
                                            <CreditCard size={18} /> Manage Cards
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900">Transaction History</h3>
                                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 tracking-wider">
                                                    <th className="p-6 font-semibold">Transaction ID</th>
                                                    <th className="p-6 font-semibold">Date</th>
                                                    <th className="p-6 font-semibold">Doctor / Service</th>
                                                    <th className="p-6 font-semibold">Amount</th>
                                                    <th className="p-6 font-semibold">Status</th>
                                                    <th className="p-6 font-semibold text-right">Receipt</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                                {paymentHistory.map((receipt) => (
                                                    <tr key={receipt.transactionId} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-6 font-mono text-slate-500">{receipt.transactionId}</td>
                                                        <td className="p-6 font-medium text-slate-900">{receipt.date}</td>
                                                        <td className="p-6">
                                                            <p className="font-bold text-slate-900">{receipt.doctorName}</p>
                                                            <p className="text-xs text-slate-500">{receipt.description}</p>
                                                        </td>
                                                        <td className="p-6 font-bold text-slate-900">₹{receipt.amount}</td>
                                                        <td className="p-6">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                                                                <Check size={10} /> {receipt.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                                                <Receipt size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- VIEW: BOOK DOCTOR --- */}
                        {activeTab === 'book-doctor' && (
                            <div className="animate-fade-in">

                                {/* Filters & Search */}
                                <div className="mb-8">
                                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                                        <div className="relative flex-1">
                                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search doctor, condition, or specialty..."
                                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50 transition-all shadow-sm"
                                            />
                                        </div>
                                        <button className="px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:border-brand-500 hover:text-brand-600 transition-all flex items-center gap-2 shadow-sm">
                                            <Filter size={20} /> Filters
                                        </button>
                                    </div>

                                    {/* Filter Pills */}
                                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                        {SPECIALTY_FILTERS.map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => setSelectedSpecialty(filter)}
                                                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${selectedSpecialty === filter
                                                    ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/30'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600'
                                                    }`}
                                            >
                                                {filter}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Doctors Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredDoctors.map((doctor) => (
                                        <div key={doctor.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-brand-900/5 transition-all group">
                                            <div className="flex items-start gap-4">
                                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                                                    <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent"></div>
                                                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 text-[10px] font-bold text-white bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                                                        <Star size={8} className="fill-amber-400 text-amber-400" /> {doctor.rating}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-slate-900 text-lg leading-tight truncate pr-2">{doctor.name}</h3>
                                                        <button className="text-slate-300 hover:text-red-500 transition-colors">
                                                            <Heart size={18} />
                                                        </button>
                                                    </div>
                                                    <p className="text-brand-600 text-xs font-bold uppercase tracking-wide mt-1">{doctor.specialty}</p>
                                                    <p className="text-slate-500 text-sm mt-0.5 truncate">{doctor.hospital} • {doctor.experience} Exp</p>
                                                </div>
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Next Available</p>
                                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                                                        <Clock size={14} className="text-brand-500" /> {doctor.nextAvailable}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Consultation</p>
                                                    <p className="text-sm font-bold text-slate-900">₹{doctor.price}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => openBookingModal(doctor)}
                                                className="w-full mt-4 py-3 bg-brand-50 text-brand-600 font-bold rounded-xl border border-brand-100 hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all active:scale-95"
                                            >
                                                Book Appointment
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {filteredDoctors.length === 0 && (
                                    <div className="text-center py-20">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                            <Search size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">No doctors found</h3>
                                        <p className="text-slate-500">Try adjusting your filters or search query.</p>
                                        <button
                                            onClick={() => { setSelectedSpecialty('All'); setSearchQuery(''); }}
                                            className="mt-4 text-brand-600 font-bold hover:underline"
                                        >
                                            Clear all filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- VIEW: MY ORDERS (NEW) --- */}
                        {activeTab === 'orders' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Medicine Orders</h2>
                                        <p className="text-slate-500 font-medium">Track your pharmacy orders and delivery status</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('pharmacy')}
                                        className="px-6 py-3 bg-brand-600 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <ShoppingBag size={18} /> Order Medicines
                                    </button>
                                </div>

                                {loadingOrders ? (
                                    <div className="bg-white p-12 rounded-[2.5rem] text-center border border-slate-100 shadow-sm">
                                        <div className="animate-spin w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full mx-auto"></div>
                                        <p className="text-slate-500 mt-4">Loading orders...</p>
                                    </div>
                                ) : medicineOrders.length === 0 ? (
                                    <div className="bg-white p-12 rounded-[2.5rem] text-center border border-slate-100 shadow-sm">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200">
                                            <Package size={40} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">No orders found</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mb-8">You haven't placed any medicine orders yet. Your order history will appear here.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-6">
                                        {medicineOrders.map((order) => (
                                            <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-brand-900/5 transition-all p-6 md:p-8">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                                    <div className="flex items-center gap-6">
                                                        <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                            <Package size={28} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Order ID: {order.id.slice(0, 8)}</span>
                                                                <span className="text-slate-200">•</span>
                                                                <span className="text-xs font-bold text-slate-500">{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                            </div>
                                                            <h3 className="text-xl font-bold text-slate-900">{order.full_name || order.shipping_address?.fullName || 'Valued Patient'}</h3>
                                                            <p className="text-sm font-medium text-slate-500">{order.items?.length || 0} items • {order.city || order.shipping_address?.city || 'Local Delivery'}{order.state || order.shipping_address?.state ? `, ${order.state || order.shipping_address?.state}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 pt-4 md:pt-0">
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                                                            <p className="text-2xl font-black text-slate-900">₹{order.total_amount}</p>
                                                        </div>
                                                        <div className={`px-4 py-2 rounded-full text-xs font-black uppercase ${order.status === 'Delivered' ? 'bg-green-50 text-green-600 border border-green-100' :
                                                            order.status === 'Shipped' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                order.status === 'Processing' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                                    'bg-amber-50 text-amber-600 border border-amber-100'
                                                            }`}>
                                                            {order.status}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Shipping Address */}
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Shipping Address</p>
                                                    <p className="text-sm font-medium text-slate-700">{order.address || order.shipping_address?.address || 'Standard Delivery'}</p>
                                                    <p className="text-sm text-slate-600">{order.city || order.shipping_address?.city || ''}{order.state || order.shipping_address?.state ? `, ${order.state || order.shipping_address?.state}` : ''} {order.pincode || order.shipping_address?.pincode ? `- ${order.pincode || order.shipping_address?.pincode}` : ''}</p>
                                                    <p className="text-sm text-slate-600 mt-1">Phone: {order.phone || order.shipping_address?.phone || 'N/A'}</p>
                                                </div>

                                                {/* Order Items */}
                                                {order.items && order.items.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Order Items</p>
                                                        <div className="space-y-2">
                                                            {order.items.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl">
                                                                    {item.image && (
                                                                        <img src={item.image} alt={item.name || 'Medicine'} className="w-12 h-12 rounded-lg object-contain bg-slate-50" />
                                                                    )}
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-bold text-slate-900">{item.name || 'Medicine'}</p>
                                                                        <p className="text-xs text-slate-500">Qty: {item.quantity || 1}</p>
                                                                    </div>
                                                                    <p className="text-sm font-bold text-slate-900">₹{item.price}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </main>

            {/* VIEW DIGITAL HEALTH RECORD MODAL */}
            {
                viewingReport && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-bold">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{viewingReport.title}</h2>
                                        <p className="text-xs text-slate-500">{viewingReport.doctorOrLab} • {viewingReport.date}</p>
                                    </div>
                                </div>
                                <button onClick={closeReportModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content / Printable Report Sheet */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 bg-slate-50">
                                <div ref={reportPrintRef} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                                    {/* Document Header */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 border-b border-slate-100 pb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <div className="w-9 h-9 bg-brand-600 text-white rounded-lg flex items-center justify-center">
                                                    <Activity size={18} />
                                                </div>
                                                <span className="font-extrabold text-xl text-slate-900 tracking-tight">MediConnect</span>
                                            </div>
                                            <p className="text-xs text-slate-500">Digital Health Record Network</p>
                                            <p className="text-xs text-slate-400 mt-1 font-mono">Ref ID: MC-{viewingReport.id.toUpperCase()}</p>
                                        </div>
                                        <div className="sm:text-right">
                                            <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                                {viewingReport.type}
                                            </span>
                                            <p className="font-bold text-slate-900 mt-2 text-sm">{viewingReport.date}</p>
                                            <p className="text-xs text-slate-500">{viewingReport.doctorOrLab}</p>
                                        </div>
                                    </div>

                                    {/* Patient & Document Summary Bar */}
                                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                        <div>
                                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Patient Name</span>
                                            <strong className="text-slate-900 text-sm">{userName || 'Registered Patient'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Document Title</span>
                                            <strong className="text-slate-900 text-sm">{viewingReport.title}</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Verification</span>
                                            <span className="text-emerald-700 font-bold text-sm flex items-center gap-1">
                                                <ShieldCheck size={14} /> Verified Document
                                            </span>
                                        </div>
                                    </div>

                                    {/* Report Body */}
                                    {viewingReport.rawNotes ? (
                                        <div className="space-y-6">
                                            {(() => {
                                                const notes = viewingReport.rawNotes;
                                                return (
                                                    <>
                                                        {notes.symptoms && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Reported Symptoms</h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {Array.isArray(notes.symptoms) ? notes.symptoms.map((s: string, i: number) => (
                                                                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{s}</span>
                                                                    )) : <p className="text-slate-900 text-sm">{JSON.stringify(notes.symptoms)}</p>}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {notes.diagnosis && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Clinical Diagnosis</h4>
                                                                <p className="text-red-700 font-bold text-base bg-red-50 p-4 rounded-xl border border-red-100">{notes.diagnosis}</p>
                                                            </div>
                                                        )}

                                                        {notes.medicines && notes.medicines.length > 0 && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Prescribed Medication</h4>
                                                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                                    <table className="w-full text-left text-xs sm:text-sm">
                                                                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                                            <tr>
                                                                                <th className="p-3">Medicine</th>
                                                                                <th className="p-3">Dosage</th>
                                                                                <th className="p-3">Duration</th>
                                                                                <th className="p-3">Instructions</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {notes.medicines.map((med: any, i: number) => (
                                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                                    <td className="p-3 font-bold text-slate-900">{med.name}</td>
                                                                                    <td className="p-3 text-slate-700">{med.dosage}</td>
                                                                                    <td className="p-3 text-slate-700">{med.duration}</td>
                                                                                    <td className="p-3 text-slate-500">{med.instructions}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {notes.notes && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Clinical Advice & Notes</h4>
                                                                <p className="text-slate-700 bg-slate-50 p-4 rounded-xl italic text-sm border border-slate-100">{notes.notes}</p>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {(() => {
                                                const details = getReportDetails(viewingReport);
                                                return (
                                                    <>
                                                        {details.testRows && (
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{details.department || 'Test Parameters'}</h4>
                                                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                                    <table className="w-full text-left text-xs sm:text-sm">
                                                                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                                                            <tr>
                                                                                <th className="p-3">Investigation</th>
                                                                                <th className="p-3">Observed Value</th>
                                                                                <th className="p-3">Reference Range</th>
                                                                                <th className="p-3">Status</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {details.testRows.map((r: any, idx: number) => (
                                                                                <tr key={idx} className="hover:bg-slate-50/50">
                                                                                    <td className="p-3 font-semibold text-slate-900">{r.test}</td>
                                                                                    <td className="p-3 font-bold text-brand-600">{r.result} <span className="text-xs font-normal text-slate-400">{r.unit}</span></td>
                                                                                    <td className="p-3 text-slate-500">{r.normal} {r.unit}</td>
                                                                                    <td className="p-3">
                                                                                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold">
                                                                                            {r.status}
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                                {details.interpretation && (
                                                                    <div className="mt-4 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                                                                        <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Pathologist Summary</h5>
                                                                        <p className="text-xs sm:text-sm text-emerald-900">{details.interpretation}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {details.findings && (
                                                            <div className="space-y-4">
                                                                {details.modality && (
                                                                    <div>
                                                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Modality</h4>
                                                                        <p className="text-sm font-semibold text-slate-900">{details.modality}</p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Detailed Findings</h4>
                                                                    <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed">
                                                                        {details.findings}
                                                                    </p>
                                                                </div>
                                                                {details.impression && (
                                                                    <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
                                                                        <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Physician / Radiologist Impression</h4>
                                                                        <p className="text-xs sm:text-sm font-semibold text-blue-900">{details.impression}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Document Footer */}
                                    <div className="mt-8 pt-6 border-t border-dashed border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 text-xs text-slate-400">
                                        <div>
                                            <p className="font-semibold text-slate-700">MediConnect Diagnostics & Telehealth</p>
                                            <p className="text-[11px] mt-0.5">Digitally verified electronic record. Legally binding.</p>
                                        </div>
                                        <div className="sm:text-right font-mono text-[11px]">
                                            <span className="text-brand-600 font-bold block">AUTHENTICATED DIGITAL COPY</span>
                                            <span className="text-slate-500">{viewingReport.doctorOrLab}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Controls */}
                            <div className="p-5 bg-white border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 shrink-0">
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                    <ShieldCheck size={16} className="text-emerald-600" /> Digital Health Network
                                </span>
                                <div className="flex items-center gap-2.5">
                                    <button onClick={closeReportModal} className="px-4 py-2 font-bold text-slate-600 hover:text-slate-900 transition-colors text-sm">
                                        Close
                                    </button>
                                    <button
                                        onClick={() => handlePrintReport(viewingReport)}
                                        className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-sm"
                                        title="Print or Save as PDF"
                                    >
                                        <Printer size={16} /> Print / Save PDF
                                    </button>
                                    <button
                                        onClick={() => handleDownloadReport(viewingReport)}
                                        disabled={isDownloadingReport}
                                        className="px-5 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors flex items-center gap-1.5 text-sm shadow-md shadow-brand-500/20 disabled:opacity-50"
                                    >
                                        <Download size={16} /> {isDownloadingReport ? 'Downloading...' : 'Download Document'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MEDICINE DETAILS MODAL */}
            {/* MEDICINE DETAILS MODAL (RE-DESIGNED) */}
            {
                viewMedicine && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-fade-in-up h-full max-h-[90vh] md:max-h-[85vh]">

                            {/* Left: Image Section */}
                            <div className="md:w-2/5 bg-slate-50 p-8 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-100">
                                <img src={viewMedicine.image} alt={viewMedicine.name} className="w-full h-auto max-h-64 object-contain mix-blend-multiply" />
                                {viewMedicine.discount > 0 && (
                                    <div className="absolute top-6 left-6">
                                        <span className="bg-green-500 text-white font-black px-4 py-1.5 rounded-full text-xs shadow-lg">
                                            {viewMedicine.discount}% DISCOUNT
                                        </span>
                                    </div>
                                )}
                                {viewMedicine.isGeneric && (
                                    <div className="absolute bottom-6 left-6">
                                        <span className="bg-brand-600 text-white font-black px-4 py-1.5 rounded-full text-[10px] shadow-lg flex items-center gap-2">
                                            <ShieldCheck size={12} /> VERIFIED GENERIC
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Right: Info Section */}
                            <div className="md:w-3/5 p-8 flex flex-col overflow-y-auto custom-scrollbar h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <p className="text-brand-600 font-black text-[10px] tracking-widest uppercase">{viewMedicine.category}</p>
                                        <h2 className="text-2xl font-black text-slate-900 uppercase leading-tight">{viewMedicine.name}</h2>
                                        {viewMedicine.genericName && (
                                            <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5">
                                                Molecular Compound: <span className="text-slate-600 underline decoration-brand-200 decoration-2">{viewMedicine.genericName}</span>
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={closeMedicineModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* TABS / SECTIONS */}
                                <div className="space-y-6">
                                    {/* Mechanism of Action Section */}
                                    <div className="bg-brand-50/50 rounded-3xl p-6 border border-brand-100">
                                        <div className="flex items-center gap-2 mb-3 text-brand-700">
                                            <BrainCircuit size={18} />
                                            <h4 className="font-bold text-sm uppercase tracking-wide">How it Works (Mechanism of Action)</h4>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                            {viewMedicine.mechanismOfAction || "This certified pharmaceutical product acts directly on the target receptors to provide systemic relief and manage symptoms effectively."}
                                        </p>
                                    </div>

                                    {/* Product Details Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Manufacturer</p>
                                            <p className="text-sm font-bold text-slate-800">{viewMedicine.manufacturer}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pack Size</p>
                                            <p className="text-sm font-bold text-slate-800">{viewMedicine.packSize}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dosage Form</p>
                                            <p className="text-sm font-bold text-slate-800">{viewMedicine.type}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Strength</p>
                                            <p className="text-sm font-bold text-slate-800">{viewMedicine.dosage || 'Standard'}</p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-900 mb-2">About Medicine</h4>
                                        <p className="text-sm text-slate-500 leading-relaxed">{viewMedicine.description}</p>
                                    </div>

                                    {/* CART ACTION */}
                                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Payable</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl font-black text-slate-900">₹{viewMedicine.price}</span>
                                                <span className="text-lg text-slate-300 line-through">₹{viewMedicine.originalPrice}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => togglePharmacyCartItem(viewMedicine.id)}
                                            className={`px-10 py-4 font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl ${pharmacyCart.includes(viewMedicine.id)
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20 active:scale-95'
                                                }`}
                                        >
                                            {pharmacyCart.includes(viewMedicine.id) ? (
                                                <><Trash2 size={20} /> Remove Item</>
                                            ) : (
                                                <><ShoppingCart size={20} /> Add To Cart</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* AI FAB (Fixed Bottom Right) */}
            <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center hover:bg-indigo-700 hover:scale-105 transition-all active:scale-95 group relative"
                >
                    <MessageCircle size={28} className="group-hover:animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                    </span>
                </button>
            </div>

            {/* NEW CHATBOT COMPONENT */}
            <ChatBot
                userName={userName}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onBookAppointment={(doctor, notes) => {
                    setIsChatOpen(false);
                    openBookingModal(doctor, notes);
                }}
            />

            {/* VIEW ALL SYMPTOMS MODAL */}
            {
                viewAllSymptomsOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900">Select Symptoms</h3>
                                <button
                                    onClick={() => setViewAllSymptomsOpen(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                <p className="text-slate-500 mb-6">Select a symptom to start an AI assessment and find the right specialist.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {SYMPTOMS_LIST.map((symptom) => (
                                        <button
                                            key={symptom.id}
                                            onClick={() => handleSymptomClick(symptom)}
                                            className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all group text-center"
                                        >
                                            <div className={`w-12 h-12 rounded-xl ${symptom.bg} ${symptom.color} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                                                <symptom.icon size={24} />
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm group-hover:text-brand-700">{symptom.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* LAB CART & CHECKOUT MODAL (Slide Up) */}
            {
                isCartOpen && (
                    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col relative">

                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                                {(labBookingStep === 'cart' && activeTab !== 'pharmacy') || (pharmacyBookingStep === 'cart' && activeTab === 'pharmacy') ? (
                                    <div className="flex items-center gap-3">
                                        {/* Standardized Cart Icon */}
                                        <ShoppingCart size={24} className="text-brand-600" />
                                        <h3 className="text-xl font-bold text-slate-900">Your Cart</h3>
                                        <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {activeTab === 'pharmacy' ? pharmacyCart.length : cart.length} Items
                                        </span>
                                    </div>
                                ) : null}

                                {(labBookingStep === 'payment' || pharmacyBookingStep === 'payment' || pharmacyBookingStep === 'shipping') && (
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => activeTab === 'pharmacy'
                                                ? (pharmacyBookingStep === 'payment' ? setPharmacyBookingStep('shipping') : setPharmacyBookingStep('cart'))
                                                : setLabBookingStep('cart')
                                            }
                                            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 mr-1"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <h3 className="text-xl font-bold text-slate-900">{pharmacyBookingStep === 'shipping' ? 'Shipping' : 'Checkout'}</h3>
                                    </div>
                                )}

                                {(labBookingStep === 'success' || pharmacyBookingStep === 'success') && (
                                    <h3 className="text-xl font-bold text-slate-900">Order Confirmed</h3>
                                )}

                                {(labBookingStep !== 'success' && pharmacyBookingStep !== 'success') && (
                                    <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                                {/* === LAB TESTS CART === */}
                                {activeTab !== 'pharmacy' && labBookingStep === 'cart' && (
                                    cart.length > 0 ? (
                                        <div className="p-6 space-y-4">
                                            {cart.map(item => (
                                                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${item.type === 'Package' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.title}</h4>
                                                        <div className="flex items-baseline gap-2 mt-2">
                                                            <span className="font-bold text-brand-600">₹{item.price}</span>
                                                            <span className="text-xs text-slate-400 line-through">₹{item.original_price}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleCartItem(item)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center py-10 px-6">
                                            <ShoppingCart size={48} className="text-slate-200 mb-4" />
                                            <p className="text-slate-500 font-medium">Your cart is empty.</p>
                                            <button onClick={() => setIsCartOpen(false)} className="mt-4 text-brand-600 font-bold hover:underline">Browse Tests</button>
                                        </div>
                                    )
                                )}

                                {/* === PHARMACY CART === */}
                                {activeTab === 'pharmacy' && pharmacyBookingStep === 'cart' && (
                                    pharmacyCart.length > 0 ? (
                                        <div className="p-6 space-y-4">
                                            {pharmacyCart.map(id => {
                                                const item = MEDICINES.find(t => t.id === id);
                                                if (!item) return null;
                                                return (
                                                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center mr-4">
                                                            <img src={item.image} alt={item.name} className="h-12 w-12 object-contain mix-blend-multiply" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-slate-900 text-sm leading-tight">{item.name}</h4>
                                                            <p className="text-[10px] text-slate-500 mb-1">{item.packSize}</p>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="font-bold text-slate-900">₹{item.price}</span>
                                                                <span className="text-xs text-slate-400 line-through">₹{item.originalPrice}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => togglePharmacyCartItem(item.id)}
                                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center py-10 px-6">
                                            <ShoppingCart size={48} className="text-slate-200 mb-4" />
                                            <p className="text-slate-500 font-medium">Your pharmacy cart is empty.</p>
                                            <button onClick={() => setIsCartOpen(false)} className="mt-4 text-brand-600 font-bold hover:underline">Browse Medicines</button>
                                        </div>
                                    )
                                )}

                                {/* === PHARMACY SHIPPING === */}
                                {activeTab === 'pharmacy' && pharmacyBookingStep === 'shipping' && (
                                    <div className="p-6 space-y-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Delivery Address</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={shippingAddress.fullName}
                                                        onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                                                        className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 outline-none text-sm"
                                                        placeholder="Receiver's name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        value={shippingAddress.phone}
                                                        onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                                                        className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 outline-none text-sm"
                                                        placeholder="+91 00000 00000"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Street Address</label>
                                                    <textarea
                                                        value={shippingAddress.address}
                                                        onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                                                        className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 outline-none text-sm h-24"
                                                        placeholder="Flat, House no., Building, Company, Apartment"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">City</label>
                                                        <input
                                                            type="text"
                                                            value={shippingAddress.city}
                                                            onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 outline-none text-sm"
                                                            placeholder="City"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Pincode</label>
                                                        <input
                                                            type="text"
                                                            value={shippingAddress.pincode}
                                                            onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                                                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 outline-none text-sm"
                                                            placeholder="6-digit PIN"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === PHARMACY PAYMENT === */}
                                {activeTab === 'pharmacy' && pharmacyBookingStep === 'payment' && (
                                    <div className="p-6">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Order Summary</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>Items ({pharmacyCart.length})</span>
                                                    <span>₹{getPharmacyCartTotal()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>Shipping</span>
                                                    <span className={getPharmacyCartTotal() > 500 ? "text-green-600 font-bold" : "text-slate-900"}>
                                                        {getPharmacyCartTotal() > 500 ? "FREE" : "₹50"}
                                                    </span>
                                                </div>
                                                <div className="border-t border-slate-100 my-2 pt-2 flex justify-between font-bold text-slate-900 text-lg">
                                                    <span>Total Pay</span>
                                                    <span>₹{getPharmacyCartTotal() + (getPharmacyCartTotal() > 500 ? 0 : 50)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Payment Method</h4>
                                        <div className="space-y-3">
                                            <div className="p-4 border-2 border-brand-500 bg-brand-50 rounded-2xl flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-brand-600 shadow-sm">
                                                    <CreditCard size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-900">Online Payment</p>
                                                    <p className="text-[10px] text-brand-600 font-bold">Safe & Secure Transaction</p>
                                                </div>
                                                <div className="w-5 h-5 border-4 border-brand-600 rounded-full bg-white flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-brand-600 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="p-4 border border-slate-100 bg-white rounded-2xl flex items-center gap-4 opacity-50">
                                                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                                    <Truck size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-400">Cash on Delivery</p>
                                                    <p className="text-[10px] text-slate-400">Unavailable for this pincode</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === LAB PAYMENT === */}
                                {activeTab !== 'pharmacy' && labBookingStep === 'payment' && (
                                    <div className="p-6">
                                        {/* Order Summary */}
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Order Summary</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>Lab Tests ({cart.length})</span>
                                                    <span>₹{getCartTotal()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>Sample Collection</span>
                                                    <span className="text-green-600 font-bold">FREE</span>
                                                </div>
                                                <div className="border-t border-slate-100 my-2 pt-2 flex justify-between font-bold text-slate-900 text-lg">
                                                    <span>Total Pay</span>
                                                    <span>₹{getCartTotal()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Form */}
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Payment Method</h4>
                                        <div className="space-y-4 mb-8">
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                                <input type="text" placeholder="Card Number" className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                <input type="text" placeholder="CVV" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === PHARMACY SHIPPING === */}
                                {activeTab === 'pharmacy' && pharmacyBookingStep === 'shipping' && (
                                    <div className="p-6">
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Shipping Address</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700">Full Name</label>
                                                <input type="text" defaultValue="Daniel Bruk" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-700">Street Address</label>
                                                <input type="text" placeholder="House No, Street" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-700">City</label>
                                                    <input type="text" placeholder="Bangalore" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-700">Pincode</label>
                                                    <input type="text" placeholder="560001" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === PHARMACY PAYMENT === */}
                                {activeTab === 'pharmacy' && pharmacyBookingStep === 'payment' && (
                                    <div className="p-6">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Order Summary</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>Medicines ({pharmacyCart.length})</span>
                                                    <span>₹{getPharmacyCartTotal()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-slate-600">
                                                    <span>Delivery</span>
                                                    <span className="text-green-600 font-bold">FREE</span>
                                                </div>
                                                <div className="border-t border-slate-100 my-2 pt-2 flex justify-between font-bold text-slate-900 text-lg">
                                                    <span>Total Pay</span>
                                                    <span>₹{getPharmacyCartTotal()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Payment Method</h4>
                                        <div className="space-y-4 mb-8">
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                                <input type="text" placeholder="Card Number" className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                <input type="text" placeholder="CVV" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* === SUCCESS STATES === */}
                                {(labBookingStep === 'success' || pharmacyBookingStep === 'success') && (
                                    <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
                                            <Check size={40} className="text-green-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Order Confirmed!</h3>
                                        <p className="text-slate-500 mb-8">
                                            {activeTab === 'pharmacy' ? 'Your medicines will be delivered within 24 hours.' : 'Your lab test appointment has been scheduled successfully.'}
                                        </p>
                                        {activeTab === 'pharmacy' ? (
                                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                                                <Truck className="text-brand-600" />
                                                <div className="text-left">
                                                    <p className="text-xs text-slate-400 font-bold uppercase">Estimated Delivery</p>
                                                    <p className="font-bold text-slate-900">Tomorrow, by 6 PM</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                                                <Calendar className="text-brand-600" />
                                                <div className="text-left">
                                                    <p className="text-xs text-slate-400 font-bold uppercase">Sample Collection</p>
                                                    <p className="font-bold text-slate-900">Tomorrow, 08:00 AM</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer (Sticky) */}
                            {(labBookingStep !== 'success' && pharmacyBookingStep !== 'success') && (
                                <div className="p-6 border-t border-slate-100 bg-white">

                                    {/* LAB: CART -> CHECKOUT */}
                                    {activeTab !== 'pharmacy' && labBookingStep === 'cart' && (
                                        <button
                                            onClick={handleLabCheckout}
                                            disabled={cart.length === 0}
                                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            Proceed to Checkout <ChevronRight size={18} />
                                        </button>
                                    )}

                                    {/* LAB: PAYMENT -> PAY */}
                                    {activeTab !== 'pharmacy' && labBookingStep === 'payment' && (
                                        <button
                                            onClick={handleConfirmLabPayment}
                                            disabled={isProcessingLabPayment}
                                            className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isProcessingLabPayment ? 'Processing...' : `Pay ₹${getCartTotal()}`}
                                        </button>
                                    )}

                                    {/* PHARMACY: CART -> SHIPPING */}
                                    {activeTab === 'pharmacy' && pharmacyBookingStep === 'cart' && (
                                        <button
                                            onClick={handlePharmacyCheckout}
                                            disabled={pharmacyCart.length === 0}
                                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            Proceed to Shipping <ChevronRight size={18} />
                                        </button>
                                    )}

                                    {/* PHARMACY: SHIPPING -> PAYMENT */}
                                    {activeTab === 'pharmacy' && pharmacyBookingStep === 'shipping' && (
                                        <button
                                            onClick={handlePharmacyShipping}
                                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-brand-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            Proceed to Payment <ChevronRight size={18} />
                                        </button>
                                    )}

                                    {/* PHARMACY: PAYMENT -> PAY */}
                                    {activeTab === 'pharmacy' && pharmacyBookingStep === 'payment' && (
                                        <button
                                            onClick={handleConfirmPharmacyPayment}
                                            disabled={isProcessingPharmaPayment}
                                            className="w-full bg-brand-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            {isProcessingPharmaPayment ? 'Processing...' : `Pay ₹${getPharmacyCartTotal()}`}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Success Footer */}
                            {(labBookingStep === 'success' || pharmacyBookingStep === 'success') && (
                                <div className="p-6 border-t border-slate-100 bg-white">
                                    <button
                                        onClick={activeTab === 'pharmacy' ? handlePharmacyOrderComplete : handleShowLabReceipt}
                                        className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                                    >
                                        View Receipt
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                )
            }

            {/* Booking Modal for Doctor - Needs to be rendered if selectedDoctor is not null */}
            {
                selectedDoctor && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {bookingStep === 'details' ? 'Book Appointment' :
                                        bookingStep === 'payment' ? 'Confirm & Pay' : 'Booking Confirmed'}
                                </h3>
                                {bookingStep !== 'success' && (
                                    <button onClick={closeBookingModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="p-6">
                                {bookingStep === 'details' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <img src={selectedDoctor.image} className="w-16 h-16 rounded-xl object-cover" alt="Doctor" />
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-900">{selectedDoctor.name}</h4>
                                                <p className="text-sm text-slate-500">{selectedDoctor.specialty} • {selectedDoctor.hospital}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Consultation Type</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setBookingType('video')}
                                                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${bookingType === 'video' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                                >
                                                    <Video size={18} /> Video Call
                                                </button>
                                                <button
                                                    onClick={() => setBookingType('clinic')}
                                                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${bookingType === 'clinic' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                                >
                                                    <MapPin size={18} /> Clinic Visit
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Select Date</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                {['Today', 'Tomorrow', 'Fri, 28 Jan', 'Sat, 29 Jan'].map(date => (
                                                    <button
                                                        key={date}
                                                        onClick={() => setBookingDate(date)}
                                                        className={`flex-shrink-0 px-4 py-2 rounded-lg border text-sm font-bold transition-all ${bookingDate === date ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}
                                                    >
                                                        {date}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 uppercase mb-2 block">Select Time</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM', '06:00 PM', '07:30 PM'].map(time => (
                                                    <button
                                                        key={time}
                                                        onClick={() => setBookingTime(time)}
                                                        className={`px-2 py-2 rounded-lg border text-sm font-medium transition-all ${bookingTime === time ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                                    >
                                                        {time}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleProceedToPayment}
                                            disabled={!bookingTime}
                                            className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                        >
                                            Proceed to Pay ₹{selectedDoctor.price}
                                        </button>
                                    </div>
                                )}

                                {bookingStep === 'payment' && (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex justify-between mb-2 text-sm text-slate-600">
                                                <span>Consultation Fee</span>
                                                <span>₹{selectedDoctor.price}</span>
                                            </div>
                                            <div className="flex justify-between mb-2 text-sm text-slate-600">
                                                <span>Service Charge</span>
                                                <span>₹50</span>
                                            </div>
                                            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-slate-900 text-lg">
                                                <span>Total</span>
                                                <span>₹{selectedDoctor.price + 50}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-slate-700 uppercase mb-3 block">Card Details</label>
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                                    <input type="text" placeholder="Card Number" className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="text" placeholder="MM/YY" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                    <input type="text" placeholder="CVV" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleConfirmPayment}
                                            disabled={isProcessingPayment}
                                            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isProcessingPayment ? 'Processing...' : `Pay ₹${selectedDoctor.price + 50}`}
                                        </button>
                                    </div>
                                )}

                                {bookingStep === 'success' && (
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Check size={40} className="text-green-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h3>
                                        <p className="text-slate-500 mb-8">
                                            Your appointment with {selectedDoctor.name.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`} has been scheduled for {bookingDate} at {bookingTime || '10:00 AM'}.
                                        </p>
                                        <button
                                            onClick={closeBookingModal}
                                            className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:bg-brand-700 transition-all"
                                        >
                                            Go to Appointments
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* VIDEO CALL OVERLAY */}
            {
                isCallOpen && activeCallRoom && (
                    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col animate-fade-in">
                        <div className="flex-1 relative">
                            <JitsiMeet
                                roomName={activeCallRoom}
                                displayName={userName}
                                onLeave={handleCloseCall}
                                className="w-full h-full"
                            />
                            <button
                                onClick={handleCloseCall}
                                className="absolute top-6 right-6 z-10 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
                            >
                                <Phone size={18} className="rotate-[135deg]" /> Leave Call
                            </button>
                        </div>
                    </div>
                )
            }

            {/* LAB TEST DETAILS MODAL */}
            {
                viewLabTest && (
                    <LabTestDetails
                        test={viewLabTest}
                        onClose={() => setViewLabTest(null)}
                        onAddToCart={(test) => {
                            if (!cart.find(c => c.id === test.id)) {
                                toggleCartItem(test);
                            }
                            setViewLabTest(null);
                            // Optional: Open cart or show toast
                            setIsCartOpen(true);
                        }}
                    />
                )
            }

            {/* LAB RECEIPT MODAL */}
            {
                showLabReceipt && (
                    <LabReceipt
                        transactionId={lastTransactionId}
                        patientName={userName}
                        date={new Date().toLocaleDateString()}
                        items={cart.map(item => ({ title: item.title, price: item.price }))}
                        totalAmount={getCartTotal()}
                        onClose={() => {
                            setShowLabReceipt(false);
                            setLabBookingStep('cart');
                            setCart([]);
                            setIsCartOpen(false);
                            setActiveTab('overview'); // or stay on lab-tests
                        }}
                    />
                )
            }

        </div >
    );
};

export default PatientDashboard;