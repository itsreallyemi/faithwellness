// FICTIONAL sample accrediting bodies for the prototype. Churches and denominations accredit
// counselors; FaithWellness only publishes each body's requirements. Replace before launch,
// and move into Supabase (accrediting_bodies, requirements) when this leaves the prototype.

export type RequirementGroup = { title: string; items: string[] };

export type AccreditingBody = {
  slug: string;
  name: string;
  kind: "church" | "denomination";
  location: string;
  tradition: string;
  summary: string;
  /** Church slugs whose counselors this body accredits (a church accredits its own). */
  churchSlugs: string[];
  credentialName: string;
  requirements: RequirementGroup[];
  renewal: string;
  howToApply: string;
  updated: string;
};

export const accreditingBodies: AccreditingBody[] = [
  {
    slug: "grace-fellowship",
    name: "Grace Fellowship",
    kind: "church",
    location: "Pasadena, CA",
    tradition: "Non-denominational",
    summary: "Accredits pastors and lay counselors on its care team after supervised training and elder review.",
    churchSlugs: ["grace-fellowship"],
    credentialName: "Grace Fellowship Care Team Counselor",
    requirements: [
      {
        title: "Training",
        items: [
          "40 hours of the church’s pastoral care course",
          "Trauma-informed care workshop (8 hours)",
          "Ordination or a counseling degree for pastoral counselors",
        ],
      },
      {
        title: "Classes",
        items: ["Foundations of biblical counseling (8 weeks)", "Grace Fellowship membership class"],
      },
      {
        title: "Ministry service",
        items: ["Serve on the care team for at least one year", "Co-lead a small group or care group"],
      },
      {
        title: "Supervision",
        items: ["20 supervised sessions with a senior care pastor", "Monthly case consultation during the first year"],
      },
      {
        title: "Character and faith",
        items: ["Member of the church for at least two years", "Affirms the church’s statement of faith", "Interview with the elder board"],
      },
      {
        title: "Safeguarding",
        items: ["Background check renewed every two years", "Mandated-reporter training", "Signs the church’s care code of conduct"],
      },
    ],
    renewal: "Every two years, with 10 hours of continuing education.",
    howToApply: "Speak to the care pastor, then complete the church’s care team application.",
    updated: "2026-09-14",
  },
  {
    slug: "cornerstone-church",
    name: "Cornerstone Church",
    kind: "church",
    location: "Riverside, CA",
    tradition: "Baptist",
    summary: "Accredits licensed therapists and ministry staff who serve its marriage and family ministry.",
    churchSlugs: ["cornerstone-church"],
    credentialName: "Cornerstone Marriage & Family Ministry Counselor",
    requirements: [
      {
        title: "Training",
        items: ["State license (LMFT, LPC or LCSW), or a seminary counseling degree", "Prepare/Enrich facilitator training"],
      },
      { title: "Classes", items: ["Covenant marriage course (6 weeks), taken or taught"] },
      { title: "Ministry service", items: ["Lead or assist a marriage ministry group for a year", "Mentor at least one engaged couple"] },
      { title: "Supervision", items: ["Quarterly peer review with the ministry team"] },
      { title: "Character and faith", items: ["Active member in good standing", "Recommendation from a pastor"] },
      { title: "Safeguarding", items: ["Background check", "Child-safety training if working with families"] },
    ],
    renewal: "Yearly review with the ministry director.",
    howToApply: "Email the marriage and family ministry office with your license and pastor’s recommendation.",
    updated: "2026-08-02",
  },
  {
    slug: "hope-community",
    name: "Hope Community Church",
    kind: "church",
    location: "Irvine, CA",
    tradition: "Non-denominational",
    summary: "Accredits licensed counselors on its care team, with extra training for abuse and church-hurt recovery.",
    churchSlugs: ["hope-community"],
    credentialName: "Hope Community Care Team Counselor",
    requirements: [
      {
        title: "Training",
        items: ["State counseling license", "Abuse-recovery and church-hurt training (16 hours)", "Spiritual abuse awareness course"],
      },
      { title: "Classes", items: ["Healing from church hurt (4-week class)"] },
      { title: "Ministry service", items: ["Serve with the care team’s support groups for six months"] },
      { title: "Supervision", items: ["Clinical supervision for the first 50 sessions"] },
      { title: "Character and faith", items: ["Recommendation from two care team members"] },
      { title: "Safeguarding", items: ["Background check every year", "Trauma-informed safeguarding policy signed"] },
    ],
    renewal: "Every year.",
    howToApply: "Apply through the care team director.",
    updated: "2026-07-21",
  },
  {
    slug: "redeemer-city",
    name: "Redeemer City Church",
    kind: "church",
    location: "Los Angeles, CA",
    tradition: "Non-denominational",
    summary: "Accredits clinicians who also train and supervise the church’s lay counselors.",
    churchSlugs: ["redeemer-city"],
    credentialName: "Redeemer City Clinical Partner",
    requirements: [
      { title: "Training", items: ["Doctoral or master’s clinical license", "Faith-integration seminar (12 hours)"] },
      { title: "Classes", items: ["Teach one session of the lay counselor training each year"] },
      { title: "Ministry service", items: ["Lead or support a church ministry, such as recovery or young adults"] },
      { title: "Supervision", items: ["Supervises at least two lay counselors each year"] },
      { title: "Character and faith", items: ["Member or regular attender for one year"] },
      { title: "Safeguarding", items: ["Background check", "Professional liability insurance"] },
    ],
    renewal: "Every two years.",
    howToApply: "Contact the counseling ministry lead for an interview.",
    updated: "2026-06-30",
  },
  {
    slug: "coastal-presbytery",
    name: "Pacific Coast Presbytery",
    kind: "denomination",
    location: "Southern California",
    tradition: "Presbyterian",
    summary: "Accredits counselors serving any of its member churches, using one shared standard.",
    churchSlugs: ["living-waters"],
    credentialName: "Presbytery Commissioned Counselor",
    requirements: [
      {
        title: "Training",
        items: [
          "Presbytery lay counseling certificate (60 hours), or a professional license",
          "Specialist training for the area served, e.g. biblical financial counseling",
        ],
      },
      {
        title: "Classes",
        items: ["Reformed theology and pastoral care (12 weeks)", "Polity and ethics class for commissioned leaders"],
      },
      {
        title: "Ministry service",
        items: [
          "Two years serving as a deacon, elder or care team member",
          "Lead a ministry in your church, such as a Bible study or budgeting class",
        ],
      },
      { title: "Supervision", items: ["Assigned mentor from the presbytery’s care committee for one year"] },
      {
        title: "Character and faith",
        items: ["Commissioned by the session of a member church", "Affirms the denomination’s confessional standards"],
      },
      { title: "Safeguarding", items: ["Background check", "Presbytery safeguarding training every three years"] },
    ],
    renewal: "Every three years, approved by the care committee.",
    howToApply: "Your church’s session nominates you to the presbytery care committee.",
    updated: "2026-05-11",
  },
];

export function getAccreditingBody(slug: string) {
  return accreditingBodies.find((b) => b.slug === slug) ?? null;
}

/** The body that accredits counselors from a given church, if any. */
export function bodyForChurch(churchSlug: string | undefined) {
  return churchSlug ? (accreditingBodies.find((b) => b.churchSlugs.includes(churchSlug)) ?? null) : null;
}
