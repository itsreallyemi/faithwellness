// PROTOTYPE ONLY. Client onboarding questions and a simple counselor match.
// The per-counselor "serves" data below is sample data; in the real app counselors set it in
// their profile (a client_types column), and matching moves to the server.

import type { Counselor } from "@/lib/types";

export type Who = "individual" | "couple" | "family" | "child";
export type Topic = "family-conflict" | "couples" | "coping" | "anxiety" | "addiction";

export type Intake = {
  who: Who;
  ageRange: string;
  topics: Topic[];
  cultureConsidered: boolean;
  cultureNote: string;
  language: string;
  denomination: string;
  /** Whether counselors the client books or messages can see these answers. */
  shareWithCounselor: boolean;
  completedIso: string;
};

export const whoOptions: { value: Who; label: string; hint: string }[] = [
  { value: "individual", label: "Me", hint: "Individual care" },
  { value: "couple", label: "Us as a couple", hint: "Married, engaged or dating" },
  { value: "family", label: "Our family", hint: "Parents, children or relatives together" },
  { value: "child", label: "My child", hint: "You’re a parent or guardian" },
];

export const adultAges = ["Under 18", "18–24", "25–34", "35–49", "50–64", "65 or older"];
export const childAges = ["Under 6", "6–9", "10–12", "13–17"];

export const topicOptions: { value: Topic; label: string; focus: string[] }[] = [
  { value: "family-conflict", label: "Family conflict", focus: ["parenting", "marriage"] },
  { value: "couples", label: "Couples issues", focus: ["marriage", "premarital"] },
  { value: "coping", label: "Coping with something hard", focus: ["grief", "trauma", "anxiety", "ministry-burnout"] },
  { value: "anxiety", label: "Anxiety", focus: ["anxiety"] },
  // No sample counselor lists addiction yet. Add an "addiction" focus area before launch.
  { value: "addiction", label: "Addiction", focus: [] },
];

export const denominations = [
  "Non-denominational",
  "Baptist",
  "Presbyterian",
  "Methodist",
  "Pentecostal",
  "Lutheran",
  "Anglican or Episcopal",
  "Catholic",
  "Orthodox",
  "Other",
  "No preference",
];

/** Sample data: who each demo counselor works with. */
const serves: Record<string, Who[]> = {
  "ruth-okafor": ["individual", "couple"],
  "daniela-mercado": ["couple", "family", "individual"],
  "sarah-park": ["individual"],
  "james-whitfield": ["individual", "family", "couple"],
  "abigail-nwosu": ["couple", "individual"],
  "miriam-levy-cole": ["couple", "individual"],
};

const whoReason: Record<Who, string> = {
  individual: "Works with individuals",
  couple: "Works with couples",
  family: "Works with families",
  child: "Works with children",
};

export type Match = { counselor: Counselor; score: number; reasons: string[] };

export function matchCounselors(all: Counselor[], intake: Intake, focusLabels: Record<string, string>): Match[] {
  return all
    .map((c) => {
      let score = 0;
      const reasons: string[] = [];
      const cServes = serves[c.slug] ?? ["individual"];

      if (cServes.includes(intake.who)) {
        score += 3;
        reasons.push(whoReason[intake.who]);
      }
      const wanted = new Set(intake.topics.flatMap((t) => topicOptions.find((o) => o.value === t)?.focus ?? []));
      const overlap = c.focusAreas.filter((f) => wanted.has(f));
      if (overlap.length) {
        score += 2 + overlap.length;
        reasons.push(overlap.map((f) => focusLabels[f] ?? f).join(", "));
      }
      const tradition = c.church?.denomination;
      if (tradition && intake.denomination === tradition) {
        score += 2;
        reasons.push(`${tradition}, like you`);
      }
      if (intake.cultureConsidered && intake.language && intake.language !== "English" && c.languages.includes(intake.language)) {
        score += 2;
        reasons.push(`Speaks ${intake.language}`);
      }
      return { counselor: c, score, reasons };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** The answers as label/value rows, phrased for a counselor reading them. */
export function intakeRows(intake: Intake): [string, string][] {
  const who = {
    individual: "Themselves",
    couple: "Them and their partner",
    family: "Their family",
    child: "Their child",
  }[intake.who];
  const rows: [string, string][] = [
    ["Counseling for", who],
    [intake.who === "child" ? "Child’s age" : "Age", intake.ageRange],
    ["Would like to talk about", intake.topics.map((t) => topicOptions.find((o) => o.value === t)?.label ?? t).join(", ")],
    [
      "Culture considered",
      intake.cultureConsidered
        ? ["Yes", intake.cultureNote && `“${intake.cultureNote}”`, intake.language !== "English" && `prefers ${intake.language}`]
            .filter(Boolean)
            .join(" · ")
        : "No",
    ],
    ["Denomination", intake.denomination],
  ];
  return rows;
}

/** Directory link that keeps the match's focus areas as filters. */
export function directoryHref(intake: Intake) {
  const focus = [...new Set(intake.topics.flatMap((t) => topicOptions.find((o) => o.value === t)?.focus ?? []))];
  const q = new URLSearchParams();
  if (focus.length) q.set("focus", focus.join(","));
  // Denomination is left out on purpose: it ranks matches but shouldn't empty the directory.
  const s = q.toString();
  return s ? `/counselors?${s}` : "/counselors";
}
