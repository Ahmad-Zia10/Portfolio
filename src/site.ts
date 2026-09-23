/** Owner details — single source of truth for identity across the site. */
export const site = {
  name: "Ahmad Zia",
  role: "AI Engineer",
  tagline: "I build AI agents that actually do the thing.",
  location: "New Delhi, India",
  email: "mail.ahmadzia07@gmail.com",
  phone: "+91-9452709547",
  /** TODO: replace with a real Calendly link. */
  calendly: "https://calendly.com/",
  github: "https://github.com/Ahmad-Zia10",
  linkedin: "https://linkedin.com/in/ahmad-zia",
  url: "https://ahmadzia.dev",
  description:
    "Ahmad Zia is an AI engineer building agentic systems, retrieval pipelines, and realtime voice agents — from sub-second phone agents to citation-grounded RAG.",
} as const;

export const nav = [
  { label: "Work", href: "/#work" },
  { label: "Services", href: "/#services" },
  { label: "About", href: "/#about" },
  { label: "Lab", href: "/lab" },
] as const;

/** Credentials shown in the awards marquee. */
export const credentials = [
  "B.TECH ELECTRONICS & COMMUNICATION — JAMIA MILLIA ISLAMIA",
  "CGPA 7.8 / 10",
  "AI ENGINEER @ GIT SOFTWARE TECHNOLOGIES",
  "SUB-SECOND VOICE AGENT IN PRODUCTION",
  "~88% HIT-RATE@5 ON HYBRID RETRIEVAL",
  "~92% CITATION FAITHFULNESS",
  "500+ CONCURRENT USERS @ P95 <200MS",
  "SENIOR SECONDARY 84.5% — ST. XAVIER'S LUCKNOW",
] as const;

/** Departures-board rows for the credentials section. */
export const board = [
  {
    code: "GIT",
    dest: "AI Engineer",
    detail: "GIT Software Technologies · Remote",
    gate: "B2",
    status: "In flight",
    live: true,
  },
  {
    code: "VOX",
    dest: "Voice agent, production",
    detail: "Sub-second speech-to-speech on a real SIP line",
    gate: "C1",
    status: "Deployed",
    live: false,
  },
  {
    code: "RAG",
    dest: "~88% hit-rate@5",
    detail: "Hybrid retrieval + cross-encoder rerank",
    gate: "C4",
    status: "Deployed",
    live: false,
  },
  {
    code: "CIT",
    dest: "~92% faithfulness",
    detail: "Citation-backed generation, eval harness",
    gate: "C5",
    status: "Measured",
    live: false,
  },
  {
    code: "K6X",
    dest: "500+ concurrent users",
    detail: "p95 <200ms · >99.5% success",
    gate: "D9",
    status: "Passed",
    live: false,
  },
  {
    code: "JMI",
    dest: "B.Tech ECE",
    detail: "Jamia Millia Islamia · CGPA 7.8",
    gate: "A7",
    status: "Landed",
    live: false,
  },
] as const;

export const roster = [
  { name: "GIT Software Technologies", detail: "AI Engineer · 2025–Present" },
  { name: "Jamia Millia Islamia", detail: "B.Tech ECE · 2021–2025" },
  { name: "St. Xavier's School", detail: "Senior Secondary · 2020" },
] as const;
