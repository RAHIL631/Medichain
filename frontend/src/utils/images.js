// frontend/src/utils/images.js
// Centralised real image URLs for MediChain
// All images are served via Unsplash Source API (free, no auth required)
// Pattern: https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=<w>&q=80

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITALS — real photographs of Indian hospitals / medical centres
// ─────────────────────────────────────────────────────────────────────────────
export const HOSPITAL_IMAGES = {
  // Iconic large teaching / super-speciality hospitals
  apollo:        'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
  fortis:        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  aiims:         'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=800&q=80',
  narayana:      'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&w=800&q=80',
  manipal:       'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
  tata:          'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80',
  medanta:       'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=800&q=80',
  kokilaben:     'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
  lilavati:      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
  kem:           'https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&w=800&q=80',
  // Generic fallbacks by type
  government:    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
  private:       'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
  trust:         'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
  military:      'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=800&q=80',
  ayush:         'https://images.unsplash.com/photo-1536856136534-bb679c52a9aa?auto=format&fit=crop&w=800&q=80',
  default:       'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
};

// City-specific hospital scene overrides
export const CITY_HOSPITAL_IMAGES = {
  Mumbai:     'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80',
  Delhi:      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=80',
  Bangalore:  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80',
  Chennai:    'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?auto=format&fit=crop&w=800&q=80',
  Hyderabad:  'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=800&q=80',
  Pune:       'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80',
  Kolkata:    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80',
  Ahmedabad:  'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=800&q=80',
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICINES — real pill / medicine photographs
// ─────────────────────────────────────────────────────────────────────────────
export const MEDICINE_IMAGES = {
  pills:           'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  blister:         'https://images.unsplash.com/photo-1563213126-a4273aed2016?auto=format&fit=crop&w=600&q=80',
  capsules:        'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=80',
  syrup:           'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80',
  injection:       'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=80',
  tablet:          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  prescription:    'https://images.unsplash.com/photo-1563213126-a4273aed2016?auto=format&fit=crop&w=600&q=80',
  pharmacy:        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80',
  iv_drip:         'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=80',
  antibiotics:     'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=600&q=80',
  default:         'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCTORS — professional medical staff photos
// ─────────────────────────────────────────────────────────────────────────────
export const DOCTOR_IMAGES = {
  male_1:    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
  male_2:    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
  female_1:  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
  female_2:  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&q=80',
  surgeon:   'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=400&q=80',
  team:      'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=800&q=80',
  default:   'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
};

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL PROCEDURES / DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────
export const MEDICAL_IMAGES = {
  xray:          'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
  mri:           'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=600&q=80',
  ecg:           'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?auto=format&fit=crop&w=600&q=80',
  lab:           'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
  blood_test:    'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80',
  surgery:       'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=600&q=80',
  icu:           'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80',
  stethoscope:   'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80',
  patient_room:  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80',
  default:       'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
};

// ─────────────────────────────────────────────────────────────────────────────
// DISEASE-SPECIFIC IMAGERY  (used by hospital recommendation)
// ─────────────────────────────────────────────────────────────────────────────
export const DISEASE_IMAGES = {
  heart_disease:  'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?auto=format&fit=crop&w=600&q=80',
  diabetes:       'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=600&q=80',
  kidney_disease: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80',
  stroke:         'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=600&q=80',
  liver_disease:  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
  cancer:         'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
  hypertension:   'https://images.unsplash.com/photo-1628348070889-cb656235b4eb?auto=format&fit=crop&w=600&q=80',
  respiratory:    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=600&q=80',
  orthopedic:     'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80',
  mental_health:  'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=600&q=80',
  pediatric:      'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=600&q=80',
  pregnancy:      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
  default:        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80',
};

// ─────────────────────────────────────────────────────────────────────────────
// LANDING PAGE / HERO
// ─────────────────────────────────────────────────────────────────────────────
export const LANDING_IMAGES = {
  hero_bg:        'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80',
  doctors_team:   'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1200&q=80',
  blockchain:     'https://images.unsplash.com/photo-1639762681057-408e52192e55?auto=format&fit=crop&w=800&q=80',
  ai_health:      'https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?auto=format&fit=crop&w=800&q=80',
  patient_care:   'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80',
  ehr:            'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
};

// ─────────────────────────────────────────────────────────────────────────────
// RECORD TYPE IMAGES (for RecordCard thumbnails)
// ─────────────────────────────────────────────────────────────────────────────
export const RECORD_TYPE_IMAGES = {
  prescription:  MEDICINE_IMAGES.prescription,
  'lab-report':  MEDICAL_IMAGES.lab,
  diagnosis:     MEDICAL_IMAGES.stethoscope,
  imaging:       MEDICAL_IMAGES.xray,
  vaccination:   MEDICINE_IMAGES.injection,
  default:       MEDICAL_IMAGES.default,
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick the best hospital image given a hospital object.
 * Tries name match first, then type, then city, then default.
 */
export function getHospitalImage(hospital = {}) {
  const name = (hospital.name || '').toLowerCase();
  // Name-based matching
  if (name.includes('apollo'))     return HOSPITAL_IMAGES.apollo;
  if (name.includes('fortis'))     return HOSPITAL_IMAGES.fortis;
  if (name.includes('aiims'))      return HOSPITAL_IMAGES.aiims;
  if (name.includes('narayana'))   return HOSPITAL_IMAGES.narayana;
  if (name.includes('manipal'))    return HOSPITAL_IMAGES.manipal;
  if (name.includes('tata'))       return HOSPITAL_IMAGES.tata;
  if (name.includes('medanta'))    return HOSPITAL_IMAGES.medanta;
  if (name.includes('kokilaben'))  return HOSPITAL_IMAGES.kokilaben;
  if (name.includes('lilavati'))   return HOSPITAL_IMAGES.lilavati;
  if (name.includes('kem'))        return HOSPITAL_IMAGES.kem;
  // City-based
  const city = hospital.address?.city || hospital.city || '';
  if (CITY_HOSPITAL_IMAGES[city]) return CITY_HOSPITAL_IMAGES[city];
  // Type-based
  if (hospital.type && HOSPITAL_IMAGES[hospital.type]) return HOSPITAL_IMAGES[hospital.type];
  return HOSPITAL_IMAGES.default;
}

/**
 * Pick a medicine image based on drug name or category.
 */
export function getMedicineImage(drugName = '') {
  const d = drugName.toLowerCase();
  if (d.includes('syrup') || d.includes('suspension')) return MEDICINE_IMAGES.syrup;
  if (d.includes('inject') || d.includes('iv') || d.includes('intravenous')) return MEDICINE_IMAGES.injection;
  if (d.includes('capsule')) return MEDICINE_IMAGES.capsules;
  if (d.includes('tablet') || d.includes('tab')) return MEDICINE_IMAGES.tablet;
  return MEDICINE_IMAGES.pills;
}

/**
 * Pick a record type thumbnail image.
 */
export function getRecordTypeImage(type = '') {
  return RECORD_TYPE_IMAGES[type] || RECORD_TYPE_IMAGES.default;
}
