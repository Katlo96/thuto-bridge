const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const scholarships = require('./scholarships');

const serviceAccount = require('../thuto-bridge-d4d15-firebase-adminsdk-fbsvc-b06e51d1d4.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function seedScholarships() {
  const batch = db.batch();

  scholarships.forEach((scholarship) => {
    const ref = db.collection('scholarships').doc(scholarship.id);

    batch.set(ref, {
      ...scholarship,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Seeded ${scholarships.length} scholarships successfully.`);
}

seedScholarships()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding scholarships:', error);
    process.exit(1);
  });