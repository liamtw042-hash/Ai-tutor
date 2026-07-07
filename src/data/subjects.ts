import type { Subject, SubjectArea, SubjectId, Verification, YearLevel } from "@/types";

// ---------------------------------------------------------------------------
// NSW subject catalogue for Years 10–12, grouped by NESA Key Learning Area.
//
// The subject LIST, names and KLAs were confirmed this session against NESA's
// official Senior (11–12) syllabus index (curriculum.nsw.edu.au/stages/senior)
// and the K–10 learning areas. Topic structures are marked per subject:
//   verified   — topic/module list confirmed against a NESA syllabus page
//   structural — the established real syllabus structure (not re-fetched
//                page-by-page this session)
//   approx     — indicative list (competency/elective courses whose content
//                varies by school, or generic language themes)
// See the final report for the full per-subject breakdown. Existing subject
// ids (biology, math-adv, …) are preserved so the seed question bank stays valid.
//
// NOTE ON SYLLABUS TRANSITION: NESA is rolling out new 2024/2025 Stage 6
// syllabuses (phasing in 2027–2028). The structures here reflect the syllabuses
// current for the 2026–2027 HSC. Some current Stage 6 course names differ from
// older ones (e.g. PDHPE → Health and Movement Science; SDD/IPT → Software
// Engineering / Enterprise Computing).
// ---------------------------------------------------------------------------

const GRAD: Record<SubjectArea, [string, string]> = {
  English: ["#a5a8fc", "#7c65f1"],
  Mathematics: ["#7c65f1", "#5d37c9"],
  Science: ["#34d399", "#059669"],
  HSIE: ["#fbbf24", "#b45309"],
  "Creative Arts": ["#f472b6", "#a21caf"],
  TAS: ["#38bdf8", "#2563eb"],
  PDHPE: ["#fb7185", "#e11d48"],
  Languages: ["#c084fc", "#7c3aed"],
  VET: ["#94a3b8", "#475569"],
};

interface Def {
  id: string;
  name: string;
  short?: string;
  area: SubjectArea;
  icon: string;
  blurb: string;
  bands?: number;
  verification?: Verification;
  y10?: string[];
  y11?: string[];
  y12?: string[];
}

function build(d: Def): Subject {
  const years: YearLevel[] = [];
  if (d.y10 && d.y10.length) years.push("year10");
  if (d.y11 && d.y11.length) years.push("year11");
  if (d.y12 && d.y12.length) years.push("year12");
  const topicsByYear: Record<YearLevel, string[]> = {
    year10: d.y10 ?? [],
    year11: d.y11 ?? [],
    year12: d.y12 ?? [],
  };
  const topics =
    (d.y12 && d.y12.length && d.y12) ||
    (d.y11 && d.y11.length && d.y11) ||
    (d.y10 ?? []);
  return {
    id: d.id,
    name: d.name,
    short: d.short ?? d.name,
    area: d.area,
    gradient: GRAD[d.area],
    icon: d.icon,
    blurb: d.blurb,
    bands: d.bands ?? 6,
    verification: d.verification ?? "structural",
    years,
    topicsByYear,
    topics: topics as string[],
  };
}

const DEFS: Def[] = [
  // ============================ ENGLISH ============================
  {
    id: "english-5", name: "English (Stage 5)", short: "English", area: "English", icon: "✎",
    blurb: "Mandatory Stage 5 English — reading, writing and responding.",
    y10: ["Reading & Responding to Texts", "Composing & Writing", "Drama & Shakespeare", "Poetry, Film & Media", "Critical & Imaginative Texts"],
  },
  {
    id: "english-std", name: "English Standard", short: "English Std", area: "English", icon: "✎",
    blurb: "Language, identity and culture through prescribed texts.",
    y11: ["Reading to Write (Common Module)", "Contemporary Possibilities (Module A)", "Close Study of Literature (Module B)"],
    y12: ["Common Module: Texts and Human Experiences", "Module A: Language, Identity and Culture", "Module B: Close Study of Literature", "Module C: The Craft of Writing"],
  },
  {
    id: "english-adv", name: "English Advanced", short: "English Adv", area: "English", icon: "✎",
    blurb: "Textual Conversations, Critical Study and the Craft of Writing.",
    y11: ["Reading to Write (Common Module)", "Narratives that Shape Our World (Module A)", "Critical Study of Literature (Module B)"],
    y12: ["Common Module: Texts and Human Experiences", "Module A: Textual Conversations", "Module B: Critical Study of Literature", "Module C: The Craft of Writing"],
  },
  {
    id: "english-ext1", name: "English Extension 1", short: "English Ext 1", area: "English", icon: "✍", bands: 4,
    blurb: "Literary worlds and the theory behind texts.",
    y11: ["Texts, Culture and Value (Common Module)", "Related Texts & Independent Investigation"],
    y12: ["Literary Worlds (Common Module)", "Elective (e.g. Literary Homelands, Worlds of Upheaval)", "Related Texts"],
  },
  {
    id: "english-ext2", name: "English Extension 2", short: "English Ext 2", area: "English", icon: "✍", bands: 4,
    blurb: "Compose a sustained, original Major Work.",
    y12: ["The Major Work (extended composition)", "Reflection Statement", "The Craft of Writing (portfolio)"],
  },
  {
    id: "english-studies", name: "English Studies", short: "English Studies", area: "English", icon: "✎",
    blurb: "Practical English for work, community and everyday life.",
    y11: ["Achieving through English (Common Module)", "Modules (e.g. We Are Australians, On the Road)"],
    y12: ["Common Module: Texts and Human Experiences", "Modules (school-selected)", "Optional HSC exam / project"],
  },
  {
    id: "english-eald", name: "English EAL/D", short: "English EAL/D", area: "English", icon: "✎",
    blurb: "English for students from a language background other than English.",
    y11: ["Language and Texts in Context", "Close Study of Text"],
    y12: ["Common Module: Texts and Human Experiences", "Module A: Language, Identity and Culture", "Module B: Close Study of Text", "Module C: The Craft of Writing"],
  },

  // ========================== MATHEMATICS ==========================
  {
    id: "math-5", name: "Mathematics (Stage 5)", short: "Maths", area: "Mathematics", icon: "∑",
    blurb: "Stage 5 number, algebra, measurement, geometry and statistics.",
    y10: ["Number & Finance", "Algebra & Equations", "Linear & Non-linear Relationships", "Pythagoras & Trigonometry", "Measurement", "Statistics & Probability"],
  },
  {
    id: "math-standard", name: "Mathematics Standard", short: "Maths Std", area: "Mathematics", icon: "∑",
    blurb: "Everyday maths — finance, measurement, statistics and networks.",
    y11: ["Algebra", "Measurement", "Financial Mathematics", "Statistical Analysis"],
    y12: ["Algebra", "Measurement", "Financial Mathematics", "Statistical Analysis", "Networks"],
  },
  {
    id: "math-adv", name: "Mathematics Advanced", short: "Maths Adv", area: "Mathematics", icon: "∑",
    blurb: "Functions, calculus, statistical analysis and financial maths.",
    y11: ["Functions", "Trigonometric Functions", "Calculus (Introduction)", "Exponential & Logarithmic Functions"],
    y12: ["Functions", "Trigonometric Functions", "Calculus", "Financial Mathematics", "Statistical Analysis"],
  },
  {
    id: "math-ext1", name: "Mathematics Extension 1", short: "Maths Ext 1", area: "Mathematics", icon: "∫", bands: 4,
    blurb: "Proof, vectors, further calculus and the binomial distribution.",
    y11: ["Further Work with Functions", "Trigonometric Functions & Identities", "Further Calculus Skills", "Combinatorics"],
    y12: ["Proof", "Vectors", "Trigonometric Equations", "Applications of Calculus", "The Binomial Distribution"],
  },
  {
    id: "math-ext2", name: "Mathematics Extension 2", short: "Maths Ext 2", area: "Mathematics", icon: "∫", bands: 4,
    blurb: "Complex numbers, rigorous proof, mechanics and further calculus.",
    y12: ["The Nature of Proof", "Complex Numbers", "Further Integration", "Vectors & Mechanics", "Applications of Calculus"],
  },

  // ============================ SCIENCE ============================
  {
    id: "science-5", name: "Science (Stage 5)", short: "Science", area: "Science", icon: "\u{1F52C}",
    blurb: "Mandatory Stage 5 science across the physical, chemical and living worlds.",
    y10: ["Physical World (Forces & Energy)", "Chemical World (Reactions)", "Living World (Genetics & Evolution)", "Earth & Space", "Working Scientifically"],
  },
  {
    id: "biology", name: "Biology", short: "Biology", area: "Science", icon: "\u{1F9EC}",
    blurb: "Cells, biodiversity, heredity, genetics and disease.",
    y11: ["Module 1: Cells as the Basis of Life", "Module 2: Organisation of Living Things", "Module 3: Biological Diversity", "Module 4: Ecosystem Dynamics"],
    y12: ["Module 5: Heredity", "Module 6: Genetic Change", "Module 7: Infectious Disease", "Module 8: Non-infectious Disease and Disorders"],
  },
  {
    id: "chemistry", name: "Chemistry", short: "Chemistry", area: "Science", icon: "⚗",
    blurb: "Matter, quantitative chemistry, equilibrium and organic chemistry.",
    y11: ["Module 1: Properties and Structure of Matter", "Module 2: Introduction to Quantitative Chemistry", "Module 3: Reactive Chemistry", "Module 4: Drivers of Reactions"],
    y12: ["Module 5: Equilibrium and Acid Reactions", "Module 6: Acid/Base Reactions", "Module 7: Organic Chemistry", "Module 8: Applying Chemical Ideas"],
  },
  {
    id: "physics", name: "Physics", short: "Physics", area: "Science", icon: "\u{1F6F0}",
    blurb: "Motion, forces, waves, electromagnetism and the atom.",
    y11: ["Module 1: Kinematics", "Module 2: Dynamics", "Module 3: Waves and Thermodynamics", "Module 4: Electricity and Magnetism"],
    y12: ["Module 5: Advanced Mechanics", "Module 6: Electromagnetism", "Module 7: The Nature of Light", "Module 8: From the Universe to the Atom"],
  },
  {
    id: "investigating-science", name: "Investigating Science", short: "Invest. Science", area: "Science", icon: "\u{1F52D}",
    blurb: "How science works — observation, models, evidence and society.",
    y11: ["Cause and Effect – Observing", "Cause and Effect – Inferences", "Scientific Models", "Theories and Laws"],
    y12: ["Fact or Fallacy?", "Scientific Investigations", "Datasets", "Science and Society"],
  },
  {
    id: "earth-environmental-science", name: "Earth and Environmental Science", short: "Earth & Env Sci", area: "Science", icon: "\u{1F30D}",
    blurb: "Earth's systems, resources, hazards and environmental change.",
    y11: ["Earth's Resources", "Plate Tectonics", "Energy Transformations", "Human Impacts"],
    y12: ["Earth's Processes", "Hazards", "Climate Science", "Resource Management"], verification: "approx",
  },
  {
    id: "science-extension", name: "Science Extension", short: "Science Ext", area: "Science", icon: "\u{1F9EA}", bands: 4,
    blurb: "Design and carry out a scientific research project.",
    y12: ["The Scientific Research Proposal", "Research Methodologies", "Data, Evidence and Decisions", "The Scientific Research Report"],
  },

  // ============================= HSIE ==============================
  {
    id: "history-5", name: "History (Stage 5)", short: "History", area: "HSIE", icon: "\u{1F3DB}",
    blurb: "Mandatory Stage 5 history — the modern world and Australia.",
    y10: ["World War I", "World War II", "Rights and Freedoms", "The Globalising World", "The Changing Australian Environment"],
  },
  {
    id: "geography-5", name: "Geography (Stage 5)", short: "Geography", area: "HSIE", icon: "\u{1F5FA}",
    blurb: "Mandatory Stage 5 geography — biomes, places and wellbeing.",
    y10: ["Sustainable Biomes", "Changing Places", "Environmental Change & Management", "Human Wellbeing"],
  },
  {
    id: "commerce", name: "Commerce (Stage 5)", short: "Commerce", area: "HSIE", icon: "\u{1F4B3}",
    blurb: "Consumer, financial, economic, business and legal decisions.",
    y10: ["Consumer & Financial Decisions", "The Economic & Business Environment", "Employment & Work Futures", "Law, Society & Political Involvement"],
  },
  {
    id: "modern-history", name: "Modern History", short: "Modern Hist", area: "HSIE", icon: "\u{1F3DB}",
    blurb: "Power, authority and conflict in the modern world.",
    y11: ["Investigating Modern History", "The Shaping of the Modern World", "Historical Investigation"],
    y12: ["Power and Authority in the Modern World 1919–1946", "National Study", "Peace and Conflict", "Change in the Modern World"],
  },
  {
    id: "ancient-history", name: "Ancient History", short: "Ancient Hist", area: "HSIE", icon: "\u{1F3FA}",
    blurb: "Sources, societies, personalities and periods of the ancient world.",
    verification: "verified",
    y11: ["Investigating Ancient History", "Features of Ancient Societies", "Historical Investigation"],
    y12: ["Cities of Vesuvius – Pompeii and Herculaneum", "Ancient Societies", "Personalities in Their Times", "Historical Periods"],
  },
  {
    id: "history-extension", name: "History Extension", short: "History Ext", area: "HSIE", icon: "\u{1F4DC}", bands: 4,
    blurb: "What is history? Historiography and a history research project.",
    y12: ["Constructing History (What is history?)", "Case Studies of Historical Debate", "History Project"],
  },
  {
    id: "business-studies", name: "Business Studies", short: "Business", area: "HSIE", icon: "\u{1F4BC}",
    blurb: "Operations, marketing, finance and human resources.",
    y11: ["Nature of Business", "Business Management", "Business Planning"],
    y12: ["Operations", "Marketing", "Finance", "Human Resources"],
  },
  {
    id: "economics", name: "Economics", short: "Economics", area: "HSIE", icon: "\u{1F4C8}",
    blurb: "Markets, the global economy and economic policy.",
    y11: ["Introduction to Economics", "Consumers and Business", "Markets", "Labour Markets", "Financial Markets", "Government and the Economy"],
    y12: ["The Global Economy", "Australia's Place in the Global Economy", "Economic Issues", "Economic Policies and Management"],
  },
  {
    id: "legal-studies", name: "Legal Studies", short: "Legal", area: "HSIE", icon: "⚖",
    blurb: "The legal system, crime, human rights and law reform.",
    y11: ["The Legal System", "The Individual and the Law", "The Law in Practice"],
    y12: ["Crime", "Human Rights", "Consumers / Family / Workplace (option)", "World Order / Global Environment (option)"],
  },
  {
    id: "geography", name: "Geography (Stage 6)", short: "Geography 6", area: "HSIE", icon: "\u{1F5FA}",
    blurb: "Natural systems, human geographies and geographical investigation.",
    verification: "approx",
    y11: ["Earth's Natural Systems", "People, Patterns and Processes", "Human–Environment Interactions", "Geographical Investigation"],
    y12: ["Global Sustainability", "Rights, Choices and Wellbeing", "Contemporary Geographical Issues"],
  },
  {
    id: "society-culture", name: "Society and Culture", short: "Society & Cult", area: "HSIE", icon: "\u{1F465}",
    blurb: "Identity, culture, continuity and change; the Personal Interest Project.",
    y11: ["The Social and Cultural World", "Personal and Social Identity", "Intercultural Communication"],
    y12: ["Social and Cultural Continuity and Change", "Personal Interest Project (PIP)", "Depth Studies (Popular Culture / Belief Systems / Social Inclusion)"],
  },
  {
    id: "studies-religion-1", name: "Studies of Religion I", short: "SOR I", area: "HSIE", icon: "\u{1F54A}",
    blurb: "Nature of religion and religious traditions (1 unit).",
    y11: ["Nature of Religion and Beliefs", "Religious Tradition Study"],
    y12: ["Religion and Belief Systems in Australia post-1945", "Religious Tradition Depth Study"],
  },
  {
    id: "studies-religion-2", name: "Studies of Religion II", short: "SOR II", area: "HSIE", icon: "\u{1F54A}",
    blurb: "Religion, belief systems, peace and ethics (2 unit).",
    y11: ["Nature of Religion and Beliefs", "Religious Traditions", "Religion and Peace"],
    y12: ["Religion and Belief Systems in Australia post-1945", "Religious Tradition Depth Studies", "Religion and Ethics / Peace"],
  },
  {
    id: "aboriginal-studies", name: "Aboriginal Studies", short: "Aboriginal St", area: "HSIE", icon: "\u{1FA83}",
    blurb: "Aboriginal identities, communities, and social justice.",
    verification: "approx",
    y11: ["Aboriginal Peoples and Identities", "Aboriginal Communities", "Global Indigenous Perspectives"],
    y12: ["Social Justice and Human Rights", "Aboriginal Cultural Heritage", "Major Project"],
  },

  // ============================= PDHPE =============================
  {
    id: "pdhpe-5", name: "PDHPE (Stage 5)", short: "PDHPE", area: "PDHPE", icon: "\u{1F3C3}",
    blurb: "Health, wellbeing, relationships and movement.",
    y10: ["Health, Wellbeing and Relationships", "Movement Skill and Performance", "Healthy, Safe and Active Lifestyles"],
  },
  {
    id: "health-movement-science", name: "Health and Movement Science", short: "Health & Move", area: "PDHPE", icon: "\u{1F3CB}",
    blurb: "Current Stage 6 PDHPE course — health, the body and performance.",
    y11: ["Health for Individuals and Communities", "The Body and Mind in Motion"],
    y12: ["Health in a Changing Society", "Training for Improved Performance", "Collaborative Investigation"],
  },
  {
    id: "community-family-studies", name: "Community and Family Studies", short: "CAFS", area: "PDHPE", icon: "\u{1F46A}",
    blurb: "Resource management, individuals, groups, families and communities.",
    y11: ["Resource Management", "Individuals and Groups", "Families and Communities"],
    y12: ["Research Methodology", "Groups in Context", "Parenting and Caring", "Option (e.g. Family & Societal Change)"],
  },
  {
    id: "pass", name: "Physical Activity & Sports Studies", short: "PASS", area: "PDHPE", icon: "⚽",
    blurb: "Stage 5 elective — foundations of physical activity and sport.",
    y10: ["Foundations of Physical Activity", "Physical Activity and Sport in Society", "Enhancing Participation and Performance"],
  },

  // ========================= CREATIVE ARTS ========================
  {
    id: "visual-arts", name: "Visual Arts", short: "Visual Arts", area: "Creative Arts", icon: "\u{1F3A8}",
    blurb: "Artmaking, art criticism and art history.",
    y10: ["Artmaking (Practice)", "Critical & Historical Study", "The Frames & Conceptual Framework"],
    y11: ["Artmaking (Body of Work)", "Art Criticism & Art History", "The Frames & Conceptual Framework"],
    y12: ["Body of Work (Major)", "Art Criticism & Art History", "Case Studies"],
  },
  {
    id: "music-5", name: "Music (Stage 5)", short: "Music", area: "Creative Arts", icon: "\u{1F3B5}",
    blurb: "Stage 5 elective — performing, composing and listening.",
    y10: ["Performing", "Composing", "Listening & Musicology"],
  },
  {
    id: "music-1", name: "Music 1", short: "Music 1", area: "Creative Arts", icon: "\u{1F3B5}",
    blurb: "Performance, composition, musicology and aural across topics.",
    y11: ["Performance", "Composition", "Musicology", "Aural"],
    y12: ["Performance (Core + electives)", "Composition", "Musicology", "Aural"],
  },
  {
    id: "music-2", name: "Music 2", short: "Music 2", area: "Creative Arts", icon: "\u{1F3BC}",
    blurb: "Rigorous performance, composition and musicology for musicians.",
    y11: ["Performance", "Composition", "Musicology", "Aural", "Sight Singing"],
    y12: ["Core Performance", "Core Composition", "Musicology", "Aural", "Electives"],
  },
  {
    id: "drama", name: "Drama", short: "Drama", area: "Creative Arts", icon: "\u{1F3AD}",
    blurb: "Making, performing and appreciating theatre.",
    y10: ["Making (Playbuilding)", "Performing", "Appreciating"],
    y11: ["Improvisation & Playbuilding", "Elements of Drama & Production", "Theatrical Traditions"],
    y12: ["Australian Drama and Theatre", "Studies in Drama and Theatre", "Group Performance", "Individual Project"],
  },
  {
    id: "dance", name: "Dance", short: "Dance", area: "Creative Arts", icon: "\u{1F483}",
    blurb: "Performance, composition and appreciation of dance.",
    y10: ["Performance", "Composition", "Appreciation"],
    y11: ["Performance", "Composition", "Appreciation"],
    y12: ["Core Performance", "Core Composition", "Core Appreciation", "Major Study"],
  },
  {
    id: "photography", name: "Photographic & Digital Media", short: "Photography", area: "Creative Arts", icon: "\u{1F4F7}",
    blurb: "Photography, video and digital imaging practice.",
    verification: "approx",
    y10: ["Wet & Digital Photography", "Video & Media", "Critical & Historical Study"],
    y11: ["Photographic & Digital Practice", "Critical & Historical Study"],
    y12: ["Photo / Video / Digital Practice", "Body of Work"],
  },

  // ============================== TAS =============================
  {
    id: "design-technology", name: "Design and Technology", short: "Design & Tech", area: "TAS", icon: "\u{1F4D0}",
    blurb: "Designing, producing and evaluating innovative solutions.",
    y10: ["Design Process & Projects", "Designing & Producing", "Evaluating"],
    y11: ["Design Fundamentals", "Design Projects", "Innovation & Emerging Technologies"],
    y12: ["Major Design Project", "Case Study of Innovation"],
  },
  {
    id: "food-technology", name: "Food Technology", short: "Food Tech", area: "TAS", icon: "\u{1F373}",
    blurb: "Food preparation, nutrition, and the Australian food industry.",
    y10: ["Food Preparation & Processing", "Nutrition & Consumption", "Food Service & Catering", "Food Product Development"],
    y11: ["Food Availability & Selection", "Food Quality", "Nutrition"],
    y12: ["The Australian Food Industry", "Food Manufacture", "Food Product Development", "Contemporary Food Issues"],
  },
  {
    id: "industrial-technology", name: "Industrial Technology", short: "Industrial Tech", area: "TAS", icon: "\u{1F6E0}",
    blurb: "Practical projects in timber, metal, graphics or multimedia.",
    verification: "approx",
    y10: ["Focus Area (Timber / Metal / Graphics / Multimedia)", "Design & Management", "Production Skills"],
    y11: ["Industry Study", "Design & Management", "Production & Skills"],
    y12: ["Major Project", "Industry Study"],
  },
  {
    id: "textiles", name: "Textiles Technology / Textiles & Design", short: "Textiles", area: "TAS", icon: "\u{1F9F5}",
    blurb: "Textile design, properties and major textile projects.",
    y10: ["Design", "Properties & Performance of Textiles", "Textile Projects"],
    y11: ["Design", "Properties & Performance", "The Textiles & Design Industry"],
    y12: ["Major Textiles Project", "Textile Areas (Apparel / Furnishings / Costume)", "Australian Textile Industry"],
  },
  {
    id: "information-software-tech", name: "Information & Software Technology", short: "IST", area: "TAS", icon: "\u{1F4BB}",
    blurb: "Stage 5 elective — data, hardware, software and programming.",
    y10: ["Data & Information", "Hardware & Software", "Programming", "Digital Media & Networking"],
  },
  {
    id: "software-engineering", name: "Software Engineering", short: "Software Eng", area: "TAS", icon: "\u{1F5A5}",
    blurb: "Current Stage 6 course — programming, secure & web software, ML.",
    y11: ["Programming Fundamentals", "The Object-Oriented Paradigm", "Programming Mechatronics"],
    y12: ["Secure Software Architecture", "Programming for the Web", "Software Automation (ML/AI)", "Software Engineering Project"],
  },
  {
    id: "enterprise-computing", name: "Enterprise Computing", short: "Enterprise Comp", area: "TAS", icon: "\u{1F5C4}",
    blurb: "Current Stage 6 course — UX, networks, cybersecurity, data science.",
    y11: ["Interactive Media & the UX", "Networking Systems & Social Computing", "Principles of Cybersecurity", "Data Science"],
    y12: ["Data Science (advanced)", "Intelligent Systems", "Enterprise Project"],
  },
  {
    id: "engineering-studies", name: "Engineering Studies", short: "Engineering", area: "TAS", icon: "⚙",
    blurb: "Engineering fundamentals across civil, transport and telecomms.",
    y11: ["Engineering Fundamentals", "Engineered Products", "Braking / Household Applications"],
    y12: ["Civil Structures", "Personal & Public Transport", "Aeronautical / Telecommunications", "Engineering Report"],
  },
  {
    id: "agriculture", name: "Agriculture", short: "Agriculture", area: "TAS", icon: "\u{1F33E}",
    blurb: "Plant and animal production and farm management.",
    verification: "approx",
    y10: ["Plant Production", "Animal Production", "Farm Management"],
    y11: ["Overview of Australian Agriculture", "Plant & Animal Production", "Farm Case Study"],
    y12: ["Plant / Animal Production Systems", "Farm Product Study", "Agricultural Research / Elective"],
  },
  {
    id: "istem", name: "iSTEM", short: "iSTEM", area: "TAS", icon: "\u{1F916}",
    blurb: "Stage 5 endorsed elective — integrated STEM projects.",
    verification: "approx",
    y10: ["Engineering Fundamentals", "Aerodynamics & Flight", "Mechatronics", "Design & Production"],
  },
  {
    id: "graphics-technology", name: "Graphics Technology", short: "Graphics Tech", area: "TAS", icon: "\u{1F4CF}",
    blurb: "Stage 5 elective — technical drawing, CAD and graphics.",
    verification: "approx",
    y10: ["Technical Drawing", "Computer-Aided Design (CAD)", "Graphical Presentation", "Design Projects"],
  },

  // =========================== LANGUAGES ==========================
  ...["French", "Japanese", "Chinese", "Spanish", "German", "Italian"].map(
    (lang): Def => ({
      id: lang.toLowerCase(),
      name: lang,
      short: lang,
      area: "Languages",
      icon: "\u{1F5E3}",
      blurb: `${lang} language — speaking, listening, reading and writing.`,
      verification: "approx",
      y10: ["Personal World & Daily Life", "School & Community", "Travel & Culture"],
      y11: ["Beginners / Continuers Themes", "Language Structures & Grammar", "Culture & Communication"],
      y12: ["Prescribed Themes & Topics", "Speaking & Writing", "Reading & Responding"],
    }),
  ),

  // ============================== VET =============================
  {
    id: "hospitality", name: "Hospitality (VET)", short: "Hospitality", area: "VET", icon: "\u{1F374}",
    blurb: "Competency-based VET framework — kitchen and food & beverage.",
    verification: "approx",
    y11: ["Work effectively in hospitality", "Food safety & hygiene", "Customer service", "Barista / Kitchen operations"],
    y12: ["Prepare & serve food/beverages", "Workplace practices", "Industry work placement"],
  },
  {
    id: "construction", name: "Construction (VET)", short: "Construction", area: "VET", icon: "\u{1F3D7}",
    blurb: "Competency-based VET framework — construction industry skills.",
    verification: "approx",
    y11: ["WHS in construction", "Hand & power tools", "Worksite communication"],
    y12: ["Concreting & framing basics", "Materials handling", "Industry work placement"],
  },
  {
    id: "business-services", name: "Business Services (VET)", short: "Business Svcs", area: "VET", icon: "\u{1F5C2}",
    blurb: "Competency-based VET framework — business & admin skills.",
    verification: "approx",
    y11: ["Workplace information", "Business documents", "Customer service"],
    y12: ["Digital technologies", "Sustainable work practices", "Industry work placement"],
  },
  {
    id: "information-digital-tech", name: "Information & Digital Technology (VET)", short: "IDT (VET)", area: "VET", icon: "\u{1F5A7}",
    blurb: "Competency-based VET framework — IT support and digital tech.",
    verification: "approx",
    y11: ["Hardware & networking", "Digital devices", "Cyber safety"],
    y12: ["Web & software basics", "Client support", "Industry work placement"],
  },
];

export const SUBJECTS: Subject[] = DEFS.map(build);

export const SUBJECTS_BY_ID: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s]),
);

/** KLA display order for grouped pickers. */
export const SUBJECT_AREAS: SubjectArea[] = [
  "English",
  "Mathematics",
  "Science",
  "HSIE",
  "PDHPE",
  "Creative Arts",
  "TAS",
  "Languages",
  "VET",
];

const FALLBACK_SUBJECT = (id: SubjectId): Subject => ({
  id,
  name: id,
  short: id,
  area: "HSIE",
  gradient: ["#6c6c8a", "#4a4a68"],
  icon: "\u{1F4DA}",
  blurb: "Subject",
  topics: [],
  topicsByYear: { year10: [], year11: [], year12: [] },
  years: ["year10", "year11", "year12"],
  bands: 6,
  verification: "approx",
});

/** Always returns a Subject; synthesises a safe fallback for unknown ids. */
export function getSubject(id: SubjectId): Subject {
  return SUBJECTS_BY_ID[id] ?? FALLBACK_SUBJECT(id);
}

/** Subjects offered at a given year level (e.g. Extension is Stage 6 only). */
export function subjectsForYear(year: YearLevel): Subject[] {
  return SUBJECTS.filter((s) => s.years.includes(year));
}

/** Subjects offered at a year level, grouped by KLA in display order. */
export function subjectsForYearByArea(
  year: YearLevel,
): { area: SubjectArea; subjects: Subject[] }[] {
  const offered = subjectsForYear(year);
  return SUBJECT_AREAS.map((area) => ({
    area,
    subjects: offered.filter((s) => s.area === area),
  })).filter((g) => g.subjects.length > 0);
}

/**
 * Topics for a subject at a given year level. Falls back to the subject's broad
 * topic list if that year has no dedicated list.
 */
export function topicsForYear(id: SubjectId, year: YearLevel): string[] {
  const s = getSubject(id);
  const list = s.topicsByYear[year];
  return list && list.length > 0 ? list : s.topics;
}
