import type { CategoryId } from "./types";

export type OpportunityType =
  | "job"
  | "internship"
  | "apprenticeship"
  | "graduate-scheme"
  | "work-experience"
  | "event"
  | "talk"
  | "competition"
  | "portfolio"
  | "workshop"
  | "mentorship"
  | "scholarship"
  | "learning";

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  job: "Entry-level job",
  internship: "Internship",
  apprenticeship: "Apprenticeship",
  "graduate-scheme": "Graduate scheme",
  "work-experience": "Work experience",
  event: "Networking event",
  talk: "Industry talk",
  competition: "Competition",
  portfolio: "Portfolio opportunity",
  workshop: "Workshop",
  mentorship: "Mentorship",
  scholarship: "Scholarship",
  learning: "Free learning",
};

/**
 * Where an opportunity came from.
 * - "directory": a real, established organisation or search service. We link to
 *   it so users search live listings there. We never invent specific vacancies.
 * - "sample": illustrative demo data, always labelled in the UI as not real.
 * - "api": live listings from a configured external provider.
 */
export type OpportunitySource = "directory" | "sample" | "api";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  organisation: string;
  summary: string;
  url?: string;
  location: string;
  remote: boolean;
  countries: string[];
  categories: CategoryId[] | "all";
  careers?: string[];
  skills: string[];
  /** Who it suits (onboarding status ids). Empty = everyone. */
  stages: string[];
  source: OpportunitySource;
  deadline?: string;
}

const UK = ["United Kingdom"];
const ANY = ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "Other"];

export const DIRECTORY_OPPORTUNITIES: Opportunity[] = [
  { id: "dir-find-apprenticeship", type: "apprenticeship", title: "Search apprenticeships in England", organisation: "GOV.UK Find an apprenticeship", summary: "The official government service for apprenticeship vacancies in England — paid training with no tuition fees.", url: "https://www.findapprenticeship.service.gov.uk/", location: "England", remote: false, countries: UK, categories: "all", skills: ["career-craft"], stages: ["school", "unemployed", "employed", "exploring"], source: "directory" },
  { id: "dir-ucas-apprenticeships", type: "apprenticeship", title: "Explore apprenticeships and degrees", organisation: "UCAS", summary: "Compare university courses and apprenticeships side by side.", url: "https://www.ucas.com/", location: "UK", remote: false, countries: UK, categories: "all", skills: ["career-craft"], stages: ["school", "exploring"], source: "directory" },
  { id: "dir-ncs", type: "learning", title: "Free careers advice and job profiles", organisation: "National Careers Service", summary: "Official careers information, skills assessments and free advice from qualified advisers (England).", url: "https://nationalcareers.service.gov.uk/", location: "England", remote: true, countries: UK, categories: "all", skills: ["career-craft"], stages: [], source: "directory" },
  { id: "dir-prospects", type: "graduate-scheme", title: "Graduate jobs and schemes", organisation: "Prospects", summary: "Graduate jobs, schemes and careers advice for students and graduates.", url: "https://www.prospects.ac.uk/", location: "UK", remote: false, countries: UK, categories: "all", skills: ["career-craft"], stages: ["university", "unemployed"], source: "directory" },
  { id: "dir-bright-network", type: "internship", title: "Internships and graduate opportunities", organisation: "Bright Network", summary: "Internships, graduate roles and free virtual experiences for students and graduates.", url: "https://www.brightnetwork.co.uk/", location: "UK", remote: true, countries: UK, categories: ["business", "tech", "finance", "law", "marketing", "engineering"], skills: ["career-craft"], stages: ["university"], source: "directory" },
  { id: "dir-springpod", type: "work-experience", title: "Virtual work experience programmes", organisation: "Springpod", summary: "Free virtual work experience and university taster programmes for students.", url: "https://www.springpod.com/", location: "Online", remote: true, countries: UK, categories: "all", skills: ["industry-knowledge"], stages: ["school", "university"], source: "directory" },
  { id: "dir-forage", type: "work-experience", title: "Free job simulations from top employers", organisation: "Forage", summary: "Self-paced virtual job simulations designed by employers — try the work before you apply.", url: "https://www.theforage.com/", location: "Online", remote: true, countries: ANY, categories: ["business", "tech", "finance", "law", "marketing", "engineering"], skills: ["industry-knowledge", "career-craft"], stages: [], source: "directory" },
  { id: "dir-eventbrite", type: "event", title: "Find careers events near you", organisation: "Eventbrite", summary: "Search for free networking events, industry talks and workshops in your area.", url: "https://www.eventbrite.co.uk/", location: "Your area", remote: false, countries: ANY, categories: "all", skills: ["networking"], stages: [], source: "directory" },
  { id: "dir-meetup", type: "event", title: "Join a local industry meetup", organisation: "Meetup", summary: "Groups for designers, developers, founders, marketers and more.", url: "https://www.meetup.com/", location: "Your area", remote: false, countries: ANY, categories: ["tech", "creative", "business", "marketing"], skills: ["networking"], stages: [], source: "directory" },
  { id: "dir-kaggle", type: "competition", title: "Data science competitions", organisation: "Kaggle", summary: "Practise on real datasets and enter machine learning competitions.", url: "https://www.kaggle.com/competitions", location: "Online", remote: true, countries: ANY, categories: ["tech", "science", "finance"], careers: ["data-scientist", "ml-engineer", "data-analyst"], skills: ["data-analysis", "programming"], stages: [], source: "directory" },
  { id: "dir-dandad", type: "competition", title: "Creative awards and new talent programmes", organisation: "D&AD", summary: "One of the creative industry's best-known awards bodies, with programmes for emerging talent.", url: "https://www.dandad.org/", location: "Online / London", remote: true, countries: ANY, categories: ["creative", "marketing", "film"], careers: ["creative-director", "graphic-designer", "copywriter"], skills: ["concepting", "portfolio"], stages: ["school", "university", "exploring"], source: "directory" },
  { id: "dir-behance", type: "portfolio", title: "Publish your creative portfolio", organisation: "Behance", summary: "Showcase projects and discover creative work from around the world.", url: "https://www.behance.net/", location: "Online", remote: true, countries: ANY, categories: ["creative", "fashion", "film", "marketing"], skills: ["portfolio"], stages: [], source: "directory" },
  { id: "dir-github", type: "portfolio", title: "Build your developer portfolio", organisation: "GitHub", summary: "Host your code, contribute to open source and show employers what you build.", url: "https://github.com/", location: "Online", remote: true, countries: ANY, categories: ["tech", "engineering", "science"], skills: ["portfolio", "programming"], stages: [], source: "directory" },
  { id: "dir-github-student", type: "learning", title: "Student Developer Pack", organisation: "GitHub Education", summary: "Free developer tools for verified students.", url: "https://education.github.com/pack", location: "Online", remote: true, countries: ANY, categories: ["tech"], skills: ["digital-tools"], stages: ["school", "university"], source: "directory" },
  { id: "dir-freecodecamp", type: "learning", title: "Learn to code for free", organisation: "freeCodeCamp", summary: "Free, self-paced coding curriculum with certifications and projects.", url: "https://www.freecodecamp.org/", location: "Online", remote: true, countries: ANY, categories: ["tech"], skills: ["programming", "web-dev"], stages: [], source: "directory" },
  { id: "dir-startup-school", type: "learning", title: "Free startup course", organisation: "Y Combinator Startup School", summary: "Free online course on starting a company from one of the best-known startup accelerators.", url: "https://www.startupschool.org/", location: "Online", remote: true, countries: ANY, categories: ["business"], careers: ["entrepreneur", "social-entrepreneur"], skills: ["strategy", "customer-insight"], stages: [], source: "directory" },
  { id: "dir-kings-trust", type: "mentorship", title: "Support to start a business or find work", organisation: "The King's Trust", summary: "Programmes, mentoring and support for young people aged 11–30 in the UK.", url: "https://www.kingstrust.org.uk/", location: "UK", remote: false, countries: UK, categories: "all", skills: ["career-craft"], stages: ["unemployed", "exploring", "school"], source: "directory" },
  { id: "dir-adplist", type: "mentorship", title: "Free mentorship sessions", organisation: "ADPList", summary: "Book free sessions with mentors in design, product, tech and more.", url: "https://adplist.org/", location: "Online", remote: true, countries: ANY, categories: ["creative", "tech", "business", "marketing"], skills: ["networking"], stages: [], source: "directory" },
  { id: "dir-creative-access", type: "internship", title: "Creative industry opportunities", organisation: "Creative Access", summary: "Opportunities and support for people from under-represented backgrounds in the creative industries.", url: "https://creativeaccess.org.uk/", location: "UK", remote: false, countries: UK, categories: ["creative", "film", "marketing", "music", "fashion"], skills: ["career-craft"], stages: [], source: "directory" },
  { id: "dir-screenskills", type: "learning", title: "Careers in film, TV and games", organisation: "ScreenSkills", summary: "Training, careers information and opportunities for the UK screen industries.", url: "https://www.screenskills.com/", location: "UK", remote: true, countries: UK, categories: ["film"], skills: ["industry-knowledge"], stages: [], source: "directory" },
  { id: "dir-nhs-careers", type: "learning", title: "Explore NHS careers", organisation: "NHS Health Careers", summary: "Explore 350+ NHS roles, entry routes and training.", url: "https://www.healthcareers.nhs.uk/", location: "England", remote: true, countries: UK, categories: ["healthcare", "science"], skills: ["clinical-knowledge"], stages: [], source: "directory" },
  { id: "dir-fast-stream", type: "graduate-scheme", title: "Civil Service Fast Stream", organisation: "UK Civil Service", summary: "The Civil Service's graduate leadership development programme.", url: "https://www.faststream.gov.uk/", location: "UK", remote: false, countries: UK, categories: ["public", "finance", "tech"], skills: ["strategy"], stages: ["university"], source: "directory" },
  { id: "dir-teach-first", type: "graduate-scheme", title: "Train to teach while you earn", organisation: "Teach First", summary: "Salaried teacher training programme in schools in low-income communities.", url: "https://www.teachfirst.org.uk/", location: "England", remote: false, countries: UK, categories: ["education"], skills: ["teaching"], stages: ["university", "employed"], source: "directory" },
  { id: "dir-lawcareers", type: "learning", title: "Law careers guidance", organisation: "LawCareers.Net", summary: "Training contracts, vacation schemes and the SQE explained.", url: "https://www.lawcareers.net/", location: "UK", remote: true, countries: UK, categories: ["law"], skills: ["career-craft"], stages: ["university", "school"], source: "directory" },
  { id: "dir-tomorrows-engineers", type: "learning", title: "Discover engineering careers", organisation: "Tomorrow's Engineers", summary: "Explore engineering careers and routes in, including apprenticeships.", url: "https://www.tomorrowsengineers.org.uk/", location: "UK", remote: true, countries: UK, categories: ["engineering"], skills: ["industry-knowledge"], stages: ["school"], source: "directory" },
  { id: "dir-caterer", type: "job", title: "Hospitality and catering jobs", organisation: "Caterer.com", summary: "Search hospitality jobs from commis chef to hotel management.", url: "https://www.caterer.com/", location: "UK", remote: false, countries: UK, categories: ["hospitality"], skills: ["career-craft"], stages: [], source: "directory" },
  { id: "dir-scholarship-hub", type: "scholarship", title: "Find scholarships and bursaries", organisation: "The Scholarship Hub", summary: "Search UK scholarships, grants and bursaries for students.", url: "https://www.thescholarshiphub.org.uk/", location: "UK", remote: true, countries: UK, categories: "all", skills: [], stages: ["school", "university"], source: "directory" },
  { id: "dir-linkedin", type: "job", title: "Search entry-level roles", organisation: "LinkedIn Jobs", summary: "Search entry-level roles and set alerts for your direction.", url: "https://www.linkedin.com/jobs/", location: "Your area", remote: false, countries: ANY, categories: "all", skills: ["career-craft"], stages: ["university", "unemployed", "employed", "exploring"], source: "directory" },
];

/**
 * Illustrative examples so the demo feels alive. These are NOT real listings and
 * the UI always says so. Organisation names are deliberately fictional.
 */
export const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  { id: "sample-junior-designer", type: "job", title: "Junior Designer", organisation: "Northlight Studio (sample)", summary: "Example of a junior design role: social content, campaign assets and brand refreshes for lifestyle clients.", location: "Manchester", remote: false, countries: UK, categories: ["creative", "marketing"], careers: ["creative-director", "graphic-designer"], skills: ["visual-design", "typography", "portfolio"], stages: ["university", "unemployed", "exploring"], source: "sample" },
  { id: "sample-creative-intern", type: "internship", title: "Summer Creative Internship", organisation: "Bright Fold Agency (sample)", summary: "Example of a paid 8-week internship rotating through strategy, copy and design teams.", location: "London", remote: false, countries: UK, categories: ["creative", "marketing"], careers: ["creative-director", "copywriter", "brand-strategist"], skills: ["concepting", "collaboration"], stages: ["university"], source: "sample" },
  { id: "sample-poster-comp", type: "competition", title: "Climate Poster Challenge", organisation: "Open Brief Collective (sample)", summary: "Example of an open design competition: create a poster that makes climate action feel personal.", location: "Online", remote: true, countries: ANY, categories: ["creative"], careers: ["creative-director", "graphic-designer", "illustrator"], skills: ["visual-design", "concepting"], stages: [], source: "sample" },
  { id: "sample-dev-apprentice", type: "apprenticeship", title: "Software Developer Apprentice (Level 4)", organisation: "Harbour Systems (sample)", summary: "Example of a software apprenticeship: build internal tools while studying towards a Level 4 qualification.", location: "Leeds", remote: false, countries: UK, categories: ["tech"], careers: ["software-engineer", "frontend-developer"], skills: ["programming", "web-dev"], stages: ["school", "unemployed", "exploring"], source: "sample" },
  { id: "sample-junior-dev", type: "job", title: "Junior Front-end Developer", organisation: "Pocketwise (sample)", summary: "Example of a junior developer role at a fintech start-up: React, testing and pairing with seniors.", location: "Bristol / hybrid", remote: true, countries: UK, categories: ["tech"], careers: ["software-engineer", "frontend-developer"], skills: ["web-dev", "programming", "collaboration"], stages: ["university", "unemployed", "employed"], source: "sample" },
  { id: "sample-hackathon", type: "competition", title: "Weekend Hackathon: Tools for Good", organisation: "CodeCommons (sample)", summary: "Example of a 48-hour hackathon building tools for local charities. Beginners welcome.", location: "Online", remote: true, countries: ANY, categories: ["tech", "business"], careers: ["software-engineer", "product-manager", "entrepreneur"], skills: ["programming", "collaboration"], stages: [], source: "sample" },
  { id: "sample-founder-night", type: "event", title: "First-time Founders Night", organisation: "Startup Social (sample)", summary: "Example of an informal evening where early founders share what's working.", location: "Birmingham", remote: false, countries: UK, categories: ["business"], careers: ["entrepreneur", "social-entrepreneur"], skills: ["networking", "customer-insight"], stages: [], source: "sample" },
  { id: "sample-pitch-comp", type: "competition", title: "Young Founders Pitch Competition", organisation: "Launchpad Futures (sample)", summary: "Example of a pitch competition for under-25s with a small grant and mentoring as the prize.", location: "Online", remote: true, countries: UK, categories: ["business"], careers: ["entrepreneur"], skills: ["presenting", "strategy"], stages: [], source: "sample" },
  { id: "sample-market-stall", type: "workshop", title: "Test Your Idea at a Weekend Market", organisation: "Makers Market (sample)", summary: "Example of a low-cost stall for testing a product with real customers.", location: "Your area", remote: false, countries: ANY, categories: ["business", "fashion", "hospitality"], careers: ["entrepreneur", "restaurateur"], skills: ["sales", "customer-insight"], stages: [], source: "sample" },
  { id: "sample-health-volunteer", type: "work-experience", title: "Hospital Volunteer Programme", organisation: "Riverside Health Trust (sample)", summary: "Example of a ward volunteer role supporting patients and staff.", location: "Local hospital", remote: false, countries: UK, categories: ["healthcare"], careers: ["doctor", "nurse", "paramedic"], skills: ["empathy", "communication"], stages: ["school", "university", "exploring"], source: "sample" },
  { id: "sample-film-runner", type: "job", title: "Production Runner", organisation: "Little Giant Films (sample)", summary: "Example of an entry-level runner role on commercials and music videos.", location: "London", remote: false, countries: UK, categories: ["film", "music"], careers: ["film-director", "film-producer", "video-editor"], skills: ["collaboration", "resilience"], stages: [], source: "sample" },
  { id: "sample-music-workshop", type: "workshop", title: "Beat-making Workshop", organisation: "Soundhouse Youth (sample)", summary: "Example of a free evening workshop for new producers.", location: "Glasgow", remote: false, countries: UK, categories: ["music"], careers: ["music-producer", "dj"], skills: ["music-craft"], stages: [], source: "sample" },
  { id: "sample-fashion-intern", type: "internship", title: "Design Studio Intern", organisation: "Thread & Form (sample)", summary: "Example of a studio internship assisting with fittings, mood boards and samples.", location: "London", remote: false, countries: UK, categories: ["fashion"], careers: ["fashion-designer", "stylist"], skills: ["trend-sense", "visual-design"], stages: ["university"], source: "sample" },
  { id: "sample-law-open-day", type: "talk", title: "Routes into Law: Open Evening", organisation: "Clarke & Mensah LLP (sample)", summary: "Example of an open evening explaining the SQE, apprenticeships and training contracts.", location: "Online", remote: true, countries: UK, categories: ["law"], careers: ["solicitor", "barrister", "paralegal"], skills: ["industry-knowledge"], stages: ["school", "university"], source: "sample" },
  { id: "sample-design-mentor", type: "mentorship", title: "Portfolio Review Circle", organisation: "Crit Club (sample)", summary: "Example of a monthly group portfolio review with working designers.", location: "Online", remote: true, countries: ANY, categories: ["creative"], careers: ["creative-director", "product-designer", "graphic-designer"], skills: ["feedback", "portfolio"], stages: [], source: "sample" },
  { id: "sample-sport-coach", type: "work-experience", title: "Volunteer Junior Coach", organisation: "Eastside FC Juniors (sample)", summary: "Example of a weekend volunteer coaching role with under-10s.", location: "Your area", remote: false, countries: ANY, categories: ["sports", "education"], careers: ["sports-coach", "teacher"], skills: ["teaching", "leadership"], stages: [], source: "sample" },
];

export const ALL_STATIC_OPPORTUNITIES = [...DIRECTORY_OPPORTUNITIES, ...SAMPLE_OPPORTUNITIES];
