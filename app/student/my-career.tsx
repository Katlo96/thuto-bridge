import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  getDocs,
  limit as firestoreLimit,
  query as firestoreQuery,
  startAfter as firestoreStartAfter,
  type CollectionReference,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';

import { auth, db } from '../../constants/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getSavedItems,
  getSavedItemsErrorMessage,
  isItemSaved,
  saveItem,
} from '../../services/savedItemsService';
import DashboardLayout, {
  radii,
  spacing,
  typography,
  useTheme,
} from '../../components/student/DashboardLayout';
import StudentFooter from '../../components/student/StudentFooter';
import { StudentMenuProvider } from '../../components/student/StudentMenu';
import { useLanguage } from '../../contexts/LanguageContext';

const CAREER_CACHE_KEY = '@thuto-bridge/career-explorer/v2';
const CAREER_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SLOW_LOAD_BANNER_DELAY_MS = 4_000;

// ─────────────────────────────────────────────────────────────────────────────
// Course pagination tunables (mobile fix)
//
// The original implementation awaited `getDocs(collection(db, 'courses'))`
// in full before building or painting anything. On web that round trip is
// fast enough not to matter; on a slower mobile connection it's what made
// this screen feel frozen — nothing rendered until the ENTIRE courses
// collection had downloaded.
//
// This now mirrors the pattern already used in courses.tsx: fetch a small
// first page, build+paint the field/career taxonomy from it immediately,
// then keep paging the rest of the collection in the background, merging
// results in and yielding to the UI thread between pages.
// ─────────────────────────────────────────────────────────────────────────────
const IS_NATIVE_MOBILE = Platform.OS !== 'web';
const CAREER_INITIAL_COURSE_BATCH = IS_NATIVE_MOBILE ? 24 : 40;
const CAREER_BACKGROUND_COURSE_BATCH = IS_NATIVE_MOBILE ? 24 : 100;
const CAREER_BATCH_YIELD_MS = 50;

// ─────────────────────────────────────────────────────────────────────────────
// safeDocs — 20s timeout, one retry after 1.5s.
//
// This is the actual fix for "still takes a very long time to load" on
// mobile: pagination alone only shrinks the payload, it doesn't protect
// against a stalled Firestore transport. On React Native, Firestore's
// WebChannel connection can briefly hang instead of erroring — a plain
// `getDocs()` call can then sit unresolved indefinitely, which is
// indistinguishable from "very slow" to the person using the app. This
// mirrors the exact wrapper already proven in courses.tsx: give every read
// a bounded timeout, and one automatic retry, so a stalled connection fails
// fast and recovers instead of hanging forever.
// ─────────────────────────────────────────────────────────────────────────────
const CAREER_FIRESTORE_TIMEOUT_MS = 20_000;
const CAREER_FIRESTORE_RETRY_DELAY_MS = 1_500;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('firestore_timeout'));
    }, ms);

    p.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function safeDocs(
  ref: Query<DocumentData> | CollectionReference<DocumentData>,
): Promise<QuerySnapshot<DocumentData>> {
  try {
    return await withTimeout(getDocs(ref), CAREER_FIRESTORE_TIMEOUT_MS);
  } catch {
    await new Promise((res) => setTimeout(res, CAREER_FIRESTORE_RETRY_DELAY_MS));
    return await withTimeout(getDocs(ref), CAREER_FIRESTORE_TIMEOUT_MS);
  }
}

function getFriendlyErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'firestore_timeout') {
    return 'The connection is taking too long. Please check your network and try again.';
  }
  const code = (err as { code?: string } | null | undefined)?.code;
  if (code === 'permission-denied') {
    return "You don't have permission to view careers right now. Please sign in again.";
  }
  if (code === 'unavailable') {
    return 'The course service is temporarily unavailable. Please try again shortly.';
  }
  return 'Could not load career data. Please check your connection and try again.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type InstType = 'University' | 'College' | 'Brigade';
type View3 = 'fields' | 'roles' | 'detail';

type SubjectRequirement = {
  subject: string;
  grade: string;
};

type Institution = {
  courseId: string;
  institutionId: string;
  facultyId: string;
  facultyName: string;
  name: string;
  type: InstType;
  programme: string;
  duration: string;
  minPoints: number | null;
  minGrade: string;
  fee: string;
  mode: string;
  about: string;
  subjects: SubjectRequirement[];
};

type Role = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  institutions: Institution[];
  institutionCount: number;
  courseCount: number;
  minimumPoints: number | null;
};

type Field = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  tagline: string;
  roles: Role[];
};

type CareerCachePayload = {
  savedAt: number;
  fields: Field[];
};

type CourseRecord = {
  id: string;
  institutionId: string;
  facultyId: string;
  facultyName: string;
  institutionName: string;
  institutionType: InstType;
  title: string;
  duration: string;
  points: number | null;
  fee: string;
  mode: string;
  about: string;
  careers: string[];
  subjects: SubjectRequirement[];
};

type InstitutionLookup = {
  id: string;
  name: string;
  type: InstType;
};

type FacultyLookup = {
  id: string;
  institutionId: string;
  name: string;
};

type FieldDefinition = Omit<Field, 'roles'> & {
  keywords: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Career-field catalogue
//
// These are presentation categories only. Careers themselves always come from
// Firestore course documents.
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: 'health',
    label: 'Medical & Health',
    icon: 'medkit-outline',
    color: '#F87171',
    bgColor: '#7F1D1D',
    tagline: 'Support health, wellbeing and clinical care',
    keywords: [
      'doctor', 'medical', 'medicine', 'nurse', 'nursing', 'health',
      'pharmac', 'dent', 'radiograph', 'laboratory', 'clinical',
      'physio', 'therapy', 'nutrition', 'diet', 'biomedical',
      'pathology', 'epidemi', 'counsellor', 'psycholog', 'veterinar',
    ],
  },
  {
    id: 'technology',
    label: 'Technology & IT',
    icon: 'code-slash-outline',
    color: '#60A5FA',
    bgColor: '#1E3A5F',
    tagline: 'Build, protect and improve digital systems',
    keywords: [
      'software', 'developer', 'programmer', 'computer', 'information technology',
      'it support', 'systems', 'network', 'cyber', 'security', 'database',
      'data scientist', 'data analyst', 'data engineer', 'artificial intelligence',
      'machine learning', 'cloud', 'web', 'mobile', 'digital', 'ui/ux',
      'multimedia', 'informatics', 'telecommunication',
    ],
  },
  {
    id: 'engineering',
    label: 'Engineering & Built Environment',
    icon: 'construct-outline',
    color: '#FBBF24',
    bgColor: '#78350F',
    tagline: 'Design, build and maintain essential systems',
    keywords: [
      'engineer', 'engineering', 'architect', 'construction', 'building',
      'surveyor', 'draught', 'cad', 'technician', 'electrician', 'electrical',
      'mechanic', 'mechanical', 'machinist', 'fitter', 'boilermaker',
      'welder', 'plumber', 'carpenter', 'masonry', 'civil', 'structural',
      'maintenance', 'plant', 'automotive', 'vehicle', 'electronics',
      'instrumentation', 'refrigeration', 'air conditioning',
    ],
  },
  {
    id: 'business',
    label: 'Business, Finance & Management',
    icon: 'briefcase-outline',
    color: '#34D399',
    bgColor: '#064E3B',
    tagline: 'Lead organisations, markets and enterprise',
    keywords: [
      'account', 'audit', 'finance', 'financial', 'bank', 'econom',
      'business', 'manager', 'management', 'entrepreneur', 'startup',
      'marketing', 'brand', 'sales', 'human resource', 'hr ', 'recruit',
      'procurement', 'supply chain', 'logistics', 'project manager',
      'operations', 'administrator', 'administration', 'consultant',
      'investment', 'insurance', 'commerce', 'retail', 'trade',
    ],
  },
  {
    id: 'law',
    label: 'Law, Governance & Public Service',
    icon: 'scale-outline',
    color: '#A78BFA',
    bgColor: '#3B0764',
    tagline: 'Advance justice, policy and public institutions',
    keywords: [
      'lawyer', 'attorney', 'legal', 'law ', 'magistrate', 'judge',
      'prosecutor', 'compliance', 'policy', 'governance', 'government',
      'public administration', 'public officer', 'diplomat', 'foreign affairs',
      'human rights', 'regulatory', 'political', 'international relations',
      'customs', 'immigration',
    ],
  },
  {
    id: 'education',
    label: 'Education & Human Development',
    icon: 'school-outline',
    color: '#38BDF8',
    bgColor: '#0C4A6E',
    tagline: 'Teach, guide and develop people',
    keywords: [
      'teacher', 'educator', 'education', 'lecturer', 'trainer', 'instructor',
      'curriculum', 'school', 'academic', 'learning', 'literacy',
      'child development', 'student support', 'career guidance',
    ],
  },
  {
    id: 'science',
    label: 'Science, Research & Analytics',
    icon: 'flask-outline',
    color: '#22D3EE',
    bgColor: '#164E63',
    tagline: 'Investigate, analyse and create new knowledge',
    keywords: [
      'scientist', 'research', 'physicist', 'chemist', 'biologist',
      'microbiolog', 'biochem', 'mathematic', 'statistic', 'analyst',
      'laboratory', 'astronom', 'geologist', 'geophys', 'researcher',
    ],
  },
  {
    id: 'environment',
    label: 'Agriculture & Environment',
    icon: 'leaf-outline',
    color: '#86EFAC',
    bgColor: '#14532D',
    tagline: 'Protect natural resources and strengthen food systems',
    keywords: [
      'agricultur', 'farm', 'crop', 'livestock', 'animal', 'soil',
      'horticultur', 'aquaculture', 'fisher', 'wildlife', 'conservation',
      'environment', 'climate', 'sustainab', 'ecolog', 'forestry',
      'water resource', 'hydrolog', 'meteorolog', 'gis', 'geograph',
      'land ', 'park ranger', 'game ranger', 'irrigation',
    ],
  },
  {
    id: 'tourism',
    label: 'Tourism, Hospitality & Events',
    icon: 'airplane-outline',
    color: '#F59E0B',
    bgColor: '#713F12',
    tagline: 'Create memorable travel and guest experiences',
    keywords: [
      'tourism', 'tour ', 'travel', 'hotel', 'hospitality', 'restaurant',
      'chef', 'culinary', 'food and beverage', 'event', 'safari',
      'guide', 'airline', 'guest', 'accommodation', 'heritage',
    ],
  },
  {
    id: 'creative',
    label: 'Creative Arts, Media & Communication',
    icon: 'color-palette-outline',
    color: '#FB7185',
    bgColor: '#881337',
    tagline: 'Communicate, design and inspire',
    keywords: [
      'artist', 'art ', 'designer', 'design', 'writer', 'editor',
      'journalist', 'media', 'communication', 'public relations',
      'content', 'music', 'musician', 'actor', 'theatre', 'film',
      'photograph', 'animat', 'fashion', 'language', 'translator',
      'curator', 'publisher', 'broadcast',
    ],
  },
  {
    id: 'social',
    label: 'Social & Community Services',
    icon: 'people-outline',
    color: '#C084FC',
    bgColor: '#581C87',
    tagline: 'Strengthen people, communities and social wellbeing',
    keywords: [
      'social worker', 'community', 'sociolog', 'anthropolog',
      'development officer', 'ngo', 'counsellor', 'welfare',
      'youth', 'rehabilitation', 'humanitarian', 'social researcher',
    ],
  },
  {
    id: 'mining',
    label: 'Mining, Energy & Earth Resources',
    icon: 'layers-outline',
    color: '#F97316',
    bgColor: '#7C2D12',
    tagline: 'Develop mineral, earth and energy resources responsibly',
    keywords: [
      'mining', 'mine ', 'mineral', 'geology', 'geologist', 'petroleum',
      'energy', 'renewable', 'solar', 'power systems', 'resource evaluation',
      'drilling', 'ore ', 'metallurg', 'seismic',
    ],
  },
];

const OTHER_FIELD: FieldDefinition = {
  id: 'other',
  label: 'Other Professional Pathways',
  icon: 'compass-outline',
  color: '#94A3B8',
  bgColor: '#334155',
  tagline: 'Explore additional course-linked career opportunities',
  keywords: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Data helpers
// ─────────────────────────────────────────────────────────────────────────────

function valueFrom(
  data: DocumentData,
  keys: string[],
): unknown {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function textFrom(
  data: DocumentData,
  keys: string[],
  fallback = '',
): string {
  const value = valueFrom(data, keys);
  return typeof value === 'string' ? value.trim() : fallback;
}

function numberFrom(
  data: DocumentData,
  keys: string[],
): number | null {
  const value = valueFrom(data, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function stringArrayFrom(
  data: DocumentData,
  keys: string[],
): string[] {
  const value = valueFrom(data, keys);

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => String(item ?? '').trim())
          .filter(Boolean),
      ),
    );
  }

  if (typeof value === 'string') {
    return Array.from(
      new Set(
        value
          .split(/[,;|]/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
  }

  return [];
}

function subjectRequirementsFrom(data: DocumentData): SubjectRequirement[] {
  const raw = valueFrom(data, [
    'subjects',
    'requiredSubjects',
    'subjectRequirements',
    'entrySubjects',
  ]);

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item): SubjectRequirement | null => {
      if (Array.isArray(item)) {
        const subject = String(item[0] ?? '').trim();
        const grade = String(item[1] ?? '').trim();
        return subject ? { subject, grade } : null;
      }

      if (item && typeof item === 'object') {
        const objectItem = item as Record<string, unknown>;
        const subject = String(
          objectItem.subject ??
          objectItem.name ??
          objectItem.label ??
          '',
        ).trim();
        const grade = String(
          objectItem.grade ??
          objectItem.minimumGrade ??
          objectItem.minGrade ??
          '',
        ).trim();

        return subject ? { subject, grade } : null;
      }

      return null;
    })
    .filter((item): item is SubjectRequirement => item !== null);
}

function normaliseInstitutionType(value: unknown): InstType {
  const text = String(value ?? '').toLowerCase();

  if (text.includes('brigade') || text.includes('technical training')) {
    return 'Brigade';
  }

  if (text.includes('college')) {
    return 'College';
  }

  return 'University';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'career';
}

function formatFee(data: DocumentData): string {
  const direct = textFrom(data, [
    'fee',
    'fees',
    'tuition',
    'tuitionFee',
    'annualFee',
    'tuitionPerYear',
  ]);

  if (direct) {
    return direct;
  }

  const numericFee = numberFrom(data, [
    'feeAmount',
    'tuitionAmount',
    'annualTuition',
  ]);

  return numericFee !== null
    ? `BWP ${numericFee.toLocaleString()}/yr`
    : 'Contact institution';
}

function formatMinimumGrade(subjects: SubjectRequirement[]): string {
  if (subjects.length === 0) {
    return 'See course requirements';
  }

  return subjects
    .slice(0, 3)
    .map(({ subject, grade }) => grade ? `${grade} in ${subject}` : subject)
    .join(', ');
}

function courseDuration(data: DocumentData): string {
  const duration = textFrom(data, [
    'duration',
    'courseDuration',
    'programmeDuration',
    'programDuration',
  ]);

  if (duration) {
    return duration;
  }

  const years = numberFrom(data, ['durationYears', 'years']);
  if (years !== null) {
    return `${years} year${years === 1 ? '' : 's'}`;
  }

  return 'Not specified';
}

function careerFieldFor(
  careerTitle: string,
  course: CourseRecord,
): FieldDefinition {
  const searchable = [
    careerTitle,
    course.title,
    course.facultyName,
    course.about,
  ].join(' ').toLowerCase();

  let best: FieldDefinition | null = null;
  let bestScore = 0;

  for (const definition of FIELD_DEFINITIONS) {
    const score = definition.keywords.reduce(
      (total, keyword) => total + (searchable.includes(keyword) ? 1 : 0),
      0,
    );

    if (score > bestScore) {
      best = definition;
      bestScore = score;
    }
  }

  return bestScore > 0 && best ? best : OTHER_FIELD;
}

function roleIcon(
  fieldId: string,
  careerTitle: string,
): keyof typeof Ionicons.glyphMap {
  const title = careerTitle.toLowerCase();

  if (title.includes('teacher') || title.includes('educator')) return 'school-outline';
  if (title.includes('doctor') || title.includes('nurse')) return 'medkit-outline';
  if (title.includes('lawyer') || title.includes('legal')) return 'document-text-outline';
  if (title.includes('account') || title.includes('finance')) return 'calculator-outline';
  if (title.includes('data')) return 'bar-chart-outline';
  if (title.includes('software') || title.includes('developer')) return 'laptop-outline';
  if (title.includes('engineer')) return 'construct-outline';
  if (title.includes('manager')) return 'briefcase-outline';
  if (title.includes('research') || title.includes('scientist')) return 'flask-outline';
  if (title.includes('designer') || title.includes('artist')) return 'brush-outline';

  return FIELD_DEFINITIONS.find((field) => field.id === fieldId)?.icon ??
    'compass-outline';
}

function roleDescription(
  careerTitle: string,
  courses: CourseRecord[],
): string {
  const facultyNames = Array.from(
    new Set(courses.map((course) => course.facultyName).filter(Boolean)),
  );

  const courseCount = courses.length;
  const context = facultyNames.length > 0
    ? ` across ${facultyNames.slice(0, 2).join(' and ')}${facultyNames.length > 2 ? ' and related areas' : ''}`
    : '';

  return `${careerTitle} is featured as a possible career outcome for ${courseCount} course${courseCount === 1 ? '' : 's'}${context} currently listed on Thuto-Bridge.`;
}

function buildCareerFields(courses: CourseRecord[]): Field[] {
  const roleMap = new Map<
    string,
    {
      title: string;
      field: FieldDefinition;
      courses: CourseRecord[];
    }
  >();

  for (const course of courses) {
    for (const rawCareer of course.careers) {
      const title = rawCareer.trim();
      if (!title) continue;

      const key = title.toLocaleLowerCase();
      const existing = roleMap.get(key);

      if (existing) {
        if (!existing.courses.some((item) => item.id === course.id)) {
          existing.courses.push(course);
        }
      } else {
        roleMap.set(key, {
          title,
          field: careerFieldFor(title, course),
          courses: [course],
        });
      }
    }
  }

  const fieldsMap = new Map<string, Field>();

  for (const { title, field, courses: relatedCourses } of roleMap.values()) {
    const institutions: Institution[] = relatedCourses.map((course) => ({
      courseId: course.id,
      institutionId: course.institutionId,
      facultyId: course.facultyId,
      facultyName: course.facultyName,
      name: course.institutionName,
      type: course.institutionType,
      programme: course.title,
      duration: course.duration,
      minPoints: course.points,
      minGrade: formatMinimumGrade(course.subjects),
      fee: course.fee,
      mode: course.mode,
      about: course.about,
      subjects: course.subjects,
    }));

    const uniqueInstitutionCount = new Set(
      institutions.map((item) => item.institutionId || item.name),
    ).size;

    const validPoints = institutions
      .map((item) => item.minPoints)
      .filter((value): value is number => value !== null);

    const role: Role = {
      id: slugify(title),
      title,
      description: roleDescription(title, relatedCourses),
      icon: roleIcon(field.id, title),
      institutions: institutions.sort((a, b) =>
        a.name.localeCompare(b.name) || a.programme.localeCompare(b.programme),
      ),
      institutionCount: uniqueInstitutionCount,
      courseCount: institutions.length,
      minimumPoints: validPoints.length > 0 ? Math.min(...validPoints) : null,
    };

    const existingField = fieldsMap.get(field.id);

    if (existingField) {
      existingField.roles.push(role);
    } else {
      fieldsMap.set(field.id, {
        id: field.id,
        label: field.label,
        icon: field.icon,
        color: field.color,
        bgColor: field.bgColor,
        tagline: field.tagline,
        roles: [role],
      });
    }
  }

  const fieldOrder = [
    ...FIELD_DEFINITIONS.map((field) => field.id),
    OTHER_FIELD.id,
  ];

  return Array.from(fieldsMap.values())
    .map((field) => ({
      ...field,
      roles: field.roles.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort(
      (a, b) =>
        fieldOrder.indexOf(a.id) - fieldOrder.indexOf(b.id),
    );
}

function parseInstitutionDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): InstitutionLookup {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    name: textFrom(data, [
      'name',
      'institutionName',
      'title',
    ], 'Institution'),
    type: normaliseInstitutionType(
      valueFrom(data, ['category', 'type', 'institutionType']),
    ),
  };
}

function parseFacultyDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): FacultyLookup {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    institutionId: textFrom(data, [
      'institutionId',
      'institution_id',
      'institution',
      'parentInstitutionId',
    ]),
    name: textFrom(data, [
      'name',
      'facultyName',
      'title',
    ], 'Faculty / Department'),
  };
}

function parseCourseDocument(
  snapshot: QueryDocumentSnapshot<DocumentData>,
  institutions: Map<string, InstitutionLookup>,
  faculties: Map<string, FacultyLookup>,
): CourseRecord | null {
  const data = snapshot.data();

  const careers = stringArrayFrom(data, [
    'careers',
    'careerPaths',
    'careerOpportunities',
    'possibleCareers',
  ]);

  if (careers.length === 0) {
    return null;
  }

  const facultyId = textFrom(data, [
    'facultyId',
    'faculty_id',
    'departmentId',
    'schoolId',
  ]);

  const faculty = facultyId ? faculties.get(facultyId) : undefined;

  const institutionId = textFrom(data, [
    'institutionId',
    'institution_id',
    'institution',
    'providerId',
  ], faculty?.institutionId ?? '');

  const institution = institutionId
    ? institutions.get(institutionId)
    : undefined;

  const institutionName = textFrom(data, [
    'institutionName',
    'providerName',
  ], institution?.name ?? 'Institution not specified');

  const institutionType = institution?.type ??
    normaliseInstitutionType(
      valueFrom(data, [
        'institutionType',
        'category',
        'providerType',
      ]),
    );

  return {
    id: snapshot.id,
    institutionId,
    facultyId,
    facultyName: textFrom(data, [
      'facultyName',
      'faculty',
      'departmentName',
      'schoolName',
    ], faculty?.name ?? 'Faculty / Department not specified'),
    institutionName,
    institutionType,
    title: textFrom(data, [
      'title',
      'name',
      'courseName',
      'programme',
      'programName',
    ], 'Untitled course'),
    duration: courseDuration(data),
    points: numberFrom(data, [
      'points',
      'requiredPoints',
      'minimumPoints',
      'minPoints',
    ]),
    fee: formatFee(data),
    mode: textFrom(data, [
      'mode',
      'studyMode',
      'deliveryMode',
    ], 'Not specified'),
    about: textFrom(data, [
      'about',
      'description',
      'summary',
    ], 'Course details are available from the institution.'),
    careers,
    subjects: subjectRequirementsFrom(data),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────────────────────

function typeStyle(type: InstType) {
  switch (type) {
    case 'University':
      return { bg: '#172554', text: '#60A5FA' };
    case 'College':
      return { bg: '#14532D', text: '#34D399' };
    case 'Brigade':
      return { bg: '#78350F', text: '#FBBF24' };
  }
}

function Chip({
  icon,
  label,
  tint,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  colors: any;
}) {
  const bg = tint ? `${tint}18` : colors.surfaceAlt;
  const borderColor = tint ? `${tint}33` : colors.border;
  const textColor = tint ?? colors.textSecondary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing(2),
        paddingVertical: spacing(1),
        backgroundColor: bg,
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor,
      }}
    >
      <Ionicons name={icon} size={10} color={textColor} />
      <Text style={{ fontSize: 10, fontWeight: '600', color: textColor }}>
        {label}
      </Text>
    </View>
  );
}

function NoticeCard({
  colors,
  compact = false,
}: {
  colors: any;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing(3),
        padding: compact ? spacing(4) : spacing(5),
        marginBottom: spacing(6),
        backgroundColor: `${colors.warning}12`,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: `${colors.warning}35`,
        borderLeftWidth: 4,
        borderLeftColor: colors.warning,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radii.pill,
          backgroundColor: `${colors.warning}20`,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.warning}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.bodyStrong,
            { color: colors.textPrimary, marginBottom: spacing(1) },
          ]}
        >
          {t('Featured course-linked careers')}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: colors.textSecondary, lineHeight: 19 },
          ]}
        >
          {t('This explorer does not represent every career available in Botswana or worldwide. It displays careers currently connected to courses listed on Thuto-Bridge. Career options may expand as more institutions and programmes are added.')}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile loading experience — a skeleton grid + slow-connection notice
// instead of a blank blocking spinner. Skeleton screens read as "already
// working" rather than "frozen", which matters most exactly where load
// times are longest: mobile.
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonBlock({
  width,
  height,
  colors,
  style,
}: {
  width: number | string;
  height: number;
  colors: any;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radii.md, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

function CareerFieldsSkeleton({
  colors,
  columns,
}: {
  colors: any;
  columns: number;
}) {
  const count = columns * 3;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing(2) }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{ width: `${100 / columns}%`, paddingHorizontal: spacing(2), marginBottom: spacing(4) }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing(5),
              alignItems: 'center',
            }}
          >
            <SkeletonBlock width={56} height={56} colors={colors} style={{ borderRadius: 9999, marginBottom: spacing(3) }} />
            <SkeletonBlock width="80%" height={12} colors={colors} style={{ marginBottom: spacing(2) }} />
            <SkeletonBlock width={64} height={16} colors={colors} style={{ borderRadius: radii.pill }} />
          </View>
        </View>
      ))}
    </View>
  );
}

function SlowLoadBanner({ colors }: { colors: any }) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SLOW_LOAD_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(3),
        backgroundColor: `${colors.warning}14`,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: `${colors.warning}33`,
        marginBottom: spacing(5),
      }}
    >
      <Ionicons name="wifi-outline" size={16} color={colors.warning} />
      <Text style={[typography.caption, { color: colors.warning, flex: 1, fontWeight: '600' }]}>
        {t('Slow connection detected — still loading…')}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Course detail bottom-sheet modal
// ─────────────────────────────────────────────────────────────────────────────

function InstModal({
  inst,
  visible,
  onClose,
  colors,
  isMobile,
}: {
  inst: Institution | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
  isMobile: boolean;
}) {
  const { t } = useLanguage();
  if (!inst) return null;

  const typeColors = typeStyle(inst.type);

  const openCourse = () => {
    onClose();
    router.push({
      pathname: '/student/course-details',
      params: { id: inst.courseId },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: isMobile ? 'flex-end' : 'center',
          alignItems: 'center',
          padding: isMobile ? 0 : spacing(5),
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            width: isMobile ? '100%' : '92%',
            maxWidth: 560,
            maxHeight: isMobile ? '92%' : '90%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            borderBottomLeftRadius: isMobile ? 0 : radii.xxl,
            borderBottomRightRadius: isMobile ? 0 : radii.xxl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
            paddingBottom: isMobile ? spacing(8) : 0,
          }}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={{ height: 3, backgroundColor: colors.primary }} />

          {isMobile && (
            <View style={{ alignItems: 'center', paddingTop: spacing(3) }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.border,
                }}
              />
            </View>
          )}

          <View style={{ padding: spacing(6) }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: spacing(5),
              }}
            >
              <View style={{ flex: 1, paddingRight: spacing(3) }}>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing(2),
                    marginBottom: spacing(2),
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: spacing(3),
                      paddingVertical: spacing(1),
                      backgroundColor: typeColors.bg,
                      borderRadius: radii.pill,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: typeColors.text,
                        letterSpacing: 0.5,
                      }}
                    >
                      {inst.type.toUpperCase()}
                    </Text>
                  </View>

                  {inst.mode !== 'Not specified' && (
                    <View
                      style={{
                        paddingHorizontal: spacing(3),
                        paddingVertical: spacing(1),
                        backgroundColor: colors.surfaceAlt,
                        borderRadius: radii.pill,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: colors.textSecondary,
                        }}
                      >
                        {inst.mode.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[typography.h2, { color: colors.textPrimary }]}>
                  {inst.name}
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.primary, marginTop: spacing(1) },
                  ]}
                >
                  {inst.programme}
                </Text>

                <Text
                  style={[
                    typography.caption,
                    { color: colors.textMuted, marginTop: spacing(2) },
                  ]}
                >
                  {inst.facultyName}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: radii.pill,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing(3),
                marginBottom: spacing(5),
              }}
            >
              {[
                {
                  label: t('Duration'),
                  value: inst.duration,
                  icon: 'time-outline' as const,
                },
                {
                  label: t('Min Points'),
                  value: inst.minPoints !== null
                    ? `${inst.minPoints} pts`
                    : 'Not specified',
                  icon: 'star-outline' as const,
                },
                {
                  label: t('Entry Subjects'),
                  value: inst.minGrade,
                  icon: 'ribbon-outline' as const,
                },
                {
                  label: t('Annual Fee'),
                  value: inst.fee,
                  icon: 'card-outline' as const,
                },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    minWidth: isMobile ? 135 : 190,
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing(4),
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2),
                      marginBottom: spacing(2),
                    }}
                  >
                    <Ionicons
                      name={stat.icon}
                      size={12}
                      color={colors.textMuted}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          letterSpacing: 0.4,
                          fontSize: 10,
                        },
                      ]}
                    >
                      {stat.label.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.bodyStrong,
                      { color: colors.textPrimary, fontSize: 12 },
                    ]}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing(3),
                padding: spacing(4),
                backgroundColor: `${colors.primary}12`,
                borderRadius: radii.lg,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.primary}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.textSecondary,
                    flex: 1,
                    lineHeight: 18,
                  },
                ]}
                numberOfLines={5}
              >
                {inst.about}
              </Text>
            </View>

            <Pressable
              onPress={openCourse}
              style={({ pressed }) => ({
                marginTop: spacing(5),
                height: 54,
                borderRadius: radii.lg,
                backgroundColor: colors.primary,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing(2),
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Ionicons name="book-outline" size={18} color="#fff" />
              <Text
                style={[
                  typography.label,
                  { color: '#fff', letterSpacing: 0.3 },
                ]}
              >
                View Full Course
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Detail view for a selected career
// ─────────────────────────────────────────────────────────────────────────────

function DetailView({
  field,
  role,
  colors,
  isMobile,
  saved,
  onSave,
  onBack,
}: {
  field: Field;
  role: Role;
  colors: any;
  isMobile: boolean;
  saved: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <View>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          alignSelf: 'flex-start',
          marginBottom: spacing(5),
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(2),
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="arrow-back" size={16} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>
          Back to {field.label}
        </Text>
      </Pressable>

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing(5),
        }}
      >
        <View style={{ height: 4, backgroundColor: field.color }} />

        <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing(4),
              marginBottom: spacing(4),
            }}
          >
            <View
              style={{
                width: isMobile ? 52 : 64,
                height: isMobile ? 52 : 64,
                borderRadius: radii.xl,
                backgroundColor: `${field.color}22`,
                borderWidth: 1,
                borderColor: `${field.color}44`,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Ionicons
                name={role.icon}
                size={isMobile ? 24 : 30}
                color={field.color}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  typography.caption,
                  {
                    color: field.color,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                    marginBottom: spacing(1),
                  },
                ]}
              >
                {t(field.label).toUpperCase()}
              </Text>
              <Text
                style={{
                  fontSize: isMobile ? 22 : 28,
                  fontWeight: '900',
                  color: colors.textPrimary,
                  lineHeight: isMobile ? 28 : 34,
                }}
              >
                {role.title}
              </Text>
            </View>

            <Pressable
              onPress={onSave}
              accessibilityRole="button"
              accessibilityLabel={saved ? `${role.title}: ${t('Saved')}` : `${t('Save Career')}: ${role.title}`}
              style={({ pressed }) => ({
                minWidth: isMobile ? 48 : 132,
                height: 48,
                paddingHorizontal: isMobile ? spacing(3) : spacing(4),
                borderRadius: radii.lg,
                backgroundColor: saved ? `${colors.success}18` : `${field.color}18`,
                borderWidth: 1,
                borderColor: saved ? `${colors.success}55` : `${field.color}55`,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing(2),
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={saved ? colors.success : field.color}
              />
              {!isMobile && (
                <Text style={[typography.label, { color: saved ? colors.success : field.color }]}>
                  {saved ? t('Saved') : t('Save Career')}
                </Text>
              )}
            </Pressable>
          </View>

          <Text
            style={[
              typography.body,
              {
                color: colors.textSecondary,
                lineHeight: 24,
                marginBottom: spacing(5),
              },
            ]}
          >
            {role.description}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing(3),
            }}
          >
            {[
              {
                label: t('Related Courses'),
                value: `${role.courseCount}`,
                icon: 'book-outline' as const,
                tint: colors.primary,
              },
              {
                label: t('Institutions'),
                value: `${role.institutionCount}`,
                icon: 'school-outline' as const,
                tint: colors.success,
              },
              {
                label: t('Starting Points'),
                value: role.minimumPoints !== null
                  ? `From ${role.minimumPoints}`
                  : 'Varies',
                icon: 'star-outline' as const,
                tint: colors.warning,
              },
              {
                label: t('Source'),
                value: t('Firestore courses'),
                icon: 'cloud-done-outline' as const,
                tint: field.color,
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  minWidth: isMobile ? 140 : 160,
                  backgroundColor: `${stat.tint}0F`,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: `${stat.tint}30`,
                  padding: spacing(4),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing(2),
                    marginBottom: spacing(2),
                  }}
                >
                  <Ionicons name={stat.icon} size={12} color={stat.tint} />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textMuted,
                        letterSpacing: 0.4,
                        fontSize: 10,
                      },
                    ]}
                  >
                    {stat.label.toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.bodyStrong,
                    {
                      color: stat.tint,
                      fontSize: isMobile ? 12 : 13,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <NoticeCard colors={colors} compact />

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View style={{ height: 3, backgroundColor: colors.primary }} />

        <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
          <Text
            style={[
              typography.caption,
              {
                color: colors.textMuted,
                letterSpacing: 0.5,
                marginBottom: spacing(2),
              },
            ]}
          >
            RELATED PROGRAMMES
          </Text>
          <Text
            style={[
              typography.h2,
              { color: colors.textPrimary, marginBottom: spacing(5) },
            ]}
          >
            Courses That Can Lead Here
          </Text>

          <View style={{ gap: spacing(4) }}>
            {role.institutions.map((institution) => {
              const typeColors = typeStyle(institution.type);

              return (
                <Pressable
                  key={`${institution.courseId}-${institution.institutionId}`}
                  onPress={() => {
                    setSelectedInstitution(institution);
                    setShowModal(true);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radii.xl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing(5),
                    opacity: pressed ? 0.88 : 1,
                    transform: pressed ? [{ scale: 0.99 }] : [],
                    ...Platform.select({
                      web: { cursor: 'pointer' } as any,
                    }),
                  })}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: spacing(3),
                      marginBottom: spacing(3),
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          flexWrap: 'wrap',
                          gap: spacing(2),
                          marginBottom: spacing(2),
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: spacing(2),
                            paddingVertical: 2,
                            backgroundColor: typeColors.bg,
                            borderRadius: radii.pill,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: '800',
                              color: typeColors.text,
                              letterSpacing: 0.5,
                            }}
                          >
                            {institution.type.toUpperCase()}
                          </Text>
                        </View>

                        {institution.mode !== 'Not specified' && (
                          <View
                            style={{
                              paddingHorizontal: spacing(2),
                              paddingVertical: 2,
                              backgroundColor: colors.surface,
                              borderRadius: radii.pill,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: '700',
                                color: colors.textMuted,
                              }}
                            >
                              {institution.mode.toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          typography.bodyStrong,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {institution.name}
                      </Text>

                      <Text
                        style={[
                          typography.caption,
                          {
                            color: colors.primary,
                            marginTop: spacing(1),
                            lineHeight: 18,
                          },
                        ]}
                      >
                        {institution.programme}
                      </Text>

                      <Text
                        style={[
                          typography.caption,
                          {
                            color: colors.textMuted,
                            marginTop: spacing(1),
                            fontSize: 10,
                          },
                        ]}
                      >
                        {institution.facultyName}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: `${colors.primary}18`,
                        borderRadius: radii.lg,
                        padding: spacing(2),
                      }}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.primary}
                      />
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: spacing(2),
                    }}
                  >
                    <Chip
                      icon="time-outline"
                      label={institution.duration}
                      colors={colors}
                    />
                    <Chip
                      icon="star-outline"
                      label={
                        institution.minPoints !== null
                          ? `Min. ${institution.minPoints} pts`
                          : 'Points vary'
                      }
                      colors={colors}
                    />
                    <Chip
                      icon="card-outline"
                      label={institution.fee}
                      colors={colors}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.push('/student/enter-results')}
            style={({ pressed }) => ({
              marginTop: spacing(6),
              height: isMobile ? 60 : 56,
              borderRadius: radii.xl,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing(3),
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="calculator-outline" size={20} color="#fff" />
            <Text
              style={[
                typography.label,
                {
                  color: '#fff',
                  letterSpacing: 0.6,
                  fontSize: 14,
                },
              ]}
            >
              CALCULATE MY ELIGIBILITY
            </Text>
          </Pressable>
        </View>
      </View>

      <InstModal
        inst={selectedInstitution}
        visible={showModal}
        onClose={() => setShowModal(false)}
        colors={colors}
        isMobile={isMobile}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Careers list for a field
// ─────────────────────────────────────────────────────────────────────────────

function RolesView({
  field,
  colors,
  isMobile,
  onBack,
  onSelect,
}: {
  field: Field;
  colors: any;
  isMobile: boolean;
  onBack: () => void;
  onSelect: (role: Role) => void;
}) {
  const { t } = useLanguage();
  return (
    <View>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          alignSelf: 'flex-start',
          marginBottom: spacing(5),
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(2),
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="arrow-back" size={16} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>
          All Fields
        </Text>
      </Pressable>

      <View
        style={{
          backgroundColor: field.bgColor,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: `${field.color}33`,
          padding: isMobile ? spacing(5) : spacing(7),
          marginBottom: spacing(5),
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(4),
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: radii.xl,
              backgroundColor: `${field.color}22`,
              borderWidth: 2,
              borderColor: `${field.color}55`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={field.icon} size={28} color={field.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: isMobile ? 22 : 28,
                fontWeight: '900',
                color: '#fff',
                lineHeight: isMobile ? 28 : 34,
              }}
            >
              {field.label}
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: `${field.color}CC`,
                  marginTop: spacing(1),
                },
              ]}
            >
              {t(field.tagline)}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: spacing(4) }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2),
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: `${field.color}44`,
            }}
          >
            <Text
              style={[
                typography.caption,
                { color: field.color, fontWeight: '700' },
              ]}
            >
              {field.roles.length} course-linked career
              {field.roles.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>
      </View>

      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            letterSpacing: 0.5,
            marginBottom: spacing(4),
          },
        ]}
      >
        SELECT A CAREER TO EXPLORE
      </Text>

      <View style={{ gap: spacing(3) }}>
        {field.roles.map((role) => (
          <Pressable
            key={role.id}
            onPress={() => onSelect(role)}
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              opacity: pressed ? 0.9 : 1,
              transform: pressed ? [{ scale: 0.99 }] : [],
              ...Platform.select({
                web: { cursor: 'pointer' } as any,
              }),
            })}
          >
            <View
              style={{
                height: 2,
                backgroundColor: field.color,
                opacity: 0.6,
              }}
            />

            <View
              style={{
                padding: isMobile ? spacing(4) : spacing(5),
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(4),
              }}
            >
              <View
                style={{
                  width: isMobile ? 48 : 56,
                  height: isMobile ? 48 : 56,
                  borderRadius: radii.xl,
                  backgroundColor: `${field.color}18`,
                  borderWidth: 1,
                  borderColor: `${field.color}33`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ionicons
                  name={role.icon}
                  size={isMobile ? 22 : 26}
                  color={field.color}
                />
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    typography.bodyStrong,
                    {
                      color: colors.textPrimary,
                      fontSize: isMobile ? 15 : 16,
                    },
                  ]}
                >
                  {role.title}
                </Text>

                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textSecondary,
                      marginTop: spacing(1),
                      lineHeight: 17,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {role.description}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing(2),
                    marginTop: spacing(2),
                  }}
                >
                  <Chip
                    icon="book-outline"
                    label={`${role.courseCount} course${role.courseCount === 1 ? '' : 's'}`}
                    tint={field.color}
                    colors={colors}
                  />
                  <Chip
                    icon="school-outline"
                    label={`${role.institutionCount} institution${role.institutionCount === 1 ? '' : 's'}`}
                    colors={colors}
                  />
                  <Chip
                    icon="star-outline"
                    label={
                      role.minimumPoints !== null
                        ? `From ${role.minimumPoints} pts`
                        : 'Points vary'
                    }
                    colors={colors}
                  />
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
                style={{ flexShrink: 0 }}
              />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Fields grid with search
// ─────────────────────────────────────────────────────────────────────────────

function FieldsView({
  fields,
  colors,
  isMobile,
  isTablet,
  query,
  onQuery,
  onSelect,
}: {
  fields: Field[];
  colors: any;
  isMobile: boolean;
  isTablet: boolean;
  query: string;
  onQuery: (query: string) => void;
  onSelect: (field: Field) => void;
}) {
  const { t } = useLanguage();
  const filtered = useMemo(() => {
    if (!query.trim()) return fields;

    const search = query.trim().toLowerCase();

    return fields
      .map((field) => ({
        ...field,
        roles: field.roles.filter(
          (role) =>
            role.title.toLowerCase().includes(search) ||
            role.description.toLowerCase().includes(search) ||
            role.institutions.some(
              (institution) =>
                institution.programme.toLowerCase().includes(search) ||
                institution.name.toLowerCase().includes(search) ||
                institution.facultyName.toLowerCase().includes(search),
            ),
        ),
      }))
      .filter(
        (field) =>
          field.label.toLowerCase().includes(search) ||
          field.roles.length > 0,
      );
  }, [fields, query]);

  const columns = isMobile ? 2 : isTablet ? 3 : 4;
  const totalRoles = fields.reduce(
    (sum, field) => sum + field.roles.length,
    0,
  );
  const totalProgrammes = fields.reduce(
    (sum, field) =>
      sum + field.roles.reduce(
        (roleSum, role) => roleSum + role.courseCount,
        0,
      ),
    0,
  );

  return (
    <View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing(6),
        }}
      >
        <View style={{ height: 3, backgroundColor: colors.warning }} />

        <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2),
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2),
              backgroundColor: `${colors.warning}22`,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: `${colors.warning}44`,
              marginBottom: spacing(4),
            }}
          >
            <Ionicons
              name="compass-outline"
              size={12}
              color={colors.warning}
            />
            <Text
              style={[
                typography.caption,
                {
                  color: colors.warning,
                  fontWeight: '700',
                  letterSpacing: 0.5,
                },
              ]}
            >
              CAREER EXPLORER
            </Text>
          </View>

          <Text
            style={{
              fontSize: isMobile ? 24 : 34,
              fontWeight: '900',
              color: colors.textPrimary,
              lineHeight: isMobile ? 30 : 40,
            }}
          >
            {'Discover Your\nCareer Path'}
          </Text>

          <Text
            style={[
              typography.body,
              {
                color: colors.textSecondary,
                marginTop: spacing(3),
                lineHeight: 24,
                maxWidth: 580,
              },
            ]}
          >
            Explore career outcomes drawn directly from courses currently
            available on Thuto-Bridge, then see the institutions and programmes
            connected to each pathway.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing(3),
              marginTop: spacing(5),
            }}
          >
            {[
              {
                icon: 'grid-outline' as const,
                label: 'Career Fields',
                value: `${fields.length}`,
              },
              {
                icon: 'person-outline' as const,
                label: 'Featured Careers',
                value: `${totalRoles}`,
              },
              {
                icon: 'school-outline' as const,
                label: 'Course Links',
                value: `${totalProgrammes}`,
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  minWidth: isMobile ? 82 : 140,
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing(3),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(2),
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: radii.md,
                    backgroundColor: `${colors.warning}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name={stat.icon}
                    size={12}
                    color={colors.warning}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.textMuted, fontSize: 10 },
                    ]}
                    numberOfLines={1}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    style={[
                      typography.label,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {stat.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <NoticeCard colors={colors} />

      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          marginBottom: spacing(6),
          height: 52,
        }}
      >
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQuery}
          placeholder="Search careers, fields, courses or institutions…"
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            {
              flex: 1,
              color: colors.textPrimary,
              marginLeft: spacing(3),
              minWidth: 0,
            },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {query.length > 0 && (
          <Pressable onPress={() => onQuery('')} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>

      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            letterSpacing: 0.5,
            marginBottom: spacing(4),
          },
        ]}
      >
        {filtered.length === fields.length && !query.trim()
          ? 'ALL CAREER FIELDS'
          : `${filtered.length} FIELD${filtered.length === 1 ? '' : 'S'} FOUND`}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -spacing(2),
        }}
      >
        {filtered.map((field) => (
          <View
            key={field.id}
            style={{
              width: `${100 / columns}%`,
              paddingHorizontal: spacing(2),
              marginBottom: spacing(4),
            }}
          >
            <Pressable
              onPress={() => onSelect(field)}
              style={({ pressed }) => ({
                backgroundColor: colors.surface,
                borderRadius: radii.xxl,
                borderWidth: 1.5,
                borderColor: `${field.color}33`,
                overflow: 'hidden',
                opacity: pressed ? 0.88 : 1,
                transform: pressed ? [{ scale: 0.97 }] : [],
                ...Platform.select({
                  web: {
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  } as any,
                }),
              })}
            >
              <View style={{ height: 3, backgroundColor: field.color }} />

              <View
                style={{
                  padding: isMobile ? spacing(4) : spacing(5),
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: isMobile ? 52 : 64,
                    height: isMobile ? 52 : 64,
                    borderRadius: 9999,
                    backgroundColor: field.bgColor,
                    borderWidth: 2,
                    borderColor: `${field.color}44`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing(3),
                  }}
                >
                  <Ionicons
                    name={field.icon}
                    size={isMobile ? 22 : 28}
                    color={field.color}
                  />
                </View>

                <Text
                  style={[
                    typography.label,
                    {
                      color: colors.textPrimary,
                      textAlign: 'center',
                      fontSize: isMobile ? 11 : 13,
                      lineHeight: isMobile ? 16 : 18,
                      marginBottom: spacing(2),
                    },
                  ]}
                  numberOfLines={2}
                >
                  {field.label}
                </Text>

                <View
                  style={{
                    paddingHorizontal: spacing(2),
                    paddingVertical: 2,
                    backgroundColor: `${field.color}18`,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: `${field.color}33`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: field.color,
                    }}
                  >
                    {field.roles.length} career
                    {field.roles.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </View>

      {filtered.length === 0 && (
        <View style={{ alignItems: 'center', padding: spacing(10) }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing(4),
            }}
          >
            <Ionicons
              name="search-outline"
              size={28}
              color={colors.textMuted}
            />
          </View>

          <Text
            style={[
              typography.bodyStrong,
              {
                color: colors.textSecondary,
                textAlign: 'center',
              },
            ]}
          >
            No course-linked careers found for “{query}”
          </Text>

          <Pressable
            onPress={() => onQuery('')}
            style={{ marginTop: spacing(3) }}
          >
            <Text style={[typography.label, { color: colors.primary }]}>
              Clear search
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading and error states
// ─────────────────────────────────────────────────────────────────────────────

function StateCard({
  colors,
  icon,
  title,
  message,
  actionLabel,
  onAction,
  loading = false,
}: {
  colors: any;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        padding: spacing(9),
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: `${colors.primary}16`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing(5),
        }}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={30} color={colors.primary} />
        )}
      </View>

      <Text
        style={[
          typography.h2,
          {
            color: colors.textPrimary,
            textAlign: 'center',
            marginBottom: spacing(2),
          },
        ]}
      >
        {t(title)}
      </Text>

      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 23,
            maxWidth: 520,
          },
        ]}
      >
        {t(message)}
      </Text>

      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            marginTop: spacing(5),
            minHeight: 48,
            paddingHorizontal: spacing(6),
            borderRadius: radii.lg,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing(2),
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={[typography.label, { color: '#fff' }]}>
            {t(actionLabel)}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────

function StepIndicator({
  step,
  field,
  role,
  colors,
  isMobile,
}: {
  step: View3;
  field: Field | null;
  role: Role | null;
  colors: any;
  isMobile: boolean;
}) {
  const { t } = useLanguage();
  const steps = [
    {
      key: 'fields',
      label: 'Field',
      icon: 'grid-outline' as const,
    },
    {
      key: 'roles',
      label: 'Career',
      icon: 'person-outline' as const,
    },
    {
      key: 'detail',
      label: 'Study',
      icon: 'school-outline' as const,
    },
  ];

  const activeIndex = steps.findIndex((item) => item.key === step);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing(4),
        marginBottom: spacing(6),
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {steps.map((item, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        const stepColor = active
          ? colors.primary
          : done
            ? colors.success
            : colors.textMuted;

        return (
          <React.Fragment key={item.key}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: isMobile ? 32 : 36,
                  height: isMobile ? 32 : 36,
                  borderRadius: 18,
                  backgroundColor: active
                    ? `${colors.primary}22`
                    : done
                      ? `${colors.success}22`
                      : colors.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: active
                    ? colors.primary
                    : done
                      ? colors.success
                      : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing(1),
                }}
              >
                {done ? (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={colors.success}
                  />
                ) : (
                  <Ionicons
                    name={item.icon}
                    size={isMobile ? 13 : 15}
                    color={stepColor}
                  />
                )}
              </View>

              <Text
                style={[
                  typography.caption,
                  {
                    color: stepColor,
                    fontWeight: active ? '700' : '500',
                    fontSize: isMobile ? 9 : 11,
                  },
                ]}
                numberOfLines={1}
              >
                {active && field && item.key === 'roles'
                  ? field.label.split(' ')[0]
                  : active && role && item.key === 'detail'
                    ? role.title.split(' ')[0]
                    : item.label}
              </Text>
            </View>

            {index < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 1.5,
                  backgroundColor:
                    index < activeIndex ? colors.success : colors.border,
                  marginBottom: spacing(4),
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen root
// ─────────────────────────────────────────────────────────────────────────────

function CareerContent() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const colors = useTheme();

  const params = useLocalSearchParams<{
    careerId?: string | string[];
    roleId?: string | string[];
    fieldId?: string | string[];
    title?: string | string[];
    view?: string | string[];
  }>();

  const routeCareerId =
    typeof params.careerId === 'string'
      ? params.careerId
      : typeof params.roleId === 'string'
        ? params.roleId
        : '';

  const routeFieldId =
    typeof params.fieldId === 'string' ? params.fieldId : '';

  const routeCareerTitle =
    typeof params.title === 'string' ? params.title : '';

  const shouldOpenSavedCareer =
    params.view === 'detail' || Boolean(routeCareerId || routeCareerTitle);

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  const [viewState, setViewState] = useState<View3>('fields');
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [query, setQuery] = useState('');

  const [fields, setFields] = useState<Field[]>([]);
  const [savedCareerIds, setSavedCareerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Background hydration state — tracks whether we're still paging through
  // the courses collection after an initial fast paint, and whether that
  // background pass failed partway through (non-fatal: whatever data made
  // it into `fields` stays on screen either way).
  const [hydrating, setHydrating] = useState(false);
  const [hydrationIncomplete, setHydrationIncomplete] = useState(false);
  const [mobileHasMore, setMobileHasMore] = useState(false);
  const [loadingMoreMobile, setLoadingMoreMobile] = useState(false);

  // Guards against a stale background hydration loop writing state after
  // the screen has unmounted, or after a newer load has superseded it
  // (e.g. user tapped refresh mid-hydration).
  const mountedRef = useRef(true);
  const bgTokenRef = useRef(0);
  const openedRouteKeyRef = useRef('');
  const mobileCoursesRef = useRef<CourseRecord[]>([]);
  const mobileCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const mobileInstitutionLookupRef = useRef<Map<string, InstitutionLookup>>(new Map());
  const mobileFacultyLookupRef = useRef<Map<string, FacultyLookup>>(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setSavedCareerIds(new Set());
        return;
      }

      try {
        const records = await getSavedItems();
        setSavedCareerIds(
          new Set(
            records
              .filter((item) => item.type === 'career')
              .map((item) => item.id),
          ),
        );
      } catch (error) {
        console.warn('Could not read saved careers:', error);
      }
    });

    return unsubscribe;
  }, []);

  // ── Data loading ──────────────────────────────────────────────────────────
  // Institutions and faculties are small, bounded collections, so they're
  // always fetched in full — same reasoning as courses.tsx.
  //
  // Courses is the large, unbounded collection. On a cold start (no usable
  // cache) we fetch one small page, build the field/career taxonomy from it,
  // and paint immediately — then keep paging the rest of the collection in
  // the background, merging results into `fields` and yielding to the UI
  // thread between pages. This is what actually fixes the mobile "hangs
  // forever" problem: the old version awaited the ENTIRE courses collection
  // before rendering anything at all.
  //
  // On a warm refresh (the person already has cached data on screen), a
  // progressive partial paint would only make the list briefly shrink, so
  // that path still fetches courses in one shot and swaps the result in once.
  const loadCareerData = useCallback(async (showBlockingLoader = false) => {
    if (showBlockingLoader) {
      setLoading(true);
    }
    setLoadError('');
    setHydrationIncomplete(false);
    const myToken = ++bgTokenRef.current;

    try {
      // Do not wrap these reads in a short Promise.race timeout. On React Native,
      // Firestore may briefly restart its transport and still complete normally.
      // A custom timeout rejects the screen while the real reads continue in the
      // background, which produces the misleading `firestore_timeout` error.
      const [institutionSnapshot, facultySnapshot] = await Promise.all([
        safeDocs(collection(db, 'institutions')),
        safeDocs(collection(db, 'faculties')),
      ]);
      if (!mountedRef.current || bgTokenRef.current !== myToken) return;

      const institutionLookup = new Map<string, InstitutionLookup>();
      institutionSnapshot.docs.forEach((document) => {
        const institution = parseInstitutionDocument(document);
        institutionLookup.set(institution.id, institution);
      });

      const facultyLookup = new Map<string, FacultyLookup>();
      facultySnapshot.docs.forEach((document) => {
        const faculty = parseFacultyDocument(document);
        facultyLookup.set(faculty.id, faculty);
      });

      mobileInstitutionLookupRef.current = institutionLookup;
      mobileFacultyLookupRef.current = facultyLookup;

      if (IS_NATIVE_MOBILE) {
        const firstSnap = await safeDocs(
          firestoreQuery(
            collection(db, 'courses'),
            firestoreLimit(CAREER_INITIAL_COURSE_BATCH),
          ),
        );
        if (!mountedRef.current || bgTokenRef.current !== myToken) return;

        const firstCourses = firstSnap.docs
          .map((document) =>
            parseCourseDocument(document, institutionLookup, facultyLookup),
          )
          .filter((course): course is CourseRecord => course !== null);

        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });

        mobileCoursesRef.current = firstCourses;
        mobileCursorRef.current =
          firstSnap.docs[firstSnap.docs.length - 1] ?? null;
        setMobileHasMore(
          firstSnap.docs.length === CAREER_INITIAL_COURSE_BATCH,
        );

        const generatedFields = buildCareerFields(firstCourses);
        if (!mountedRef.current || bgTokenRef.current !== myToken) return;

        setFields(generatedFields);
        setLoading(false);
        setHydrating(false);
        setHydrationIncomplete(false);
        setViewState('fields');
        setActiveField(null);
        setActiveRole(null);
        return;
      }

      if (showBlockingLoader) {
        // ── WEB COLD START: paginate courses and hydrate in background ──
        const firstSnap = await safeDocs(
          firestoreQuery(collection(db, 'courses'), firestoreLimit(CAREER_INITIAL_COURSE_BATCH)),
        );
        if (!mountedRef.current || bgTokenRef.current !== myToken) return;

        const collected: CourseRecord[] = firstSnap.docs
          .map((document) => parseCourseDocument(document, institutionLookup, facultyLookup))
          .filter((course): course is CourseRecord => course !== null);

        // Yield to the UI thread once before the CPU-heavy pass below, so
        // any in-flight navigation animation has settled before the
        // synchronous keyword-matching work runs.
        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });

        let generatedFields = buildCareerFields(collected);
        if (!mountedRef.current || bgTokenRef.current !== myToken) return;

        setFields(generatedFields);
        setLoading(false);
        setViewState('fields');
        setActiveField(null);
        setActiveRole(null);

        let cursor = firstSnap.docs[firstSnap.docs.length - 1];
        let hasMore = firstSnap.docs.length === CAREER_INITIAL_COURSE_BATCH;

        if (hasMore) {
          setHydrating(true);
          try {
            while (hasMore && mountedRef.current && bgTokenRef.current === myToken) {
              // Small pause between pages so the batch loop doesn't
              // monopolize Hermes on lower-end phones.
              await new Promise((resolve) => setTimeout(resolve, CAREER_BATCH_YIELD_MS));

              const nextSnap = await safeDocs(
                firestoreQuery(
                  collection(db, 'courses'),
                  firestoreStartAfter(cursor),
                  firestoreLimit(CAREER_BACKGROUND_COURSE_BATCH),
                ),
              );
              if (!mountedRef.current || bgTokenRef.current !== myToken) return;

              if (nextSnap.docs.length === 0) {
                hasMore = false;
                break;
              }

              const nextCourses = nextSnap.docs
                .map((document) => parseCourseDocument(document, institutionLookup, facultyLookup))
                .filter((course): course is CourseRecord => course !== null);

              collected.push(...nextCourses);
              cursor = nextSnap.docs[nextSnap.docs.length - 1];
              hasMore = nextSnap.docs.length === CAREER_BACKGROUND_COURSE_BATCH;

              await new Promise<void>((resolve) => {
                InteractionManager.runAfterInteractions(() => resolve());
              });

              generatedFields = buildCareerFields(collected);
              if (!mountedRef.current || bgTokenRef.current !== myToken) return;
              setFields(generatedFields);
            }
          } catch (hydrationError) {
            console.warn('Career explorer background sync incomplete:', hydrationError);
            if (mountedRef.current && bgTokenRef.current === myToken) {
              setHydrationIncomplete(true);
            }
          } finally {
            if (mountedRef.current && bgTokenRef.current === myToken) {
              setHydrating(false);
            }
          }
        }

        // Caching is best-effort. A failure here should never surface as a
        // load error — the user already has working, correct data on screen.
        try {
          const cachePayload: CareerCachePayload = {
            savedAt: Date.now(),
            fields: generatedFields,
          };
          if (!IS_NATIVE_MOBILE) {
            await AsyncStorage.setItem(CAREER_CACHE_KEY, JSON.stringify(cachePayload));
          }
        } catch (cacheWriteError) {
          console.warn('Career cache could not be saved:', cacheWriteError);
        }
      } else {
        // ── WARM REFRESH: cache already on screen, swap in one shot ──
        const courseSnapshot = await safeDocs(collection(db, 'courses'));
        if (!mountedRef.current || bgTokenRef.current !== myToken) return;

        const courses = courseSnapshot.docs
          .map((document) => parseCourseDocument(document, institutionLookup, facultyLookup))
          .filter((course): course is CourseRecord => course !== null);

        await new Promise<void>((resolve) => {
          InteractionManager.runAfterInteractions(() => resolve());
        });

        const generatedFields = buildCareerFields(courses);
        if (!mountedRef.current || bgTokenRef.current !== myToken) return;
        setFields(generatedFields);

        try {
          const cachePayload: CareerCachePayload = {
            savedAt: Date.now(),
            fields: generatedFields,
          };
          if (!IS_NATIVE_MOBILE) {
            await AsyncStorage.setItem(CAREER_CACHE_KEY, JSON.stringify(cachePayload));
          }
        } catch (cacheWriteError) {
          console.warn('Career cache could not be saved:', cacheWriteError);
        }
      }
    } catch (error) {
      console.error('Failed to load Career Explorer data:', error);

      const message = getFriendlyErrorMessage(error);

      // Keep cached or partially loaded data visible if it exists.
      if (showBlockingLoader) {
        setLoadError(message);
      }
    } finally {
      if (showBlockingLoader && mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initialiseCareerExplorer = async () => {
      if (IS_NATIVE_MOBILE) {
        // The old cache can be several megabytes and is stored in SQLite on
        // native platforms. Remove it once and use memory-only pagination.
        try {
          await AsyncStorage.removeItem(CAREER_CACHE_KEY);
        } catch {
          // Cache cleanup is best-effort.
        }

        if (active) {
          void loadCareerData(true);
        }
        return;
      }

      let cacheIsUsable = false;

      try {
        const cachedValue = await AsyncStorage.getItem(CAREER_CACHE_KEY);

        if (cachedValue && active) {
          const cached = JSON.parse(cachedValue) as CareerCachePayload;
          cacheIsUsable =
            Array.isArray(cached.fields) &&
            cached.fields.length > 0 &&
            Date.now() - cached.savedAt <= CAREER_CACHE_MAX_AGE_MS;

          if (cacheIsUsable) {
            setFields(cached.fields);
            setLoading(false);
          }
        }
      } catch (cacheError) {
        console.warn('Career cache could not be read:', cacheError);
      }

      if (active) {
        void loadCareerData(!cacheIsUsable);
      }
    };

    void initialiseCareerExplorer();

    return () => {
      active = false;
    };
  }, [loadCareerData]);

  const loadMoreMobileCareers = useCallback(async () => {
    if (
      !IS_NATIVE_MOBILE ||
      loadingMoreMobile ||
      !mobileHasMore ||
      !mobileCursorRef.current
    ) {
      return;
    }

    try {
      setLoadingMoreMobile(true);
      setHydrationIncomplete(false);

      const nextSnap = await safeDocs(
        firestoreQuery(
          collection(db, 'courses'),
          firestoreStartAfter(mobileCursorRef.current),
          firestoreLimit(CAREER_BACKGROUND_COURSE_BATCH),
        ),
      );

      if (!mountedRef.current) return;

      const nextCourses = nextSnap.docs
        .map((document) =>
          parseCourseDocument(
            document,
            mobileInstitutionLookupRef.current,
            mobileFacultyLookupRef.current,
          ),
        )
        .filter((course): course is CourseRecord => course !== null);

      const knownIds = new Set(
        mobileCoursesRef.current.map((course) => course.id),
      );
      const uniqueNewCourses = nextCourses.filter(
        (course) => !knownIds.has(course.id),
      );

      mobileCoursesRef.current = [
        ...mobileCoursesRef.current,
        ...uniqueNewCourses,
      ];
      mobileCursorRef.current =
        nextSnap.docs[nextSnap.docs.length - 1] ??
        mobileCursorRef.current;
      setMobileHasMore(
        nextSnap.docs.length === CAREER_BACKGROUND_COURSE_BATCH,
      );

      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });

      setFields(buildCareerFields(mobileCoursesRef.current));
    } catch (error) {
      console.warn('Could not load more careers:', error);
      setHydrationIncomplete(true);
    } finally {
      if (mountedRef.current) {
        setLoadingMoreMobile(false);
      }
    }
  }, [loadingMoreMobile, mobileHasMore]);

  useEffect(() => {
    if (
      loading ||
      loadError ||
      fields.length === 0 ||
      !shouldOpenSavedCareer
    ) {
      return;
    }

    const normalise = (value: string) =>
      value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const requestedId = normalise(routeCareerId);
    const requestedTitle = routeCareerTitle.trim().toLowerCase();
    const routeKey = `${routeFieldId}|${requestedId}|${requestedTitle}`;

    if (!routeKey || openedRouteKeyRef.current === routeKey) {
      return;
    }

    const preferredFields = routeFieldId
      ? [
          ...fields.filter((field) => field.id === routeFieldId),
          ...fields.filter((field) => field.id !== routeFieldId),
        ]
      : fields;

    let matchedField: Field | null = null;
    let matchedRole: Role | null = null;

    for (const field of preferredFields) {
      const role = field.roles.find((candidate) => {
        const candidateId = normalise(candidate.id);
        const candidateTitle = candidate.title.trim().toLowerCase();

        return (
          (requestedId && candidateId === requestedId) ||
          (requestedTitle && candidateTitle === requestedTitle) ||
          (requestedId && normalise(candidate.title) === requestedId)
        );
      });

      if (role) {
        matchedField = field;
        matchedRole = role;
        break;
      }
    }

    if (matchedField && matchedRole) {
      openedRouteKeyRef.current = routeKey;
      setActiveField(matchedField);
      setActiveRole(matchedRole);
      setViewState('detail');
      setQuery('');
    }
  }, [
    fields,
    loadError,
    loading,
    routeCareerId,
    routeCareerTitle,
    routeFieldId,
    shouldOpenSavedCareer,
  ]);

  const saveCareer = useCallback(async (field: Field, role: Role) => {
    if (!auth.currentUser) {
      Alert.alert(
        'Sign in required',
        t('Please sign in before saving a career so it can sync across your devices.'),
      );
      return;
    }

    try {
      if (await isItemSaved('career', role.id)) {
        setSavedCareerIds((current) => new Set(current).add(role.id));
        Alert.alert(
          'Already saved',
          `${role.title} is already available in your Saved Careers.`,
          [
            { text: t('View Saved'), onPress: () => router.push('/student/saved') },
            { text: t('OK') },
          ],
        );
        return;
      }

      await saveItem('career', {
        id: role.id,
        careerId: role.id,
        roleId: role.id,
        fieldId: field.id,
        title: role.title,
        field: field.label,
        description: role.description,
        icon: role.icon,
        color: field.color,
        institutionCount: role.institutionCount,
        courseCount: role.courseCount,
        minimumPoints: role.minimumPoints,
      });

      setSavedCareerIds((current) => new Set(current).add(role.id));
      Alert.alert(
        'Career saved',
        `${role.title} has been saved to your account and will be available on your other devices.`,
        [
          { text: t('View Saved'), onPress: () => router.push('/student/saved') },
          { text: t('Done') },
        ],
      );
    } catch (error) {
      console.error('Failed to save career:', error);
      Alert.alert(t('Could not save career'), getSavedItemsErrorMessage(error));
    }
  }, []);

  const goField = useCallback((field: Field) => {
    setActiveField(field);
    setActiveRole(null);
    setViewState('roles');
  }, []);

  const goRole = useCallback((role: Role) => {
    setActiveRole(role);
    setViewState('detail');
  }, []);

  const backFields = useCallback(() => {
    setViewState('fields');
    setActiveField(null);
    setActiveRole(null);
  }, []);

  const backRoles = useCallback(() => {
    setViewState('roles');
    setActiveRole(null);
  }, []);

  const breadcrumb = useMemo(() => {
    if (viewState === 'fields') {
      return 'Dashboard › My Career';
    }

    if (viewState === 'roles') {
      return `Dashboard › My Career › ${activeField?.label ?? ''}`;
    }

    return `Dashboard › My Career › ${activeField?.label ?? ''} › ${activeRole?.title ?? ''}`;
  }, [activeField, activeRole, viewState]);

  return (
    <DashboardLayout
      title={t('My Career')}
      subtitle="Explore paths, discover opportunities"
      showPointsCard={false}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          marginBottom: spacing(6),
          flexWrap: 'wrap',
        }}
      >
        <Pressable
          onPress={() => {
            if (viewState === 'detail') {
              backRoles();
              return;
            }

            if (viewState === 'roles') {
              backFields();
              return;
            }

            router.back();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical: spacing(2),
            borderRadius: radii.lg,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>
            Back
          </Text>
        </Pressable>

        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              flex: 1,
              minWidth: 150,
            },
          ]}
          numberOfLines={1}
        >
          {breadcrumb}
        </Text>

        {!loading && (
          <Pressable
            onPress={() => {
              if (IS_NATIVE_MOBILE) {
                mobileCoursesRef.current = [];
                mobileCursorRef.current = null;
                setMobileHasMore(false);
              }
              void loadCareerData(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Refresh career data"
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: radii.pill,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name="refresh-outline"
              size={17}
              color={colors.primary}
            />
          </Pressable>
        )}
      </View>

      <StepIndicator
        step={viewState}
        field={activeField}
        role={activeRole}
        colors={colors}
        isMobile={isMobile}
      />

      {!loading &&
        IS_NATIVE_MOBILE &&
        viewState === 'fields' &&
        mobileHasMore && (
          <Pressable
            onPress={() => void loadMoreMobileCareers()}
            disabled={loadingMoreMobile}
            accessibilityRole="button"
            accessibilityLabel="Load more careers"
            style={({ pressed }) => ({
              minHeight: 48,
              marginBottom: spacing(5),
              paddingHorizontal: spacing(5),
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing(2),
              opacity:
                loadingMoreMobile || pressed ? 0.72 : 1,
            })}
          >
            {loadingMoreMobile ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.primary}
              />
            )}
            <Text style={[typography.label, { color: colors.primary }]}>
              {loadingMoreMobile
                ? 'Loading more careers…'
                : 'Load More Careers'}
            </Text>
          </Pressable>
        )}

      {/* Background hydration status — only relevant on the fields view,
          since that's the only screen whose counts/content can still be
          growing while these are shown. */}
      {!IS_NATIVE_MOBILE && !loading && viewState === 'fields' && hydrating && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical: spacing(2),
            backgroundColor: `${colors.textMuted}18`,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: `${colors.textMuted}33`,
            alignSelf: 'flex-start',
            marginBottom: spacing(4),
          }}
        >
          <ActivityIndicator size="small" color={colors.textMuted} />
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
            Loading additional careers…
          </Text>
        </View>
      )}

      {!loading && viewState === 'fields' && !hydrating && hydrationIncomplete && (
        <Pressable
          onPress={() => void loadCareerData(true)}
          accessibilityRole="button"
          accessibilityLabel="Retry loading remaining careers"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical: spacing(2),
            backgroundColor: `${colors.warning}18`,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: `${colors.warning}33`,
            alignSelf: 'flex-start',
            marginBottom: spacing(4),
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="alert-circle-outline" size={13} color={colors.warning} />
          <Text style={[typography.caption, { color: colors.warning, fontWeight: '600' }]}>
            Some careers may be missing — tap to retry
          </Text>
        </Pressable>
      )}

      {/* Loading: mobile gets a skeleton grid (feels responsive even on a
          slow connection); tablet/desktop keep the original spinner card
          since that experience was already fine there. */}
      {loading && isMobile && (
        <View>
          <SlowLoadBanner colors={colors} />
          <Text
            style={[
              typography.caption,
              { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4) },
            ]}
          >
            LOADING CAREER PATHWAYS…
          </Text>
          <CareerFieldsSkeleton colors={colors} columns={2} />
        </View>
      )}

      {loading && !isMobile && (
        <StateCard
          colors={colors}
          icon="cloud-download-outline"
          title="Loading career pathways"
          message="Thuto-Bridge is reading courses, institutions and faculties from Firestore and building your Career Explorer."
          loading
        />
      )}

      {!loading && loadError && (
        <StateCard
          colors={colors}
          icon="alert-circle-outline"
          title="Career data could not be loaded"
          message={loadError}
          actionLabel="Try Again"
          onAction={() => void loadCareerData(true)}
        />
      )}

      {!loading && !loadError && fields.length === 0 && (
        <StateCard
          colors={colors}
          icon="briefcase-outline"
          title="No course-linked careers found"
          message="The courses collection was read successfully, but no course documents currently contain a valid careers array. Add careers to course records and refresh this screen."
          actionLabel="Refresh"
          onAction={() => void loadCareerData(true)}
        />
      )}

      {!loading && !loadError && fields.length > 0 && viewState === 'fields' && (
        <FieldsView
          fields={fields}
          colors={colors}
          isMobile={isMobile}
          isTablet={isTablet}
          query={query}
          onQuery={setQuery}
          onSelect={goField}
        />
      )}

      {!loading &&
        !loadError &&
        viewState === 'roles' &&
        activeField && (
          <RolesView
            field={activeField}
            colors={colors}
            isMobile={isMobile}
            onBack={backFields}
            onSelect={goRole}
          />
        )}

      {!loading &&
        !loadError &&
        viewState === 'detail' &&
        activeField &&
        activeRole && (
          <DetailView
            field={activeField}
            role={activeRole}
            colors={colors}
            isMobile={isMobile}
            saved={savedCareerIds.has(activeRole.id)}
            onSave={() => void saveCareer(activeField, activeRole)}
            onBack={backRoles}
          />
        )}

      {/* Shared responsive student footer */}
      <StudentFooter
        topSpacing={isMobile ? spacing(8) : spacing(10)}
        maxWidth={1280}
      />
    </DashboardLayout>
  );
}

export default function CareerScreen() {
  return (
    <StudentMenuProvider>
      <CareerContent />
    </StudentMenuProvider>
  );
}