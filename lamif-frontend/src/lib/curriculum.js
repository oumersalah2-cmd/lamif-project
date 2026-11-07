// Comprehensive Curriculum Definition for LAMIF Platform
// Covers KG 1 to Grade 12, Languages (Amharic, Afaan Oromoo, English, Arabic),
// Test Prep (IELTS, SAT, Scholarships), and Technology (Computer Basics, Programming).

export const CURRICULUM_LEVELS = [
  {
    id: 'kg',
    num: 'KG 1–3',
    titleKey: 'level.kg.title',
    descKey: 'level.kg.desc',
    label: 'KG 1 – 3 (Kindergarten & Preschool)',
    defaultTitle: 'Early Childhood & Kindergarten (KG 1–3)',
    defaultDesc: 'Phonics, reading readiness, early numeracy, alphabet recognition & motor skills.'
  },
  {
    id: 'primary_lower',
    num: 'G1–4',
    titleKey: 'level.primary_lower.title',
    descKey: 'level.primary_lower.desc',
    label: 'Lower Primary (Grade 1–4)',
    defaultTitle: 'Lower Primary Education (Grade 1–4)',
    defaultDesc: 'Foundational reading literacy, arithmetic, environmental science & guided homework.'
  },
  {
    id: 'primary_upper',
    num: 'G5–8',
    titleKey: 'level.primary_upper.title',
    descKey: 'level.primary_upper.desc',
    label: 'Upper Primary / Middle (Grade 5–8)',
    defaultTitle: 'Upper Primary Education (Grade 5–8)',
    defaultDesc: 'General science, mathematics, social studies, English & regional ministry exam prep.'
  },
  {
    id: 'secondary',
    num: 'G9–10',
    titleKey: 'level.secondary.title',
    descKey: 'level.secondary.desc',
    label: 'Secondary Education (Grade 9–10)',
    defaultTitle: 'Secondary Education (Grade 9–10)',
    defaultDesc: 'Physics, chemistry, biology, mathematics, languages & regional assessment readiness.'
  },
  {
    id: 'preparatory',
    num: 'G11–12',
    titleKey: 'level.prep.title',
    descKey: 'level.prep.desc',
    label: 'Preparatory & National Entrance (Grade 11–12)',
    defaultTitle: 'Preparatory & National Entrance (Grade 11–12)',
    defaultDesc: 'Natural & Social science streams, targeted ESSLCE matriculation prep & past exam deconstruction.',
    highlight: true
  },
  {
    id: 'test_prep',
    num: 'Global',
    titleKey: 'level.test_prep.title',
    descKey: 'level.test_prep.desc',
    label: 'IELTS, SAT & Scholarship Admissions',
    defaultTitle: 'IELTS, SAT & Scholarship Mentorship',
    defaultDesc: 'Digital SAT, IELTS/TOEFL, scholarship application process, essays & college admissions guidance.'
  },
  {
    id: 'tech_skills',
    num: 'Tech',
    titleKey: 'level.tech_skills.title',
    descKey: 'level.tech_skills.desc',
    label: 'Computer Basics & Programming',
    defaultTitle: 'Computer Basics & Programming',
    defaultDesc: 'How to use a computer, typing, Windows, MS Office, Python, web development & coding.'
  },
  {
    id: 'university',
    num: 'Uni',
    titleKey: 'level.uni.title',
    descKey: 'level.uni.desc',
    label: 'University & Higher Academia',
    defaultTitle: 'University & Higher Academia',
    defaultDesc: 'Advanced calculus, engineering, medicine, computer science & coursework mentorship.'
  }
]

export const CURRICULUM_CATEGORIES = [
  {
    name: 'Kindergarten & Early Childhood (KG 1–3)',
    subjects: [
      'Kindergarten Phonics & Alphabet',
      'KG Early Numeracy & Counting',
      'Preschool Handwriting & Motor Skills',
      'Early Childhood English & Amharic'
    ]
  },
  {
    name: 'Primary & Middle School (Grade 1–8)',
    subjects: [
      'Primary Mathematics (G1–8)',
      'General Science (G1–8)',
      'Environmental Science (G1–4)',
      'Social Studies (G5–8)',
      'Citizenship Education (G7–8)',
      'Information Technology / IT (G7–8)'
    ]
  },
  {
    name: 'Secondary & Preparatory (Grade 9–12)',
    subjects: [
      'Mathematics (Grade 9–12)',
      'Physics (Grade 9–12)',
      'Chemistry (Grade 9–12)',
      'Biology (Grade 9–12)',
      'Grade 12 ESSLCE National Exam Prep',
      'History (Grade 9–12)',
      'Geography (Grade 9–12)',
      'Economics & Business (Grade 11–12)',
      'Civics & Citizenship (Grade 9–12)'
    ]
  },
  {
    name: 'Languages',
    subjects: [
      'English Language & Grammar',
      'Amharic (አማርኛ)',
      'Afaan Oromoo',
      'Arabic (العربية)',
      'French (Français)'
    ]
  },
  {
    name: 'International Test Prep & College Admissions',
    subjects: [
      'IELTS Preparation (Academic & General)',
      'SAT & Digital SAT',
      'TOEFL Exam Prep',
      'Scholarship Application Process',
      'College Admissions Essays & Statement of Purpose',
      'Study Abroad & Visa Guidance'
    ]
  },
  {
    name: 'Technology & Computer Programming',
    subjects: [
      'Computer Basics (How to Use a Computer)',
      'Microsoft Office (Word, Excel, PowerPoint)',
      'Computer Programming & Coding',
      'Python Programming',
      'Web Development (HTML, CSS, JavaScript, React)',
      'Scratch & Coding for Kids'
    ]
  }
]

// Flattened list of all standard curriculum subjects for autocomplete and filters
export const ALL_CURRICULUM_SUBJECTS = Array.from(
  new Set(CURRICULUM_CATEGORIES.flatMap(cat => cat.subjects))
)

// Curated subjects for homepage spotlight showcase
export const SPOTLIGHT_SUBJECTS = [
  { name: 'Mathematics (KG–12)' },
  { name: 'Physics (Grade 9–12)' },
  { name: 'Chemistry (Grade 9–12)' },
  { name: 'Biology (Grade 9–12)' },
  { name: 'English Language' },
  { name: 'Amharic (አማርኛ)' },
  { name: 'Afaan Oromoo' },
  { name: 'Arabic (العربية)' },
  { name: 'IELTS Preparation' },
  { name: 'SAT & Digital SAT' },
  { name: 'Scholarship Application Process' },
  { name: 'Computer Basics (How to Use a Computer)' },
  { name: 'Computer Programming (Python & Web)' },
  { name: 'Grade 12 ESSLCE Prep' },
  { name: 'KG 1–3 Early Childhood Foundation' },
  { name: 'General Science (Grade 1–8)' }
]

