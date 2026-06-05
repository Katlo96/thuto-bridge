const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const universities = require('./universities');
const colleges = require('./colleges');
const brigades = require('./brigades');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'thuto-bridge-d4d15-firebase-adminsdk-fbsvc-b06e51d1d4.json');

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

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSITY_FACULTIES - 10 Unique Faculties per University, 10 Courses each (4+ subjects)
// ─────────────────────────────────────────────────────────────────────────────
const UNIVERSITY_FACULTIES = {
  'uni-001': { // University of Batswana - Comprehensive
    'Faculty of Humanities and Social Sciences': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Arts in ${['English Literature', 'History', 'Sociology', 'Philosophy', 'Anthropology', 'Psychology', 'Linguistics', 'Media Studies', 'Theatre Arts', 'Music'][i]}`,
      points: 32 + i,
      subjects: [['English', 'B'], ['Setswana', 'C'], ['History', 'C'], ['Mathematics', 'D']]
    })),
    'Faculty of Law': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Laws (LLB) in ${['General Law', 'Commercial Law', 'Criminal Law', 'International Law', 'Human Rights', 'Environmental Law', 'Labour Law', 'Family Law', 'Intellectual Property', 'Constitutional Law'][i]}`,
      points: 36 + i,
      subjects: [['English', 'B'], ['Setswana', 'C'], ['History', 'C'], ['Mathematics', 'D']]
    })),
    'Faculty of Education': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Education in ${['Primary Education', 'Secondary English', 'Science Education', 'Special Needs', 'Early Childhood', 'Physical Education', 'Educational Psychology', 'Curriculum Studies', 'Adult Education', 'Leadership & Management'][i]}`,
      points: 30 + i,
      subjects: [['English', 'C'], ['Setswana', 'C'], ['Mathematics', 'D'], ['Biology', 'D']]
    })),
    'Faculty of Science': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Science in ${['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Statistics', 'Geology', 'Biochemistry', 'Microbiology', 'Environmental Science', 'Astronomy'][i]}`,
      points: 34 + i,
      subjects: [['Mathematics', 'B'], ['Physics', 'C'], ['Chemistry', 'C'], ['English', 'D']]
    })),
    'Faculty of Business and Economics': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of ${['Commerce (Accounting)', 'Economics', 'Finance', 'Marketing', 'Human Resource Management', 'Entrepreneurship', 'Supply Chain Management', 'Project Management', 'International Business', 'Business Administration'][i]}`,
      points: 31 + i,
      subjects: [['Mathematics', 'C'], ['English', 'D'], ['Economics', 'C'], ['Accounting', 'D']]
    })),
    'Faculty of Engineering and Technology': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Engineering in ${['Mechanical', 'Electrical', 'Civil', 'Computer', 'Chemical', 'Mining', 'Industrial', 'Software', 'Biomedical', 'Telecommunications'][i]}`,
      points: 36 + i,
      subjects: [['Mathematics', 'B'], ['Physics', 'B'], ['Chemistry', 'C'], ['English', 'D']]
    })),
    'Faculty of Health Sciences': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of ${['Medicine and Surgery', 'Nursing', 'Pharmacy', 'Medical Laboratory Sciences', 'Public Health', 'Physiotherapy', 'Dental Surgery', 'Nutrition & Dietetics', 'Occupational Therapy', 'Radiography'][i]}`,
      points: 35 + i,
      subjects: [['Biology', 'B'], ['Chemistry', 'B'], ['Mathematics', 'C'], ['English', 'C']]
    })),
    'Faculty of Agriculture': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Science in ${['Agriculture', 'Veterinary Medicine', 'Animal Science', 'Crop Science', 'Agricultural Economics', 'Food Science', 'Soil Science', 'Horticulture', 'Wildlife Management', 'Aquaculture'][i]}`,
      points: 31 + i,
      subjects: [['Biology', 'C'], ['Chemistry', 'C'], ['Mathematics', 'D'], ['English', 'D']]
    })),
    'Faculty of Computing and Informatics': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of Science in ${['Computer Science', 'Information Technology', 'Data Science', 'Cyber Security', 'Artificial Intelligence', 'Software Engineering', 'Network Engineering', 'Information Systems', 'Digital Media', 'Database Systems'][i]}`,
      points: 35 + i,
      subjects: [['Mathematics', 'B'], ['Physics', 'C'], ['English', 'D'], ['Chemistry', 'D']]
    })),
    'Faculty of Environmental Sciences': Array.from({length: 10}, (_, i) => ({
      title: `Bachelor of ${['Environmental Management', 'Climate Change Science', 'Geography', 'Meteorology', 'Conservation Biology', 'Sustainable Development', 'Water Resources Management', 'Disaster Management', 'Urban & Regional Planning', 'Geographic Information Systems'][i]}`,
      points: 32 + i,
      subjects: [['Biology', 'C'], ['Geography', 'C'], ['Mathematics', 'D'], ['English', 'D']]
    }))
  },

  'uni-002': { // Kalahari State University - Environmental & Agriculture Focus

  'Faculty of Environmental Sciences': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Environmental Science in ${[
      'Ecosystem Analysis',
      'Environmental Monitoring',
      'Biodiversity Conservation',
      'Pollution Control',
      'Land Rehabilitation',
      'Environmental Impact Assessment',
      'Natural Resource Evaluation',
      'Urban Environmental Systems',
      'Sustainable Ecosystems',
      'Environmental Policy'
    ][i]}`,
    points: 31 + i,
    subjects: [['Biology','C'],['Geography','C'],['Mathematics','D'],['English','D']]
  })),

  'Faculty of Agriculture and Natural Resources': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Science in Agriculture in ${[
      'Crop Production',
      'Animal Husbandry',
      'Soil Science',
      'Agricultural Economics',
      'Irrigation Systems',
      'Food Security',
      'Sustainable Farming',
      'Agribusiness Management',
      'Plant Pathology',
      'Agroecology'
    ][i]}`,
    points: 30 + i,
    subjects: [['Biology','C'],['Chemistry','C'],['Mathematics','D'],['English','D']]
  })),

  'Faculty of Wildlife and Conservation': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Wildlife Management in ${[
      'Game Reserve Management',
      'Wildlife Ecology',
      'Animal Behaviour',
      'Conservation Policy',
      'Park Administration',
      'Endangered Species Protection',
      'Wildlife Monitoring',
      'Ecotourism Integration',
      'Habitat Restoration',
      'Field Conservation'
    ][i]}`,
    points: 32 + i,
    subjects: [['Biology','B'],['Geography','C'],['English','D'],['Mathematics','D']]
  })),

  'Faculty of Earth Sciences': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Geology in ${[
      'Mineral Exploration',
      'Petroleum Geology',
      'Rock Formation Studies',
      'Geophysics',
      'Hydrogeology',
      'Structural Geology',
      'Sedimentology',
      'Mining Geology',
      'Earth Systems Science',
      'Geological Mapping'
    ][i]}`,
    points: 33 + i,
    subjects: [['Mathematics','C'],['Physics','C'],['Chemistry','C'],['English','D']]
  })),

  'Faculty of Sustainable Development': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Sustainable Development in ${[
      'Climate Adaptation',
      'Green Economy',
      'Community Development',
      'Sustainable Planning',
      'Environmental Governance',
      'Renewable Energy Policy',
      'Rural Development',
      'Sustainability Economics',
      'Resource Efficiency',
      'Development Policy'
    ][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Geography','C'],['Biology','D'],['Mathematics','D']]
  })),

  'Faculty of Climate Science': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Climate Science in ${[
      'Atmospheric Dynamics',
      'Climate Modelling',
      'Weather Systems',
      'Carbon Cycle Analysis',
      'Climate Risk Assessment',
      'Drought Prediction',
      'Climate Data Analytics',
      'Global Warming Studies',
      'Climate Adaptation Planning',
      'Environmental Forecasting'
    ][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','C'],['Physics','C'],['Geography','C'],['English','D']]
  })),

  'Faculty of Veterinary Sciences': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Veterinary Science in ${[
      'Animal Health',
      'Livestock Management',
      'Disease Control',
      'Veterinary Surgery',
      'Animal Nutrition',
      'Epidemiology',
      'Wildlife Veterinary Medicine',
      'Clinical Veterinary Practice',
      'Public Veterinary Health',
      'Animal Diagnostics'
    ][i]}`,
    points: 36 + i,
    subjects: [['Biology','B'],['Chemistry','B'],['Mathematics','C'],['English','C']]
  })),

  'Faculty of Water Resources': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Water Resources Management in ${[
      'Hydrology',
      'Water Quality Management',
      'Irrigation Systems',
      'River Basin Management',
      'Groundwater Studies',
      'Water Treatment Systems',
      'Hydraulic Engineering',
      'Aquatic Ecosystems',
      'Water Policy',
      'Resource Sustainability'
    ][i]}`,
    points: 31 + i,
    subjects: [['Chemistry','C'],['Geography','C'],['Mathematics','D'],['English','D']]
  })),

  'Faculty of Range Management': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Range Management in ${[
      'Grassland Ecology',
      'Pasture Management',
      'Livestock Grazing Systems',
      'Soil Conservation',
      'Dryland Ecosystems',
      'Rangeland Restoration',
      'Arid Land Management',
      'Vegetation Monitoring',
      'Sustainable Grazing',
      'Ecosystem Balance'
    ][i]}`,
    points: 29 + i,
    subjects: [['Biology','C'],['English','D'],['Mathematics','D'],['Geography','D']]
  })),

  'Faculty of Forestry': Array.from({length: 10}, (_, i) => ({
    title: `Bachelor of Forestry in ${[
      'Forest Ecology',
      'Timber Production',
      'Forest Conservation',
      'Agroforestry Systems',
      'Wildfire Management',
      'Forest Economics',
      'Reforestation Projects',
      'Forest Biodiversity',
      'Silviculture',
      'Forest Policy'
    ][i]}`,
    points: 30 + i,
    subjects: [['Biology','C'],['Geography','C'],['Mathematics','D'],['English','D']]
  }))

},

  // Continuing for the remaining universities (shortened here for response length but fully expanded in actual file)
  'uni-003': {
  'Faculty of Business Administration': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Business Administration in ${['Management','Operations','Leadership','Strategy','HR','Organizational Behaviour','Business Ethics','Corporate Governance','Entrepreneurship','Innovation'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Mathematics','C'],['Economics','C'],['Accounting','D']]
  })),

  'Faculty of Economics': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Economics in ${['Microeconomics','Macroeconomics','Development Economics','International Trade','Econometrics','Public Finance','Labour Economics','Monetary Policy','Game Theory','Applied Economics'][i]}`,
    points: 33 + i,
    subjects: [['Mathematics','B'],['Economics','C'],['English','C'],['Statistics','C']]
  })),

  'Faculty of Accounting & Finance': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Commerce in ${['Accounting','Auditing','Taxation','Financial Management','Corporate Finance','Forensic Accounting','Investment Analysis','Risk Management','Banking','Financial Reporting'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Accounting','B'],['English','C'],['Economics','C']]
  })),

  'Faculty of Digital Business': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Digital Business in ${['E-Commerce','Digital Marketing','UX Strategy','Data Analytics','Social Media Marketing','SEO','Product Management','Digital Strategy','Content Marketing','Growth Hacking'][i]}`,
    points: 32 + i,
    subjects: [['Mathematics','C'],['English','C'],['Business Studies','C'],['Computer Studies','C']]
  })),

  'Faculty of Supply Chain Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Supply Chain in ${['Logistics','Procurement','Operations','Warehouse Management','Transport Systems','Inventory Control','Global Trade','Distribution','Procurement Law','Supply Chain Analytics'][i]}`,
    points: 31 + i,
    subjects: [['Mathematics','C'],['English','C'],['Economics','C'],['Business Studies','D']]
  })),

  'Faculty of Marketing': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Marketing in ${['Brand Management','Advertising','Consumer Behaviour','Market Research','Digital Marketing','Sales Strategy','Retail Marketing','Public Relations','Media Strategy','Strategic Marketing'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Business Studies','C'],['Economics','C'],['Mathematics','D']]
  })),

  'Faculty of Entrepreneurship': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Entrepreneurship in ${['Startup Development','Innovation Management','Business Planning','Venture Capital','Small Business Management','Franchising','Social Entrepreneurship','Fintech Startups','Product Innovation','Scaling Businesses'][i]}`,
    points: 29 + i,
    subjects: [['English','C'],['Business Studies','C'],['Mathematics','D'],['Economics','D']]
  })),

  'Faculty of Information Systems': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Information Systems in ${['Systems Analysis','Database Design','IT Management','Enterprise Systems','Business Intelligence','ERP Systems','Cloud Systems','Data Management','IT Governance','Systems Security'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Computer Studies','C'],['English','C'],['Physics','D']]
  })),

  'Faculty of Public Administration': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Public Administration in ${['Governance','Policy Analysis','Public Finance','Local Government','Development Policy','Public Sector Management','NGO Management','Administrative Law','Leadership','Ethics in Government'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['History','C'],['Economics','C'],['Mathematics','D']]
  })),

  'Faculty of International Business': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of International Business in ${['Global Trade','Export Management','International Finance','Cross-Cultural Management','Global Marketing','Trade Law','Diplomacy & Trade','Foreign Investment','Global Supply Chains','International Strategy'][i]}`,
    points: 35 + i,
    subjects: [['English','B'],['Economics','C'],['Geography','C'],['Mathematics','C']]
  }))
},
 'uni-004': {
  'Faculty of Tourism Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Tourism Management in ${['Eco Tourism','Safari Operations','Travel Planning','Destination Marketing','Tour Guiding','Airline Tourism','Cruise Tourism','Event Tourism','Cultural Tourism','Adventure Tourism'][i]}`,
    points: 31 + i,
    subjects: [['English','C'],['Geography','C'],['Business Studies','C'],['Mathematics','D']]
  })),

  'Faculty of Hospitality Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Hospitality Management in ${['Hotel Operations','Food & Beverage','Front Office','Housekeeping','Culinary Management','Resort Management','Luxury Hospitality','Hospitality Finance','Customer Experience','Event Catering'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Business Studies','C'],['Mathematics','D'],['Setswana','D']]
  })),

  'Faculty of Conservation Biology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Conservation Biology in ${['Wildlife Protection','Biodiversity','Ecosystem Management','Endangered Species','Habitat Restoration','Ecology','Field Conservation','Wildlife Monitoring','Genetics Conservation','Protected Areas'][i]}`,
    points: 33 + i,
    subjects: [['Biology','B'],['Geography','C'],['English','C'],['Mathematics','D']]
  })),

  'Faculty of Wildlife Tourism': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Wildlife Tourism in ${['Safari Guiding','Park Management','Eco Lodges','Wildlife Photography','Tour Operations','Animal Behaviour','Game Reserve Management','Conservation Policy','Eco Interpretation','Wildlife Education'][i]}`,
    points: 32 + i,
    subjects: [['Biology','C'],['Geography','C'],['English','C'],['Mathematics','D']]
  })),

  'Faculty of Event Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Event Management in ${['Corporate Events','Weddings','Festival Management','Sports Events','Cultural Events','Conference Planning','Venue Management','Entertainment Events','Tourism Events','Public Events'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Business Studies','C'],['Mathematics','D'],['Economics','D']]
  })),

  'Faculty of Aviation Tourism': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Aviation Tourism in ${['Airline Operations','Airport Management','Aviation Safety','Flight Services','Air Cargo Tourism','Passenger Services','Air Traffic Basics','Aviation Marketing','Cabin Crew Management','Airline Business'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','C'],['English','B'],['Physics','C'],['Geography','C']]
  })),

  'Faculty of Cultural Heritage': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Cultural Heritage in ${['Museum Studies','Archaeology','Heritage Tourism','Cultural Preservation','History Tourism','Community Heritage','Traditional Knowledge','Cultural Policy','Art Heritage','Historical Sites'][i]}`,
    points: 29 + i,
    subjects: [['History','C'],['English','C'],['Geography','D'],['Setswana','C']]
  })),

  'Faculty of Sustainable Tourism': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Sustainable Tourism in ${['Green Tourism','Eco Lodging','Carbon Neutral Travel','Sustainable Destinations','Environmental Impact','Responsible Travel','Climate Tourism','Conservation Economics','Sustainable Planning','Eco Certification'][i]}`,
    points: 31 + i,
    subjects: [['Geography','C'],['Biology','C'],['English','C'],['Mathematics','D']]
  })),

  'Faculty of Culinary Arts': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Culinary Arts in ${['International Cuisine','Pastry Arts','Restaurant Management','Food Science','Nutrition','Gourmet Cooking','Bakery Arts','Food Safety','Hospitality Cuisine','Culinary Innovation'][i]}`,
    points: 28 + i,
    subjects: [['English','C'],['Mathematics','D'],['Biology','C'],['Business Studies','D']]
  })),

  'Faculty of Travel Technology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Travel Technology in ${['Booking Systems','Travel Apps','Digital Tourism','AI Travel Planning','Smart Tourism','Reservation Systems','Tourism Analytics','Online Travel Platforms','UX for Travel','Data Tourism Systems'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Computer Studies','C'],['English','C'],['Business Studies','C']]
  }))
},
  'uni-005': {
  'Faculty of Law': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Laws in ${['Constitutional Law','Criminal Law','Corporate Law','International Law','Human Rights Law','Environmental Law','Labour Law','Tax Law','Family Law','Cyber Law'][i]}`,
    points: 36 + i,
    subjects: [['English','B'],['History','C'],['Mathematics','C'],['Setswana','C']]
  })),

  'Faculty of Criminal Justice': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Criminal Justice in ${['Policing','Forensic Investigation','Criminology','Cyber Crime','Correctional Services','Crime Analysis','Forensic Psychology','Security Studies','Law Enforcement','Justice Systems'][i]}`,
    points: 32 + i,
    subjects: [['English','C'],['History','C'],['Mathematics','D'],['Biology','D']]
  })),

  'Faculty of Political Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Political Science in ${['Governance','Public Policy','International Relations','Political Theory','African Politics','Diplomacy','Public Administration','Comparative Politics','Human Rights','Political Economy'][i]}`,
    points: 31 + i,
    subjects: [['English','C'],['History','C'],['Economics','C'],['Mathematics','D']]
  })),

  'Faculty of Public Administration': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Public Administration in ${['Local Government','Policy Implementation','Public Finance','Governance Ethics','Development Administration','NGO Management','Leadership','Public Sector Reform','Urban Governance','Service Delivery'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['History','C'],['Economics','C'],['Mathematics','D']]
  })),

  'Faculty of Human Rights': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Human Rights in ${['Civil Rights','Gender Equality','Child Rights','Refugee Law','International Human Rights','Social Justice','Constitutional Rights','Activism Studies','Legal Advocacy','Humanitarian Law'][i]}`,
    points: 29 + i,
    subjects: [['English','C'],['History','C'],['Setswana','C'],['Geography','D']]
  })),

  'Faculty of International Relations': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of International Relations in ${['Diplomacy','Global Governance','Trade Relations','Peace Studies','Foreign Policy','Conflict Resolution','International Security','Global Politics','UN Systems','African Union Studies'][i]}`,
    points: 33 + i,
    subjects: [['English','B'],['History','C'],['Geography','C'],['Economics','C']]
  })),

  'Faculty of Sociology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Sociology in ${['Social Theory','Community Development','Urban Sociology','Rural Studies','Social Change','Gender Studies','Family Systems','Education Sociology','Crime & Society','Cultural Studies'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['History','C'],['Setswana','C'],['Geography','D']]
  })),

  'Faculty of Anthropology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Anthropology in ${['Cultural Anthropology','Archaeology','Linguistic Anthropology','Social Anthropology','Ethnography','African Studies','Human Evolution','Cultural Heritage','Field Research','Community Studies'][i]}`,
    points: 28 + i,
    subjects: [['History','C'],['English','C'],['Setswana','C'],['Geography','D']]
  })),

  'Faculty of Legal Studies': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Legal Studies in ${['Legal Practice','Court Procedures','Legal Writing','Evidence Law','Contract Law','Property Law','Civil Procedure','Legal Ethics','Alternative Dispute Resolution','Law Research'][i]}`,
    points: 31 + i,
    subjects: [['English','C'],['History','C'],['Mathematics','D'],['Setswana','C']]
  })),

  'Faculty of Governance & Ethics': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Governance in ${['Ethical Leadership','Anti-Corruption','Public Ethics','Transparency','Accountability Systems','Governance Reform','Policy Ethics','Institutional Governance','Civic Responsibility','Leadership Studies'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['History','C'],['Economics','C'],['Setswana','D']]
  }))
},
 'uni-006': {
  'Faculty of Computer Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Computer Science in ${['Algorithms','Operating Systems','Software Engineering','Programming','Data Structures','Networks','Databases','AI Fundamentals','Cyber Security','Cloud Computing'][i]}`,
    points: 36 + i,
    subjects: [['Mathematics','B'],['Physics','C'],['English','C'],['Computer Studies','B']]
  })),

  'Faculty of Artificial Intelligence': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of AI in ${['Machine Learning','Neural Networks','Computer Vision','Natural Language Processing','Robotics AI','Deep Learning','AI Ethics','Autonomous Systems','AI Engineering','Data Intelligence'][i]}`,
    points: 38 + i,
    subjects: [['Mathematics','A'],['Physics','B'],['Computer Studies','B'],['English','C']]
  })),

  'Faculty of Cyber Security': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Cyber Security in ${['Ethical Hacking','Network Security','Digital Forensics','Cryptography','Security Architecture','Penetration Testing','Cyber Law','Incident Response','Malware Analysis','Secure Systems'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','B'],['Computer Studies','B'],['Physics','C'],['English','C']]
  })),

  'Faculty of Software Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Software Engineering in ${['Mobile Apps','Web Development','System Design','DevOps','Cloud Engineering','Backend Systems','Frontend Engineering','Software Testing','Agile Development','API Design'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Computer Studies','B'],['English','C'],['Physics','C']]
  })),

  'Faculty of Data Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Data Science in ${['Data Analytics','Big Data','Statistical Modelling','Data Mining','Business Intelligence','Predictive Analytics','Machine Learning','Data Engineering','Visualization','Data Governance'][i]}`,
    points: 36 + i,
    subjects: [['Mathematics','A'],['Statistics','B'],['Computer Studies','B'],['English','C']]
  })),

  'Faculty of Information Systems': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Information Systems in ${['Enterprise Systems','ERP','Business IT','Systems Design','IT Management','Database Systems','Cloud Systems','Digital Transformation','IT Strategy','Systems Integration'][i]}`,
    points: 33 + i,
    subjects: [['Mathematics','B'],['Computer Studies','B'],['English','C'],['Business Studies','C']]
  })),

  'Faculty of Robotics': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Robotics in ${['Autonomous Robots','Industrial Robotics','AI Robotics','Mechanical Systems','Control Systems','Embedded Systems','Robot Vision','Human Robot Interaction','Mechatronics','Automation'][i]}`,
    points: 37 + i,
    subjects: [['Mathematics','A'],['Physics','B'],['Computer Studies','B'],['English','C']]
  })),

  'Faculty of Game Development': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Game Development in ${['Game Design','3D Modelling','Game Programming','Animation','Game Engines','UX Design','Virtual Reality','Mobile Gaming','AI in Games','Interactive Media'][i]}`,
    points: 34 + i,
    subjects: [['Computer Studies','B'],['Mathematics','B'],['English','C'],['Art','C']]
  })),

  'Faculty of Digital Media': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Digital Media in ${['UI/UX Design','Graphic Design','Animation','Video Production','Digital Storytelling','Motion Graphics','Web Design','Media Production','Content Creation','Visual Communication'][i]}`,
    points: 32 + i,
    subjects: [['English','C'],['Art','B'],['Computer Studies','C'],['Business Studies','D']]
  })),

  'Faculty of Cloud Computing': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Cloud Computing in ${['AWS Systems','Azure Architecture','Cloud Security','Distributed Systems','Serverless Computing','DevOps','Cloud Networking','Scalability Systems','Cloud Infrastructure','Virtualization'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','B'],['Computer Studies','B'],['Physics','C'],['English','C']]
  }))
},
  'uni-007': {
  'Faculty of Ecology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Ecology in ${['Ecosystem Dynamics','Biodiversity','Population Ecology','Habitat Conservation','Marine Ecology','Plant Ecology','Animal Ecology','Field Ecology','Restoration Ecology','Applied Ecology'][i]}`,
    points: 32 + i,
    subjects: [['Biology','B'],['Geography','C'],['English','C'],['Mathematics','D']]
  })),

  'Faculty of Climate Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Climate Science in ${['Climate Modelling','Atmospheric Science','Global Warming','Climate Policy','Weather Systems','Carbon Cycles','Climate Data Analysis','Climate Risk','Climate Adaptation','Climate Mitigation'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','B'],['Physics','C'],['Geography','C'],['English','C']]
  })),

  'Faculty of Natural Resource Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Natural Resource Management in ${['Water Resources','Mineral Resources','Land Management','Sustainable Use','Resource Economics','Environmental Planning','Resource Conservation','Energy Resources','Waste Management','Resource Policy'][i]}`,
    points: 33 + i,
    subjects: [['Geography','C'],['Biology','C'],['Economics','C'],['English','C']]
  })),

  'Faculty of Forestry': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Forestry in ${['Forest Ecology','Silviculture','Forest Management','Agroforestry','Forest Conservation','Timber Management','Wildfire Management','Forest Economics','Reforestation','Forest Policy'][i]}`,
    points: 31 + i,
    subjects: [['Biology','B'],['Geography','C'],['Mathematics','D'],['English','C']]
  })),

  'Faculty of Water Systems': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Water Systems in ${['Hydrology','Water Engineering','Water Quality','Irrigation Systems','Groundwater Management','River Systems','Water Treatment','Aquatic Ecology','Water Policy','Hydro Systems'][i]}`,
    points: 34 + i,
    subjects: [['Physics','C'],['Chemistry','C'],['Geography','C'],['Mathematics','C']]
  })),

  'Faculty of Environmental Chemistry': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Environmental Chemistry in ${['Soil Chemistry','Water Chemistry','Air Pollution','Toxicology','Chemical Ecology','Environmental Analysis','Waste Chemistry','Industrial Pollution','Analytical Chemistry','Green Chemistry'][i]}`,
    points: 35 + i,
    subjects: [['Chemistry','B'],['Biology','C'],['Mathematics','C'],['English','C']]
  })),

  'Faculty of Conservation Policy': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Conservation Policy in ${['Wildlife Policy','Environmental Law','Protected Areas','Policy Analysis','Sustainability Governance','International Conservation','Community Conservation','Biodiversity Law','Resource Policy','Environmental Ethics'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['History','C'],['Geography','C'],['Biology','C']]
  })),

  'Faculty of Disaster Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Disaster Management in ${['Risk Assessment','Emergency Planning','Climate Disasters','Flood Management','Drought Response','Crisis Management','Humanitarian Response','Disaster Recovery','Resilience Planning','Hazard Mapping'][i]}`,
    points: 32 + i,
    subjects: [['Geography','C'],['English','C'],['Mathematics','C'],['Biology','D']]
  })),

  'Faculty of Geospatial Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Geospatial Science in ${['GIS Systems','Remote Sensing','Cartography','Spatial Analysis','Satellite Imaging','Geographic Modelling','Urban Mapping','Environmental Mapping','Geospatial AI','Navigation Systems'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Geography','B'],['Computer Studies','C'],['English','C']]
  })),

  'Faculty of Sustainable Development': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Sustainable Development in ${['Sustainability Planning','Green Economy','Climate Action','Circular Economy','Sustainable Cities','Renewable Energy Policy','Environmental Economics','Social Sustainability','Sustainable Agriculture','Global Sustainability'][i]}`,
    points: 31 + i,
    subjects: [['English','C'],['Geography','C'],['Economics','C'],['Biology','C']]
  }))
},
  'uni-008': {
  'Faculty of Education': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Education in ${['Primary Education','Secondary Education','Science Education','Mathematics Education','Language Education','Special Needs Education','Early Childhood','Curriculum Studies','Educational Leadership','Adult Education'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Mathematics','D'],['Setswana','C'],['Education','C']]
  })),

  'Faculty of Psychology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Psychology in ${['Clinical Psychology','Cognitive Psychology','Developmental Psychology','Social Psychology','Behavioural Science','Counselling','Educational Psychology','Neuropsychology','Industrial Psychology','Mental Health Studies'][i]}`,
    points: 34 + i,
    subjects: [['English','B'],['Biology','C'],['Mathematics','C'],['History','C']]
  })),

  'Faculty of Health Sciences': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Health Sciences in ${['Public Health','Epidemiology','Nutrition','Health Policy','Community Health','Occupational Health','Global Health','Health Education','Disease Control','Health Systems'][i]}`,
    points: 35 + i,
    subjects: [['Biology','B'],['Chemistry','C'],['English','C'],['Mathematics','C']]
  })),

  'Faculty of Nursing': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Nursing in ${['General Nursing','Pediatric Nursing','Midwifery','Critical Care','Community Nursing','Mental Health Nursing','Surgical Nursing','Emergency Nursing','Geriatric Nursing','Public Health Nursing'][i]}`,
    points: 36 + i,
    subjects: [['Biology','B'],['English','C'],['Chemistry','C'],['Mathematics','D']]
  })),

  'Faculty of Sports Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Sports Science in ${['Exercise Physiology','Sports Coaching','Athletic Training','Sports Psychology','Biomechanics','Sports Nutrition','Fitness Training','Sports Management','Rehabilitation','Physical Education'][i]}`,
    points: 30 + i,
    subjects: [['Biology','C'],['English','C'],['Mathematics','D'],['Physical Education','C']]
  })),

  'Faculty of Social Work': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Social Work in ${['Community Development','Child Protection','Family Services','Mental Health Support','Social Policy','Rehabilitation Services','NGO Work','Human Services','Counselling','Welfare Systems'][i]}`,
    points: 29 + i,
    subjects: [['English','C'],['History','C'],['Setswana','C'],['Geography','D']]
  })),

  'Faculty of Counselling': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Counselling in ${['Mental Health','Youth Counselling','Trauma Counselling','Career Guidance','Addiction Counselling','School Counselling','Family Counselling','Behavioural Therapy','Psychotherapy Basics','Community Counselling'][i]}`,
    points: 31 + i,
    subjects: [['English','C'],['Psychology','C'],['History','C'],['Biology','C']]
  })),

  'Faculty of Library Science': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Library Science in ${['Information Management','Digital Libraries','Archiving','Records Management','Knowledge Systems','Research Methods','Library Technology','Cataloguing','Data Curation','Information Literacy'][i]}`,
    points: 28 + i,
    subjects: [['English','C'],['History','C'],['Computer Studies','C'],['Setswana','C']]
  })),

  'Faculty of Professional Studies': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Professional Studies in ${['Leadership','Communication','Project Management','Public Speaking','Critical Thinking','Organisational Studies','Ethics','Professional Writing','Management Skills','Applied Practice'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Mathematics','D'],['Business Studies','C'],['History','C']]
  })),

  'Faculty of Applied Sciences': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Applied Sciences in ${['Applied Physics','Applied Chemistry','Applied Biology','Industrial Science','Forensic Science','Materials Science','Applied Mathematics','Environmental Applications','Laboratory Science','Scientific Technology'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Physics','C'],['Chemistry','C'],['English','C']]
  }))
},
  'uni-009': {
  'Faculty of Mining Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Mining Engineering in ${['Mine Design','Rock Mechanics','Mineral Extraction','Mining Safety','Underground Mining','Surface Mining','Mining Technology','Mine Ventilation','Geotechnical Engineering','Mineral Processing'][i]}`,
    points: 37 + i,
    subjects: [['Mathematics','A'],['Physics','B'],['Chemistry','C'],['English','C']]
  })),

  'Faculty of Mechanical Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Mechanical Engineering in ${['Thermodynamics','Fluid Mechanics','Machine Design','Manufacturing','Automotive Systems','Robotics','Materials Engineering','Energy Systems','HVAC Systems','Industrial Design'][i]}`,
    points: 36 + i,
    subjects: [['Mathematics','A'],['Physics','B'],['Chemistry','C'],['English','C']]
  })),

  'Faculty of Electrical Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Electrical Engineering in ${['Power Systems','Electronics','Control Systems','Telecommunications','Renewable Energy','Circuit Design','Electrical Machines','Smart Grids','Signal Processing','Embedded Systems'][i]}`,
    points: 36 + i,
    subjects: [['Mathematics','A'],['Physics','B'],['English','C'],['Chemistry','C']]
  })),

  'Faculty of Civil Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Civil Engineering in ${['Structural Engineering','Transportation','Geotechnical','Construction Management','Water Engineering','Urban Infrastructure','Bridge Design','Road Engineering','Surveying','Environmental Civil Systems'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','A'],['Physics','B'],['English','C'],['Geography','C']]
  })),

  'Faculty of Industrial Technology': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Industrial Technology in ${['Manufacturing Systems','Industrial Automation','Production Systems','Quality Control','Operations Engineering','Industrial Safety','Lean Manufacturing','Logistics Systems','Factory Design','Process Engineering'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Physics','C'],['Business Studies','C'],['English','C']]
  })),

  'Faculty of Automotive Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Automotive Engineering in ${['Engine Design','Vehicle Dynamics','Electric Vehicles','Automotive Electronics','Diagnostics','Hybrid Systems','Manufacturing','Safety Systems','Performance Engineering','Mobility Systems'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','B'],['Physics','B'],['English','C'],['Chemistry','C']]
  })),

  'Faculty of Chemical Engineering': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Chemical Engineering in ${['Process Engineering','Petrochemicals','Industrial Chemistry','Material Processing','Energy Systems','Reactor Design','Environmental Chemistry','Polymer Science','Thermodynamics','Industrial Processes'][i]}`,
    points: 36 + i,
    subjects: [['Chemistry','A'],['Mathematics','A'],['Physics','B'],['English','C']]
  })),

  'Faculty of Metallurgy': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Metallurgy in ${['Metal Processing','Material Science','Mining Metallurgy','Steel Production','Alloy Design','Heat Treatment','Corrosion Science','Extractive Metallurgy','Welding Technology','Industrial Metals'][i]}`,
    points: 35 + i,
    subjects: [['Chemistry','A'],['Physics','B'],['Mathematics','B'],['English','C']]
  })),

  'Faculty of Energy Systems': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Energy Systems in ${['Renewable Energy','Solar Power','Wind Energy','Hydropower','Energy Storage','Grid Systems','Energy Economics','Power Engineering','Nuclear Basics','Energy Policy'][i]}`,
    points: 34 + i,
    subjects: [['Physics','B'],['Mathematics','B'],['Chemistry','C'],['English','C']]
  })),

  'Faculty of Engineering Management': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Engineering Management in ${['Project Management','Industrial Leadership','Engineering Economics','Operations Management','Risk Management','Construction Management','Quality Systems','Engineering Finance','Strategic Planning','Systems Engineering'][i]}`,
    points: 33 + i,
    subjects: [['Mathematics','B'],['Business Studies','C'],['English','C'],['Physics','C']]
  }))
},
 'uni-010': {
  'Faculty of General Sciences': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Science in ${['General Physics','General Chemistry','General Biology','Mathematics','Statistics','Environmental Science','Applied Science','Scientific Research','Laboratory Science','Interdisciplinary Science'][i]}`,
    points: 33 + i,
    subjects: [['Mathematics','B'],['English','C'],['Physics','C'],['Chemistry','C']]
  })),

  'Faculty of Arts & Humanities': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Arts in ${['History','English Literature','Philosophy','Linguistics','Cultural Studies','Media Studies','Drama','Music','Fine Arts','Creative Writing'][i]}`,
    points: 29 + i,
    subjects: [['English','B'],['History','C'],['Setswana','C'],['Geography','D']]
  })),

  'Faculty of Business Studies': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Commerce in ${['Accounting','Finance','Economics','Marketing','Management','Entrepreneurship','Banking','Insurance','Business Analytics','International Trade'][i]}`,
    points: 32 + i,
    subjects: [['Mathematics','B'],['English','C'],['Economics','C'],['Accounting','C']]
  })),

  'Faculty of Education': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Education in ${['Primary Education','Secondary Education','Science Education','Math Education','Language Education','Special Needs','Early Childhood','Educational Leadership','Curriculum Design','Adult Education'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['Setswana','C'],['Mathematics','D'],['Education','C']]
  })),

  'Faculty of Law': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Laws in ${['Constitutional Law','Criminal Law','Civil Law','Corporate Law','International Law','Human Rights','Labour Law','Tax Law','Environmental Law','Legal Practice'][i]}`,
    points: 36 + i,
    subjects: [['English','B'],['History','C'],['Setswana','C'],['Mathematics','C']]
  })),

  'Faculty of Computing': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Computing in ${['Programming','Software Engineering','Cyber Security','Data Science','AI Basics','Networking','Systems Design','Cloud Computing','Databases','Web Development'][i]}`,
    points: 35 + i,
    subjects: [['Mathematics','B'],['Computer Studies','B'],['Physics','C'],['English','C']]
  })),

  'Faculty of Health Sciences': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Health Sciences in ${['Nursing','Public Health','Pharmacy Basics','Nutrition','Epidemiology','Medical Science','Community Health','Health Policy','Psychology Health','Healthcare Management'][i]}`,
    points: 35 + i,
    subjects: [['Biology','B'],['Chemistry','C'],['English','C'],['Mathematics','C']]
  })),

  'Faculty of Agriculture': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Agriculture in ${['Crop Science','Animal Science','Agronomy','Soil Science','Agricultural Economics','Horticulture','Food Science','Agro-Technology','Farm Management','Sustainable Farming'][i]}`,
    points: 31 + i,
    subjects: [['Biology','C'],['Chemistry','C'],['Mathematics','D'],['English','C']]
  })),

  'Faculty of Engineering Basics': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Engineering Studies in ${['Mechanical Basics','Electrical Basics','Civil Basics','Chemical Basics','Industrial Basics','Mining Basics','Energy Systems','Engineering Math','Engineering Physics','Design Fundamentals'][i]}`,
    points: 34 + i,
    subjects: [['Mathematics','B'],['Physics','B'],['Chemistry','C'],['English','C']]
  })),

  'Faculty of Social Sciences': Array.from({length:10}, (_, i) => ({
    title: `Bachelor of Social Science in ${['Sociology','Psychology','Anthropology','Political Science','Geography','Economics','Social Work','Development Studies','Criminology','International Studies'][i]}`,
    points: 30 + i,
    subjects: [['English','C'],['History','C'],['Setswana','C'],['Geography','C']]
  }))
}
};

// Note: For brevity in this message, I showed full detail for uni-001 and uni-002.
// The full file contains complete 10 faculties × 10 courses for all 10 universities with 4 subjects each.
// Let me know if you want me to send the complete expanded version for uni-003 to uni-010 right now.

// ─────────────────────────────────────────────────────────────────────────────
// COLLEGE_FACULTIES - 10 Unique Faculties per College, 10 Courses each (min 3 subjects)
// ─────────────────────────────────────────────────────────────────────────────
const COLLEGE_FACULTIES = {
 'col-001': { // Gaborone Professional College

  'School of Business Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Business Administration - ${['General','Marketing','Human Resources','Finance','Operations','International Business','Entrepreneurship','Project Management','Supply Chain','Retail Management'][i]}`,
    points: 24 + i % 5,
    subjects: [
      ['English', 'D'],
      ['Mathematics', 'D'],
      ['Economics', 'E']
    ]
  })),

  'School of Accounting & Finance': Array.from({length:10}, (_, i) => ({
    title: `Diploma in ${['Accounting','Cost Accounting','Auditing','Taxation','Financial Management','Banking','Credit Management','Investment Analysis','Payroll Management','Forensic Accounting'][i]}`,
    points: 25 + i % 5,
    subjects: [
      ['Mathematics', 'C'],
      ['English', 'D'],
      ['Accounting', 'D']
    ]
  })),

  'School of Information Technology': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Information Technology - ${['Software Development','Networking','Web Development','Database Systems','Cyber Security','Systems Administration','Data Analytics','Cloud Computing','Mobile Applications','IT Support'][i]}`,
    points: 26 + i % 5,
    subjects: [
      ['Mathematics', 'C'],
      ['English', 'D'],
      ['Computer Studies', 'D']
    ]
  })),

  'School of Hospitality & Tourism': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Hospitality & Tourism - ${['Hotel Management','Food & Beverage Management','Tourism Operations','Event Management','Front Office','Culinary Arts','Travel Operations','Resort Management','Customer Service','Tour Guiding'][i]}`,
    points: 23 + i % 5,
    subjects: [
      ['English', 'D'],
      ['Mathematics', 'D'],
      ['Setswana', 'E']
    ]
  })),

  'School of Marketing & Public Relations': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Marketing & Public Relations - ${['Digital Marketing','Brand Management','Advertising','Market Research','Corporate Communications','Social Media Marketing','Sales Management','Public Relations','Content Strategy','Consumer Behaviour'][i]}`,
    points: 24 + i % 4,
    subjects: [
      ['English', 'C'],
      ['Mathematics', 'D'],
      ['Economics', 'D']
    ]
  })),

  'School of Health & Community Care': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Health & Community Care - ${['Public Health','Community Nursing','Health Promotion','Epidemiology Basics','Nutrition Support','Primary Health Care','Mental Health Support','Health Administration','Disease Prevention','Caregiving'][i]}`,
    points: 25 + i % 4,
    subjects: [
      ['Biology', 'C'],
      ['English', 'D'],
      ['Mathematics', 'D']
    ]
  })),

  'School of Engineering Trades': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Engineering Trades - ${['Mechanical Engineering','Electrical Engineering','Civil Engineering','Automotive Mechanics','Welding & Fabrication','Plumbing','Carpentry','Industrial Maintenance','Construction Technology','Technical Drawing'][i]}`,
    points: 25 + i % 5,
    subjects: [
      ['Mathematics', 'C'],
      ['Physics', 'D'],
      ['English', 'D']
    ]
  })),

  'School of Legal Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Legal Studies - ${['Criminal Law','Civil Law','Constitutional Law','Human Rights Law','Corporate Law','Contract Law','Legal Practice','Court Procedures','Legal Ethics','Paralegal Studies'][i]}`,
    points: 24 + i % 4,
    subjects: [
      ['English', 'C'],
      ['History', 'D'],
      ['Setswana', 'D']
    ]
  })),

  'School of Project & Operations Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Project & Operations Management - ${['Project Planning','Operations Management','Logistics','Supply Chain Management','Business Strategy','Quality Management','Risk Management','Entrepreneurship','Organisational Behaviour','Business Analysis'][i]}`,
    points: 26 + i % 4,
    subjects: [
      ['Mathematics', 'C'],
      ['English', 'D'],
      ['Economics', 'D']
    ]
  })),

  'School of Creative Arts & Design': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Creative Arts & Design - ${['Graphic Design','Digital Illustration','Animation','UI/UX Design','Photography','Film Production','Fashion Design','Interior Design','Fine Arts','Media Production'][i]}`,
    points: 23 + i % 5,
    subjects: [
      ['English', 'D'],
      ['Art', 'C'],
      ['Computer Studies', 'D']
    ]
  }))

},

  // For the remaining colleges (col-002 to col-010), use this pattern (varied by college theme)
 'col-002': {
  'School of Business Administration': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Business Administration in ${['Management','Entrepreneurship','Operations','Strategy','Leadership','Retail','Corporate','International','Innovation','Business Ethics'][i]}`,
    points: 24 + i%5,
    subjects: [['English','D'],['Mathematics','D'],['Economics','E']]
  })),

  'School of Accounting': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Accounting in ${['Financial Accounting','Costing','Auditing','Taxation','Banking','Payroll','Budgeting','Investment','Corporate Finance','Bookkeeping'][i]}`,
    points: 25 + i%5,
    subjects: [['Mathematics','C'],['Accounting','D'],['English','D']]
  })),

  'School of Marketing': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Marketing in ${['Digital Marketing','Branding','Advertising','Sales','Consumer Behaviour','Market Research','Retail Marketing','Public Relations','Media','Strategy'][i]}`,
    points: 24 + i%4,
    subjects: [['English','C'],['Business Studies','D'],['Economics','D']]
  })),

  'School of IT': Array.from({length:10}, (_, i) => ({
    title: `Diploma in IT in ${['Software Dev','Networking','Cyber Security','Web Dev','Databases','Cloud','Support','Systems Admin','Mobile Apps','Data Analytics'][i]}`,
    points: 26 + i%5,
    subjects: [['Mathematics','C'],['Computer Studies','D'],['English','D']]
  })),

  'School of Hospitality': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Hospitality in ${['Hotel Mgmt','Food & Beverage','Tourism','Events','Front Office','Catering','Travel Ops','Resort Mgmt','Customer Care','Tour Guiding'][i]}`,
    points: 23 + i%5,
    subjects: [['English','D'],['Setswana','E'],['Mathematics','D']]
  })),

  'School of Public Administration': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Public Administration in ${['Governance','Policy','Local Govt','NGO Mgmt','Leadership','Public Finance','Urban Mgmt','Service Delivery','Ethics','Development'][i]}`,
    points: 24 + i%4,
    subjects: [['English','C'],['History','D'],['Economics','D']]
  })),

  'School of Legal Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Legal Studies in ${['Law Basics','Criminal Law','Civil Law','Corporate Law','Constitutional','Human Rights','Contracts','Court Procedures','Legal Writing','Ethics'][i]}`,
    points: 25 + i%4,
    subjects: [['English','C'],['History','D'],['Setswana','D']]
  })),

  'School of Creative Arts': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Graphic Design in ${['Illustration','Brand Design','Animation','UI Design','Photography','Video Editing','Motion Graphics','Digital Art','Web Design','Creative Media'][i]}`,
    points: 23 + i%5,
    subjects: [['Art','C'],['English','D'],['Computer Studies','D']]
  })),

  'School of Engineering Trades': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Engineering Trades in ${['Mechanical','Electrical','Civil','Welding','Plumbing','Automotive','Fitting','Construction','Maintenance','Fabrication'][i]}`,
    points: 26 + i%5,
    subjects: [['Mathematics','C'],['Physics','D'],['English','D']]
  })),

  'School of Health Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Health Studies in ${['Public Health','Nursing Assistant','Community Health','Nutrition','Health Admin','Epidemiology','Caregiving','Mental Health','Health Education','Clinical Support'][i]}`,
    points: 25 + i%4,
    subjects: [['Biology','C'],['English','D'],['Mathematics','D']]
  }))
},
 'col-003': {
  'Automotive Engineering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive Mechanics in ${['Engine Repair','Diagnostics','Electrical Systems','Body Repair','Transmission','Vehicle Maintenance','Hybrid Systems','Diesel Engines','Auto Electronics','Workshop Practice'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'],['English','E'],['Physics','E']]
  })),

  'Electrical Engineering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical Installation in ${['Wiring','Circuit Design','Industrial Electrical','Domestic Wiring','Maintenance','Power Systems','Safety Systems','Solar Systems','Fault Finding','Electrical Theory'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'],['Physics','E'],['English','E']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding in ${['Arc Welding','Gas Welding','Fabrication','Metal Work','Structural Welding','Industrial Welding','Pipe Welding','Safety Practices','Tool Use','Workshop Skills'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'],['English','E'],['Physics','E']]
  })),

  'Carpentry': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry in ${['Furniture Making','Roofing','Joinery','Cabinet Making','Construction Carpentry','Wood Finishing','Tools Use','Blueprint Reading','Maintenance','Workshop Practice'][i]}`,
    points: 17 + i%3,
    subjects: [['Mathematics','D'],['English','E'],['Arts','E']]
  })),

  'Plumbing': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing in ${['Pipe Systems','Water Systems','Drainage','Installation','Maintenance','Leak Repair','Industrial Plumbing','Safety','Tools Use','Blueprint Reading'][i]}`,
    points: 18 + i%3,
    subjects: [['Mathematics','D'],['English','E'],['Physics','E']]
  })),

  'Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Construction in ${['Bricklaying','Plastering','Concrete Work','Site Management','Surveying','Structural Work','Safety','Materials','Planning','Maintenance'][i]}`,
    points: 18 + i%3,
    subjects: [['Mathematics','D'],['English','E'],['Geography','E']]
  })),

  'Hospitality': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality in ${['Front Office','Housekeeping','Food Service','Customer Care','Tourism','Hotel Ops','Catering','Events','Travel','Management Basics'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'],['Mathematics','D'],['Setswana','E']]
  })),

  'Agriculture Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Agriculture in ${['Crop Farming','Animal Care','Irrigation','Soil Prep','Farm Tools','Livestock','Harvesting','Storage','Agri Safety','Basic Agronomy'][i]}`,
    points: 17 + i%4,
    subjects: [['Biology','D'],['Mathematics','D'],['English','E']]
  })),

  'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical Fitting in ${['Engine Systems','Machine Repair','Tools Use','Maintenance','Industrial Fitting','Workshop Skills','Safety','Diagnostics','Hydraulics','Assembly'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'],['Physics','E'],['English','E']]
  })),

  'Technical Drawing': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing in ${['Blueprints','CAD Basics','Engineering Drawing','Architecture','Design Principles','Drafting','3D Sketching','Technical Graphics','Planning','Visualization'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'],['Art','E'],['English','E']]
  }))
},

'col-004': {
  'Tourism Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Tourism Management in ${['Safari Operations','Eco Tourism','Travel Planning','Destination Marketing','Tour Guiding','Airline Services','Cruise Tourism','Cultural Tourism','Adventure Tourism','Tourism Policy'][i]}`,
    points: 23 + i%5,
    subjects: [['English','D'],['Geography','D'],['Business Studies','D']]
  })),

  'Hospitality Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Hospitality in ${['Hotel Operations','Food & Beverage','Front Office','Housekeeping','Culinary Arts','Resort Management','Events','Customer Service','Catering','Hospitality Finance'][i]}`,
    points: 24 + i%5,
    subjects: [['English','D'],['Mathematics','D'],['Setswana','E']]
  })),

  'Culinary Arts': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Culinary Arts in ${['Cooking Techniques','Pastry','Food Safety','International Cuisine','Bakery','Kitchen Management','Nutrition','Menu Design','Restaurant Ops','Food Innovation'][i]}`,
    points: 22 + i%4,
    subjects: [['English','D'],['Biology','D'],['Mathematics','E']]
  })),

  'Travel & Aviation Services': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Aviation Tourism in ${['Airline Ops','Airport Services','Cabin Crew','Aviation Safety','Ticketing','Flight Services','Cargo Handling','Aviation Admin','Customer Care','Travel Systems'][i]}`,
    points: 25 + i%4,
    subjects: [['English','C'],['Mathematics','D'],['Geography','C']]
  })),

  'Event Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Event Management in ${['Corporate Events','Weddings','Festivals','Conferences','Sports Events','Cultural Events','Entertainment','Planning','Venue Management','Logistics'][i]}`,
    points: 23 + i%4,
    subjects: [['English','D'],['Business Studies','D'],['Mathematics','D']]
  })),

  'Eco Tourism': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Eco Tourism in ${['Wildlife Tours','Conservation Tourism','Sustainable Travel','Community Tourism','Eco Lodges','Park Tourism','Cultural Heritage','Nature Guiding','Environmental Awareness','Green Tourism'][i]}`,
    points: 24 + i%5,
    subjects: [['Geography','C'],['Biology','D'],['English','D']]
  })),

  'Hotel Administration': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Hotel Administration in ${['Front Desk','Operations','Guest Relations','Hotel Finance','Management','Reservations','Housekeeping','Marketing','Customer Experience','Leadership'][i]}`,
    points: 24 + i%4,
    subjects: [['English','D'],['Business Studies','D'],['Mathematics','D']]
  })),

  'Food & Beverage Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Food & Beverage in ${['Restaurant Service','Bar Management','Food Safety','Catering','Hospitality Ops','Inventory','Customer Service','Menu Planning','Beverage Studies','Quality Control'][i]}`,
    points: 23 + i%4,
    subjects: [['English','D'],['Mathematics','D'],['Business Studies','D']]
  })),

  'Tourism Marketing': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Tourism Marketing in ${['Destination Branding','Digital Tourism','Advertising','Market Research','Social Media','Sales','Strategy','Consumer Behaviour','PR','Campaign Design'][i]}`,
    points: 24 + i%4,
    subjects: [['English','C'],['Business Studies','D'],['Economics','D']]
  })),

  'Cultural Heritage Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Heritage Studies in ${['Museum Work','Archaeology','Cultural Preservation','History Tourism','Traditional Arts','Heritage Sites','Community Culture','Artifacts','Cultural Policy','Research'][i]}`,
    points: 22 + i%4,
    subjects: [['History','C'],['English','D'],['Geography','D']]
  }))
},

'col-005': {
  'Nursing Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Nursing in ${['General Care','Pediatric Care','Midwifery','Emergency Care','Geriatric Care','Community Nursing','Mental Health','Clinical Practice','Patient Care','Health Systems'][i]}`,
    points: 35 + i%5,
    subjects: [['Biology','B'],['English','C'],['Chemistry','C']]
  })),

  'Public Health': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Public Health in ${['Epidemiology','Health Promotion','Disease Control','Community Health','Health Policy','Sanitation','Nutrition','Healthcare Systems','Global Health','Prevention'][i]}`,
    points: 33 + i%5,
    subjects: [['Biology','C'],['English','C'],['Mathematics','C']]
  })),

  'Social Work': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Social Work in ${['Child Protection','Family Services','Community Development','Mental Health Support','Welfare Systems','Rehabilitation','NGO Work','Counselling Basics','Social Policy','Case Management'][i]}`,
    points: 30 + i%4,
    subjects: [['English','C'],['History','C'],['Setswana','D']]
  })),

  'Psychology Support': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Psychology in ${['Counselling','Behavioural Studies','Mental Health','Child Psychology','Social Psychology','Addiction Support','Therapy Basics','Development Psychology','Clinical Support','Human Behaviour'][i]}`,
    points: 31 + i%4,
    subjects: [['English','C'],['Biology','C'],['History','C']]
  })),

  'Health Administration': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Health Administration in ${['Hospital Management','Health Finance','Records Management','Healthcare Policy','Operations','Patient Systems','Clinic Management','Health Ethics','Planning','Administration'][i]}`,
    points: 32 + i%4,
    subjects: [['English','C'],['Business Studies','D'],['Mathematics','C']]
  })),

  'Nutrition & Dietetics': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Nutrition in ${['Human Nutrition','Diet Planning','Food Science','Community Nutrition','Clinical Nutrition','Health Diets','Sports Nutrition','Food Safety','Public Nutrition','Wellness'][i]}`,
    points: 31 + i%4,
    subjects: [['Biology','C'],['Chemistry','C'],['English','D']]
  })),

  'Pharmacy Support': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Pharmacy Support in ${['Dispensing','Drug Safety','Pharmacology Basics','Hospital Pharmacy','Inventory','Medication Management','Clinical Support','Pharmaceutical Care','Compounding','Health Systems'][i]}`,
    points: 34 + i%4,
    subjects: [['Chemistry','C'],['Biology','C'],['English','C']]
  })),

  'Community Care': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Community Care in ${['Home Care','Elderly Care','Disability Support','Community Outreach','Social Support','Healthcare Assistance','Rehabilitation','Counselling','Wellbeing','Support Systems'][i]}`,
    points: 29 + i%4,
    subjects: [['English','D'],['Setswana','D'],['Biology','D']]
  })),

  'Mental Health Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Mental Health in ${['Counselling','Psychiatric Support','Therapy Basics','Addiction Recovery','Stress Management','Trauma Care','Behavioural Health','Community Support','Clinical Assistance','Awareness'][i]}`,
    points: 32 + i%4,
    subjects: [['English','C'],['Biology','C'],['History','C']]
  })),

  'Medical Laboratory Support': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Laboratory Science in ${['Diagnostics','Microbiology','Hematology','Biochemistry','Lab Techniques','Sample Testing','Pathology Basics','Medical Analysis','Lab Safety','Clinical Testing'][i]}`,
    points: 35 + i%5,
    subjects: [['Biology','B'],['Chemistry','B'],['English','C']]
  }))
},

'col-006': {
  'Software Development': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Software Development in ${['Web Apps','Mobile Apps','Backend Systems','Frontend Systems','API Design','Full Stack','Testing','DevOps','Cloud Apps','Software Architecture'][i]}`,
    points: 26 + i%5,
    subjects: [['Mathematics','C'],['Computer Studies','C'],['English','D']]
  })),

  'Cyber Security': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Cyber Security in ${['Ethical Hacking','Network Security','Forensics','Cryptography','Risk Management','Security Ops','Malware Analysis','Incident Response','Cloud Security','Cyber Law'][i]}`,
    points: 27 + i%5,
    subjects: [['Mathematics','C'],['Computer Studies','B'],['English','C']]
  })),

  'Data Science': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Data Science in ${['Analytics','Machine Learning','Big Data','Visualization','Statistics','Data Mining','Predictive Modelling','AI Basics','Data Engineering','BI Systems'][i]}`,
    points: 28 + i%5,
    subjects: [['Mathematics','B'],['Computer Studies','C'],['English','C']]
  })),

  'Networking': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Networking in ${['LAN/WAN','Network Admin','Routing','Switching','Cloud Networks','Security','Infrastructure','Systems Admin','Wireless Networks','Troubleshooting'][i]}`,
    points: 25 + i%4,
    subjects: [['Mathematics','C'],['Computer Studies','C'],['English','D']]
  })),

  'IT Support': Array.from({length:10}, (_, i) => ({
    title: `Diploma in IT Support in ${['Help Desk','Hardware Repair','Software Support','Systems Maintenance','User Support','Networking Basics','Security Basics','Cloud Basics','Troubleshooting','Customer IT Service'][i]}`,
    points: 24 + i%4,
    subjects: [['Computer Studies','C'],['English','D'],['Mathematics','D']]
  })),

  'Cloud Computing': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Cloud Computing in ${['AWS Basics','Azure','Cloud Security','Virtualization','Serverless','DevOps','Infrastructure','Cloud Storage','Distributed Systems','Cloud Admin'][i]}`,
    points: 27 + i%5,
    subjects: [['Mathematics','C'],['Computer Studies','B'],['English','C']]
  })),

  'Web Development': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Web Development in ${['Frontend','Backend','Full Stack','UI Design','UX Design','JavaScript','React','Node.js','Databases','Web Security'][i]}`,
    points: 25 + i%4,
    subjects: [['Computer Studies','C'],['English','D'],['Mathematics','D']]
  })),

  'Mobile App Development': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Mobile Development in ${['Android','iOS','Flutter','React Native','App Design','Backend Integration','UI/UX','Testing','Deployment','Performance'][i]}`,
    points: 26 + i%5,
    subjects: [['Computer Studies','C'],['Mathematics','C'],['English','D']]
  })),

  'AI Fundamentals': Array.from({length:10}, (_, i) => ({
    title: `Diploma in AI in ${['Machine Learning','Neural Networks','NLP','Computer Vision','Robotics','Data Modelling','AI Ethics','Deep Learning','Automation','AI Systems'][i]}`,
    points: 29 + i%5,
    subjects: [['Mathematics','B'],['Computer Studies','B'],['English','C']]
  })),

  'Digital Media': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Digital Media in ${['Graphic Design','Animation','Video Editing','Motion Graphics','UI Design','Content Creation','Photography','Brand Design','Web Media','Creative Tech'][i]}`,
    points: 24 + i%4,
    subjects: [['Art','C'],['Computer Studies','C'],['English','D']]
  }))
},

'col-007': {
  'Mechanical Engineering': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Mechanical Engineering in ${['Thermodynamics','Machines','Manufacturing','Automotive','Materials','Hydraulics','Design','Maintenance','Robotics','Industrial Systems'][i]}`,
    points: 28 + i%5,
    subjects: [['Mathematics','B'],['Physics','C'],['English','C']]
  })),

  'Electrical Engineering': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Electrical Engineering in ${['Power Systems','Electronics','Control Systems','Solar Energy','Grid Systems','Installations','Maintenance','Automation','Circuits','Industrial Electrical'][i]}`,
    points: 28 + i%5,
    subjects: [['Mathematics','B'],['Physics','C'],['English','C']]
  })),

  'Civil Engineering': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Civil Engineering in ${['Structural','Construction','Roads','Bridges','Surveying','Water Systems','Materials','Planning','Geotechnical','Urban Infrastructure'][i]}`,
    points: 27 + i%5,
    subjects: [['Mathematics','B'],['Physics','C'],['English','C']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Welding in ${['Arc Welding','Gas Welding','Fabrication','Industrial Welding','Pipe Welding','Structural','Safety','Tools','Maintenance','Metals'][i]}`,
    points: 24 + i%4,
    subjects: [['Mathematics','C'],['English','D'],['Physics','D']]
  })),

  'Automotive Engineering': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Automotive Engineering in ${['Engines','Diagnostics','Electric Vehicles','Transmission','Maintenance','Body Repair','Systems','Design','Testing','Performance'][i]}`,
    points: 26 + i%5,
    subjects: [['Mathematics','B'],['Physics','C'],['English','C']]
  })),

  'Plumbing': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Plumbing in ${['Water Systems','Drainage','Installation','Maintenance','Industrial Plumbing','Leak Repair','Design','Safety','Tools','Construction'][i]}`,
    points: 23 + i%4,
    subjects: [['Mathematics','D'],['English','D'],['Physics','D']]
  })),

  'Carpentry': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Carpentry in ${['Furniture','Construction','Joinery','Roofing','Cabinet Making','Design','Tools','Maintenance','Finishing','Blueprints'][i]}`,
    points: 23 + i%4,
    subjects: [['Mathematics','D'],['English','D'],['Art','D']]
  })),

  'Industrial Technology': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Industrial Technology in ${['Automation','Production','Manufacturing','Systems','Logistics','Quality Control','Operations','Maintenance','Safety','Engineering Basics'][i]}`,
    points: 25 + i%4,
    subjects: [['Mathematics','C'],['Physics','C'],['English','C']]
  })),

  'Energy Systems': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Energy Systems in ${['Solar','Wind','Hydro','Power Systems','Energy Storage','Grid','Renewables','Design','Maintenance','Energy Policy'][i]}`,
    points: 26 + i%5,
    subjects: [['Physics','C'],['Mathematics','C'],['English','C']]
  })),

  'Construction Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Construction in ${['Bricklaying','Plastering','Site Management','Materials','Surveying','Safety','Planning','Design','Infrastructure','Building Systems'][i]}`,
    points: 24 + i%4,
    subjects: [['Mathematics','D'],['English','D'],['Geography','D']]
  }))
},

'col-008': {
  'Crop Production': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Crop Production in ${['Cereals','Vegetables','Fruits','Irrigation','Pest Control','Soil Management','Greenhouse Farming','Harvesting','Storage','Agronomy'][i]}`,
    points: 22 + i%4,
    subjects: [['Biology','C'],['Agriculture','C'],['English','D']]
  })),

  'Animal Science': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Animal Science in ${['Livestock','Poultry','Dairy','Nutrition','Breeding','Health','Veterinary Basics','Farm Management','Production','Disease Control'][i]}`,
    points: 23 + i%4,
    subjects: [['Biology','C'],['Agriculture','C'],['English','D']]
  })),

  'Horticulture': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Horticulture in ${['Gardening','Floriculture','Landscaping','Nursery','Plant Care','Greenhouse','Irrigation','Soil Science','Design','Production'][i]}`,
    points: 21 + i%4,
    subjects: [['Biology','C'],['English','D'],['Agriculture','C']]
  })),

  'Agri-Business': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Agri-Business in ${['Farm Finance','Marketing','Supply Chain','Trade','Management','Economics','Export','Production','Planning','Entrepreneurship'][i]}`,
    points: 24 + i%4,
    subjects: [['Business Studies','C'],['Economics','C'],['English','D']]
  })),

  'Soil Science': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Soil Science in ${['Soil Fertility','Erosion Control','Composition','Land Use','Testing','Chemistry','Management','Conservation','Analysis','Sustainability'][i]}`,
    points: 23 + i%4,
    subjects: [['Biology','C'],['Chemistry','C'],['English','D']]
  })),

  'Agricultural Engineering': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Agricultural Engineering in ${['Machinery','Irrigation Systems','Farm Design','Automation','Mechanization','Equipment','Maintenance','Water Systems','Energy','Construction'][i]}`,
    points: 25 + i%4,
    subjects: [['Mathematics','C'],['Physics','C'],['Agriculture','C']]
  })),

  'Environmental Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Environmental Studies in ${['Conservation','Pollution Control','Climate Change','Policy','Ecosystems','Waste Management','Sustainability','Monitoring','Education','Protection'][i]}`,
    points: 23 + i%4,
    subjects: [['Biology','C'],['Geography','C'],['English','D']]
  })),

  'Wildlife Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Wildlife Management in ${['Game Parks','Conservation','Animal Behaviour','Ecotourism','Protection','Monitoring','Reserves','Habitat','Policy','Field Work'][i]}`,
    points: 24 + i%4,
    subjects: [['Biology','C'],['Geography','C'],['English','D']]
  })),

  'Farm Management': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Farm Management in ${['Operations','Planning','Finance','Production','Labour','Marketing','Equipment','Logistics','Strategy','Sustainability'][i]}`,
    points: 24 + i%4,
    subjects: [['Business Studies','C'],['Agriculture','C'],['English','D']]
  })),

  'Food Technology': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Food Technology in ${['Processing','Safety','Preservation','Packaging','Quality Control','Nutrition','Production','Storage','Innovation','Supply Chain'][i]}`,
    points: 24 + i%4,
    subjects: [['Biology','C'],['Chemistry','C'],['English','D']]
  }))
},

'col-009': {
  'Graphic Design': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Graphic Design in ${['Branding','Illustration','Typography','UI Design','Packaging','Advertising','Digital Art','Motion Graphics','Web Design','Creative Media'][i]}`,
    points: 22 + i%4,
    subjects: [['Art','C'],['English','D'],['Computer Studies','D']]
  })),

  'Film Production': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Film Production in ${['Directing','Editing','Cinematography','Script Writing','Sound','Production','Lighting','Storytelling','Post Production','Media Studies'][i]}`,
    points: 23 + i%4,
    subjects: [['English','C'],['Art','C'],['Computer Studies','D']]
  })),

  'Music Production': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Music Production in ${['Audio Engineering','Mixing','Mastering','Composition','Sound Design','Performance','Recording','Production','Digital Music','Music Theory'][i]}`,
    points: 21 + i%4,
    subjects: [['Music','C'],['English','D'],['Computer Studies','D']]
  })),

  'Animation': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Animation in ${['2D Animation','3D Animation','Game Assets','Modeling','Storyboarding','Visual Effects','Rigging','Motion Design','Character Design','Rendering'][i]}`,
    points: 24 + i%4,
    subjects: [['Art','C'],['Computer Studies','C'],['English','D']]
  })),

  'Photography': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Photography in ${['Portrait','Wildlife','Commercial','Fashion','Editing','Lighting','Studio Work','Digital Imaging','Photojournalism','Creative Photography'][i]}`,
    points: 21 + i%4,
    subjects: [['Art','C'],['English','D'],['Computer Studies','D']]
  })),

  'Performing Arts': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Performing Arts in ${['Theatre','Dance','Drama','Acting','Stage Production','Directing','Voice Training','Choreography','Performance Arts','Script Interpretation'][i]}`,
    points: 20 + i%4,
    subjects: [['English','C'],['Art','C'],['Setswana','D']]
  })),

  'Digital Media': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Digital Media in ${['Content Creation','Social Media','Video Editing','Digital Marketing','Web Content','Streaming','Influencer Media','Brand Content','UX Media','Digital Strategy'][i]}`,
    points: 23 + i%4,
    subjects: [['English','C'],['Computer Studies','C'],['Business Studies','D']]
  })),

  'Fashion Design': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Fashion Design in ${['Textiles','Garment Design','Fashion Illustration','Styling','Pattern Making','Branding','Retail Fashion','Cultural Fashion','Production','Fashion Marketing'][i]}`,
    points: 21 + i%4,
    subjects: [['Art','C'],['English','D'],['Business Studies','D']]
  })),

  'Interior Design': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Interior Design in ${['Space Planning','Architecture Basics','Furniture Design','Lighting','Decoration','3D Design','Residential Design','Commercial Design','CAD Design','Creative Interiors'][i]}`,
    points: 22 + i%4,
    subjects: [['Art','C'],['Mathematics','D'],['English','D']]
  })),

  'Creative Writing': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Creative Writing in ${['Poetry','Fiction','Non-fiction','Script Writing','Journalism','Editing','Publishing','Storytelling','Literature','Content Writing'][i]}`,
    points: 20 + i%4,
    subjects: [['English','C'],['History','D'],['Setswana','D']]
  }))
},

'col-010': {
  'General Engineering': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Engineering Studies in ${['Mechanical','Electrical','Civil','Industrial','Automotive','Mining','Energy','Systems','Design','Maintenance'][i]}`,
    points: 28 + i%5,
    subjects: [['Mathematics','B'],['Physics','C'],['English','C']]
  })),

  'Business Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Business Studies in ${['Management','Accounting','Marketing','Finance','Entrepreneurship','HR','Operations','Strategy','Retail','Economics'][i]}`,
    points: 24 + i%4,
    subjects: [['English','C'],['Mathematics','C'],['Economics','D']]
  })),

  'Information Technology': Array.from({length:10}, (_, i) => ({
    title: `Diploma in IT in ${['Software','Networking','Cyber Security','Cloud','Data','Web','Mobile','Support','Systems','AI Basics'][i]}`,
    points: 26 + i%5,
    subjects: [['Mathematics','C'],['Computer Studies','C'],['English','D']]
  })),

  'Health Sciences': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Health Sciences in ${['Nursing','Public Health','Nutrition','Pharmacy','Epidemiology','Caregiving','Mental Health','Community Health','Lab Support','Health Admin'][i]}`,
    points: 33 + i%5,
    subjects: [['Biology','C'],['English','C'],['Mathematics','D']]
  })),

  'Agriculture': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Agriculture in ${['Crop','Animal','Soil','Agri-Business','Horticulture','Farming','Food Systems','Irrigation','Livestock','Sustainability'][i]}`,
    points: 22 + i%4,
    subjects: [['Biology','C'],['Agriculture','C'],['English','D']]
  })),

  'Creative Arts': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Creative Arts in ${['Design','Music','Film','Animation','Photography','Fashion','Interior','Writing','Media','Performance'][i]}`,
    points: 21 + i%4,
    subjects: [['Art','C'],['English','D'],['Computer Studies','D']]
  })),

  'Law Studies': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Law Studies in ${['Criminal','Civil','Corporate','Constitutional','Human Rights','Legal Practice','Contracts','Court Systems','Ethics','Legal Writing'][i]}`,
    points: 25 + i%4,
    subjects: [['English','C'],['History','D'],['Setswana','D']]
  })),

  'Education': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Education in ${['Primary','Secondary','Special Needs','Early Childhood','Curriculum','Leadership','Language','Math Teaching','Science Teaching','Adult Education'][i]}`,
    points: 24 + i%4,
    subjects: [['English','C'],['Setswana','C'],['Mathematics','D']]
  })),

  'Tourism': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Tourism in ${['Travel','Safari','Eco Tourism','Hospitality','Events','Marketing','Guiding','Cultural','Adventure','Airline Services'][i]}`,
    points: 23 + i%4,
    subjects: [['English','C'],['Geography','C'],['Business Studies','D']]
  })),

  'Applied Sciences': Array.from({length:10}, (_, i) => ({
    title: `Diploma in Applied Sciences in ${['Physics','Chemistry','Biology','Environmental','Laboratory','Research','Industrial','Mathematics','Technology','Innovation'][i]}`,
    points: 27 + i%4,
    subjects: [['Mathematics','B'],['Science','C'],['English','C']]
  }))
}
  
};

// Quick way for all other colleges:
Object.keys(COLLEGE_FACULTIES).forEach(key => {
  if (key === 'col-001') return;
  COLLEGE_FACULTIES[key] = { ...COLLEGE_FACULTIES['col-001'] }; // Copy and customize later if needed
});

// ─────────────────────────────────────────────────────────────────────────────
// BRIGADE_FACULTIES - 10 Unique Faculties per Brigade, 10 Courses each (min 2 subjects)
// ─────────────────────────────────────────────────────────────────────────────
const BRIGADE_FACULTIES = {
  'brig-001': { // Francicity Brigade
    'Automotive Department': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Building & Construction': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Electrical Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
      points: 16 + i%4,
      subjects: [['English','E'], ['Mathematics','D']]
    })),
    'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Plumbing & Pipe Fitting': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Mechanical Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Agriculture & Farm Mechanics': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Agricultural ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
      points: 17 + i%4,
      subjects: [['Biology','D'], ['Mathematics','D']]
    })),
    'Technical Drawing & Design': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    }))
  },

    'brig-002': { // Gaborone Brigade - Capital, more diverse technical focus
    'Automotive Department': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Building & Construction': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Electrical Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
      points: 16 + i%4,
      subjects: [['English','E'], ['Mathematics','D']]
    })),
    'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Plumbing & Pipe Fitting': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Mechanical Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Agriculture & Farm Mechanics': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Agricultural ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
      points: 17 + i%4,
      subjects: [['Biology','D'], ['Mathematics','D']]
    })),
    'Technical Drawing & Design': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    }))
  },

   'brig-003': { // Palapye Brigade - Mining & Industrial focus
    'Mining Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Mining ${['Operations','Safety','Equipment Maintenance','Blasting','Underground Mining','Surface Mining','Mineral Processing','Mine Survey','Ventilation','Rescue'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Heavy Plant Mechanics': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Heavy Plant ${['Excavator','Bulldozer','Loader','Grader','Dump Truck','Crane Operation','Maintenance','Hydraulics','Pneumatics','Diagnostics'][i]}`,
      points: 19 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Electrical Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Electrical ${['Installation','Industrial','Mining Electrical','Solar Systems','Motor Control','Wiring','Instrumentation','PLC Basics','Maintenance','Safety'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Welding ${['Arc','MIG','TIG','Pipe','Structural','Heavy Fabrication','Maintenance','Boilermaking','Aluminium','Stainless'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Mechanical Fitting ${['General','Plant','Mining','Hydraulics','Pneumatics','Alignment','Maintenance','Machining','Turning','Milling'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['Physics','E']]
    })),
    'Plumbing & Pipe Fitting': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
      points: 18 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Carpentry & Construction': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Carpentry ${['Furniture Making','Joinery','Formwork','Roof Construction','Concrete Formwork','Masonry Support','Site Carpentry','Finishing','Restoration','Structural'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Automotive Department': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Automotive ${['Mechanics','Diesel Engines','Petrol Engines','Auto Electrical','Transmission Systems','Vehicle Diagnostics','Wheel Alignment','Brake Systems','Suspension','Fleet Maintenance'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    })),
    'Agriculture Trades': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Agricultural ${['Mechanics','Tractor Operation','Irrigation Systems','Crop Machinery','Livestock Equipment','Farm Tools Maintenance','Poultry Systems','Greenhouse Technology','Soil Equipment','Agro Processing'][i]}`,
      points: 17 + i%4,
      subjects: [['Biology','D'], ['Mathematics','D']]
    })),
    'Technical Skills': Array.from({length:10}, (_, i) => ({
      title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD Basics','Structural Drawing','Electrical Drawing','Mechanical Drawing','Survey Drawing','3D Modelling','Blueprint Reading','Drafting Techniques'][i]}`,
      points: 17 + i%4,
      subjects: [['Mathematics','D'], ['English','E']]
    }))
  },

 'brig-004': {
  'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Safari Lodge Operations'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'], ['Mathematics','D']]
  })),

  'Tourism Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Tourism ${['Safari Guiding','Boat Operation','Wildlife Management','Eco Tourism','Travel Agency','Event Management','Cultural Tourism','Community Tourism','Tour Operations','Hospitality Management'][i]}`,
    points: 17 + i%4,
    subjects: [['English','D'], ['Geography','E']]
  })),

  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
},
  'brig-005': {
  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'], ['Mathematics','D']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Agriculture Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Agricultural Mechanics ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
    points: 17 + i%4,
    subjects: [['Biology','D'], ['Mathematics','D']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
},

 'brig-006': {
  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'], ['Mathematics','D']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Agriculture Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Agricultural Mechanics ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
    points: 17 + i%4,
    subjects: [['Biology','D'], ['Mathematics','D']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
},

 'brig-007': {
  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'], ['Mathematics','D']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Agriculture Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Agricultural Mechanics ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
    points: 17 + i%4,
    subjects: [['Biology','D'], ['Mathematics','D']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
},

 'brig-008': {
  'Mining Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mining ${['Operations','Safety','Equipment Maintenance','Blasting','Underground Mining','Surface Mining','Mineral Processing','Mine Survey','Ventilation','Rescue'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Heavy Plant Mechanics': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Heavy Plant ${['Excavator','Bulldozer','Loader','Grader','Dump Truck','Crane Operation','Maintenance','Hydraulics','Pneumatics','Diagnostics'][i]}`,
    points: 19 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
},

  'brig-009': {
  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'], ['Mathematics','D']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Agriculture Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Agricultural Mechanics ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
    points: 17 + i%4,
    subjects: [['Biology','D'], ['Mathematics','D']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
},

  'brig-010': {
  'Automotive Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Automotive ${['Mechanics','Electronics','Body Repair','Diesel Engines','Petrol Engines','Auto Electrical','Transmission','Diagnostics','Wheel Alignment','Vehicle Inspection'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Building & Construction': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Building ${['Bricklaying','Plastering','Painting','Carpentry','Roofing','Concrete Works','Site Management','Quantity Survey','Masonry','Tiling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Electrical Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Electrical ${['Installation','Wiring','Solar Systems','Motor Control','Domestic Wiring','Industrial Wiring','Refrigeration','Air Conditioning','Electronics','Instrumentation'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Hospitality & Catering': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Hospitality ${['Cooking','Baking','Food Service','Housekeeping','Front Office','Bartending','Waitering','Catering','Event Support','Laundry'][i]}`,
    points: 16 + i%4,
    subjects: [['English','E'], ['Mathematics','D']]
  })),

  'Welding & Fabrication': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Welding ${['Arc Welding','MIG','TIG','Fabrication','Pipe Welding','Structural','Gas Welding','Maintenance','Heavy Equipment','Artisan'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Carpentry & Joinery': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Carpentry ${['Furniture Making','Joinery','Cabinetry','Roof Construction','Formwork','Wood Machining','Finishing','Restoration','Staircase','Boat Building'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Plumbing Department': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Plumbing ${['Domestic','Industrial','Drainage','Water Supply','Sanitation','Pipe Fitting','Solar Plumbing','Irrigation','Gas Fitting','Maintenance'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  })),

  'Mechanical Fitting': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Mechanical ${['Fitting','Machining','Boilermaking','Maintenance','Hydraulics','Pneumatics','Plant Mechanics','Tool Making','Turning','Milling'][i]}`,
    points: 18 + i%4,
    subjects: [['Mathematics','D'], ['Physics','E']]
  })),

  'Agriculture Trades': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Agricultural Mechanics ${['Mechanics','Tractor Operation','Irrigation','Crop Production','Livestock','Poultry','Soil Conservation','Farm Management','Agro Processing','Greenhouse'][i]}`,
    points: 17 + i%4,
    subjects: [['Biology','D'], ['Mathematics','D']]
  })),

  'Technical Skills': Array.from({length:10}, (_, i) => ({
    title: `Certificate in Technical Drawing ${['Architectural','Engineering','CAD','Structural','Electrical','Mechanical','Survey','3D Modelling','Blueprint','Drafting'][i]}`,
    points: 17 + i%4,
    subjects: [['Mathematics','D'], ['English','E']]
  }))
}
};

// Quick copy for remaining brigades


// Seeding Functions (Updated to use the new data)
async function seedUniversities() {
  for (const institution of universities) {
    await safeSet(db.collection('institutions').doc(institution.id), {
      ...institution,
      category: 'university',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const facultiesData = UNIVERSITY_FACULTIES[institution.id] || UNIVERSITY_FACULTIES['uni-010'];
    let facultyCounter = 1;

    for (const [facultyName, courses] of Object.entries(facultiesData)) {
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
          tuitionPerYear: 22000 + Math.floor(Math.random() * 18000),
          entryRequirements: {
            acceptedQualifications: ['BGCSE', 'IGCSE'],
            minimumPoints: course.points,
            subjectRequirements: course.subjects.map(([subject, grade]) => ({ subject, minimumGrade: grade })),
            englishRequired: true
          },
          careerPaths: ['Professional roles in the field'],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }
}

// Similar functions for colleges and brigades (same logic as original)
async function seedColleges() {
  for (const institution of colleges) {
    await safeSet(db.collection('institutions').doc(institution.id), {
      ...institution,
      category: 'college',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    const facultiesData = COLLEGE_FACULTIES[institution.id];
    let facultyCounter = 1;

    for (const [facultyName, courses] of Object.entries(facultiesData)) {
      const facultyId = `${institution.id}-fac-${String(facultyCounter++).padStart(3,'0')}`;
      await safeSet(db.collection('faculties').doc(facultyId), {
        id: facultyId,
        institutionId: institution.id,
        institutionType: 'college',
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
          qualificationLevel: 'Diploma',
          duration: '3 Years',
          mode: 'Full-time',
          requiredPoints: course.points,
          tuitionPerYear: 15000 + Math.floor(Math.random() * 8000),
          entryRequirements: {
            acceptedQualifications: ['BGCSE', 'IGCSE'],
            minimumPoints: course.points,
            subjectRequirements: course.subjects.map(([subject, grade]) => ({ subject, minimumGrade: grade })),
            englishRequired: true
          },
          careerPaths: ['Skilled professional roles'],
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

    const facultiesData = BRIGADE_FACULTIES[institution.id];
    let facultyCounter = 1;

    for (const [facultyName, courses] of Object.entries(facultiesData)) {
      const facultyId = `${institution.id}-fac-${String(facultyCounter++).padStart(3,'0')}`;
      await safeSet(db.collection('faculties').doc(facultyId), {
        id: facultyId,
        institutionId: institution.id,
        institutionType: 'brigade',
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
          qualificationLevel: 'Certificate',
          duration: '2 Years',
          mode: 'Full-time',
          requiredPoints: course.points,
          tuitionPerYear: 8000 + Math.floor(Math.random() * 4000),
          entryRequirements: {
            acceptedQualifications: ['BGCSE', 'JGCE'],
            minimumPoints: course.points,
            subjectRequirements: course.subjects.map(([subject, grade]) => ({ subject, minimumGrade: grade })),
            englishRequired: true
          },
          careerPaths: ['Skilled artisan roles'],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }
}

async function seedAll() {
  try {
    console.log('🚀 Starting full realistic seed with 10 faculties × 10 courses each...');
    await seedUniversities();
    await seedColleges();
    await seedBrigades();
    await commitBatch();
    console.log('🎉 SUCCESS - All institutions seeded successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}

seedAll();