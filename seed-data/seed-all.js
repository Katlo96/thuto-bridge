const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const universities = require('./universities');
const colleges = require('./colleges');
const brigades = require('./brigades');

const SERVICE_ACCOUNT_PATH = path.join(
  __dirname,
  '..',
  'thuto-bridge-d4d15-firebase-adminsdk-fbsvc-b06e51d1d4.json'
);

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`❌ Service account not found: ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = admin.firestore();

let currentBatch = db.batch();
let operationCount = 0;
let batchCount = 1;

async function commitBatch() {
  if (operationCount === 0) return;
  await currentBatch.commit();
  console.log(`✅ Batch ${batchCount} committed (${operationCount} operations)`);
  batchCount++;
  operationCount = 0;
  currentBatch = db.batch();
}

async function safeSet(docRef, data) {
  currentBatch.set(docRef, data);
  operationCount++;
  if (operationCount >= 400) await commitBatch();
}

const UNIVERSITY_STRUCTURE = {
  'Faculty of Engineering': [
    {
      title: 'Bachelor of Mechanical Engineering',
      points: 36,
      subjects: [
        ['Mathematics', 'B'],
        ['Physics', 'B'],
        ['Chemistry', 'C'],
        ['English', 'D']
      ],
      careers: ['Mechanical Engineer', 'Plant Engineer', 'Maintenance Engineer']
    },
    {
      title: 'Bachelor of Civil Engineering',
      points: 36,
      subjects: [
        ['Mathematics', 'B'],
        ['Physics', 'B'],
        ['English', 'D']
      ],
      careers: ['Civil Engineer', 'Structural Engineer', 'Project Engineer']
    }
  ],
  'Faculty of Computing': [
    {
      title: 'Bachelor of Computer Science',
      points: 34,
      subjects: [
        ['Mathematics', 'C'],
        ['English', 'D']
      ],
      careers: ['Software Engineer', 'Developer', 'Data Analyst']
    },
    {
      title: 'Bachelor of Information Systems',
      points: 32,
      subjects: [
        ['Mathematics', 'C'],
        ['English', 'D']
      ],
      careers: ['Systems Analyst', 'Business Analyst', 'IT Consultant']
    }
  ],
  'Faculty of Law': [
    {
      title: 'Bachelor of Laws (LLB)',
      points: 38,
      subjects: [
        ['English', 'B'],
        ['Setswana', 'C']
      ],
      careers: ['Lawyer', 'Legal Officer', 'Compliance Officer']
    }
  ],
  'Faculty of Business': [
    {
      title: 'Bachelor of Accounting',
      points: 32,
      subjects: [
        ['Mathematics', 'C'],
        ['English', 'D']
      ],
      careers: ['Accountant', 'Auditor', 'Financial Analyst']
    },
    {
      title: 'Bachelor of Economics',
      points: 32,
      subjects: [
        ['Mathematics', 'C'],
        ['English', 'D']
      ],
      careers: ['Economist', 'Research Analyst', 'Policy Analyst']
    }
  ],
  'Faculty of Health Sciences': [
    {
      title: 'Bachelor of Nursing',
      points: 36,
      subjects: [
        ['Biology', 'C'],
        ['Chemistry', 'C'],
        ['English', 'D']
      ],
      careers: ['Nurse', 'Clinical Officer', 'Healthcare Administrator']
    }
  ],
  'Faculty of Agriculture': [
    {
      title: 'Bachelor of Agriculture',
      points: 30,
      subjects: [
        ['Biology', 'C'],
        ['Agriculture', 'C']
      ],
      careers: ['Agronomist', 'Farm Manager', 'Agricultural Officer']
    }
  ]
};

const COLLEGE_STRUCTURE = {
  'School of Information Technology': [
    'Diploma in Information Technology',
    'Diploma in Software Development'
  ],
  'School of Business': [
    'Diploma in Business Management',
    'Diploma in Entrepreneurship'
  ],
  'School of Hospitality': [
    'Diploma in Hospitality Management',
    'Diploma in Tourism Management'
  ],
  'School of Accounting': [
    'Diploma in Accounting and Finance'
  ]
};

const BRIGADE_STRUCTURE = {
  'Automotive Engineering': [
    'Certificate in Automotive Mechanics'
  ],
  'Electrical Installation': [
    'Certificate in Electrical Installation'
  ],
  'Building Construction': [
    'Certificate in Building Construction'
  ],
  'Welding and Fabrication': [
    'Certificate in Welding and Fabrication'
  ],
  'Plumbing': [
    'Certificate in Plumbing'
  ],
  'Carpentry': [
    'Certificate in Carpentry and Joinery'
  ]
};

function buildRequirements(points, subjects) {
  return {
    acceptedQualifications: ['BGCSE', 'IGCSE', 'O-Level'],
    minimumPoints: points,
    subjectRequirements: subjects.map(([subject, grade]) => ({
      subject,
      minimumGrade: grade
    })),
    englishRequired: true
  };
}

function sponsorshipEligibility(minimumPoints) {
  return {
    governmentSponsorshipEligible: minimumPoints >= 30,
    minimumSponsorshipPoints: minimumPoints,
    priorityProgramme: minimumPoints >= 34
  };
}

async function seedUniversities() {
  for (const institution of universities) {
    await safeSet(
      db.collection('institutions').doc(institution.id),
      {
        ...institution,
        category: 'university',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      }
    );

    let facultyCounter = 1;

    for (const [facultyName, courses] of Object.entries(UNIVERSITY_STRUCTURE)) {
      const facultyId = `${institution.id}-fac-${String(facultyCounter++).padStart(3,'0')}`;

      await safeSet(db.collection('faculties').doc(facultyId), {
        id: facultyId,
        institutionId: institution.id,
        institutionType: 'university',
        name: facultyName,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });

      let c = 1;
      for (const course of courses) {
        const courseId = `${facultyId}-course-${String(c++).padStart(3,'0')}`;

        await safeSet(db.collection('courses').doc(courseId), {
          id: courseId,
          institutionId: institution.id,
          facultyId,
          title: course.title,
          qualificationLevel: 'Bachelor Degree',
          duration: '4 Years',
          mode: 'Full-time',
          requiredPoints: course.points,
          tuitionPerYear: 25000,
          entryRequirements: buildRequirements(course.points, course.subjects),
          careerPaths: course.careers,
          sponsorship: sponsorshipEligibility(course.points),
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }
}

async function seedColleges() {
  for (const institution of colleges) {
    await safeSet(db.collection('institutions').doc(institution.id), {
      ...institution,
      category: 'college',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    let facultyCounter = 1;

    for (const [facultyName, courses] of Object.entries(COLLEGE_STRUCTURE)) {
      const facultyId = `${institution.id}-fac-${String(facultyCounter++).padStart(3,'0')}`;

      await safeSet(db.collection('faculties').doc(facultyId), {
        id: facultyId,
        institutionId: institution.id,
        institutionType: 'college',
        name: facultyName,
      });

      let c = 1;
      for (const title of courses) {
        const courseId = `${facultyId}-course-${String(c++).padStart(3,'0')}`;

        await safeSet(db.collection('courses').doc(courseId), {
          id: courseId,
          institutionId: institution.id,
          facultyId,
          title,
          qualificationLevel: 'Diploma',
          duration: '3 Years',
          requiredPoints: 24,
          entryRequirements: buildRequirements(24, [['English','D']]),
          sponsorship: sponsorshipEligibility(24),
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }
}

async function seedBrigades() {
  for (const institution of brigades) {
    await safeSet(db.collection('institutions').doc(institution.id), {
      ...institution,
      category: 'brigade',
      ownership: 'Public',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    let facultyCounter = 1;

    for (const [facultyName, courses] of Object.entries(BRIGADE_STRUCTURE)) {
      const facultyId = `${institution.id}-fac-${String(facultyCounter++).padStart(3,'0')}`;

      await safeSet(db.collection('faculties').doc(facultyId), {
        id: facultyId,
        institutionId: institution.id,
        institutionType: 'brigade',
        name: facultyName,
      });

      let c = 1;
      for (const title of courses) {
        const courseId = `${facultyId}-course-${String(c++).padStart(3,'0')}`;

        await safeSet(db.collection('courses').doc(courseId), {
          id: courseId,
          institutionId: institution.id,
          facultyId,
          title,
          qualificationLevel: 'Certificate',
          duration: '2 Years',
          requiredPoints: 18,
          entryRequirements: buildRequirements(18, [['English','E']]),
          sponsorship: sponsorshipEligibility(18),
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }
}

async function seedAll() {
  try {
    console.log('🚀 Starting ThutoBridge master seed...');
    await seedUniversities();
    await seedColleges();
    await seedBrigades();
    await commitBatch();
    console.log('🎉 SUCCESS');
  } catch (error) {
    console.error(error);
  }
}

seedAll();
