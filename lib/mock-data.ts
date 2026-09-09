export type PracticeModule = "listening" | "reading" | "writing" | "speaking";

export const practiceModules: {
  key: PracticeModule;
  label: string;
  blurb: string;
  duration: string;
  questions: number;
}[] = [
  {
    key: "listening",
    label: "Listening",
    blurb: "4 sections · 40 questions · audio-based comprehension.",
    duration: "30 min + 10 min transfer",
    questions: 40,
  },
  {
    key: "reading",
    label: "Reading",
    blurb: "3 passages · 40 questions · academic & general variants.",
    duration: "60 min",
    questions: 40,
  },
  {
    key: "writing",
    label: "Writing",
    blurb: "Task 1 (report/letter) + Task 2 (essay).",
    duration: "60 min",
    questions: 2,
  },
  {
    key: "speaking",
    label: "Speaking",
    blurb: "Interview · cue card · discussion.",
    duration: "11–14 min",
    questions: 3,
  },
];

export const enrolledClasses = [
  {
    id: "c-101",
    title: "Academic Writing Task 2 — Argument Structure",
    instructor: "Mr. Daniel Cole",
    date: "2026-05-28",
    time: "18:00",
    durationMin: 60,
    joinUrl: "#join-c-101",
  },
  {
    id: "c-102",
    title: "Speaking Part 2 — Cue Card Strategy",
    instructor: "Ms. Lina Park",
    date: "2026-05-30",
    time: "19:30",
    durationMin: 45,
    joinUrl: "#join-c-102",
  },
  {
    id: "c-103",
    title: "Listening Map Labelling Workshop",
    instructor: "Mr. Daniel Cole",
    date: "2026-06-02",
    time: "17:00",
    durationMin: 60,
    joinUrl: "#join-c-103",
  },
];

export const performanceHistory = [
  { test: "Diagnostic", listening: 5.5, reading: 5.0, writing: 5.0, speaking: 5.5 },
  { test: "Week 2", listening: 6.0, reading: 5.5, writing: 5.5, speaking: 6.0 },
  { test: "Week 4", listening: 6.5, reading: 6.0, writing: 6.0, speaking: 6.0 },
  { test: "Week 6", listening: 6.5, reading: 6.5, writing: 6.5, speaking: 6.5 },
  { test: "Week 8", listening: 7.0, reading: 7.0, writing: 6.5, speaking: 7.0 },
  { test: "Mock 1", listening: 7.5, reading: 7.0, writing: 7.0, speaking: 7.0 },
];

export type WritingTaskScript = {
  taskNumber: 1 | 2;
  title: string;
  prompt: string;
  body: string;
  words: number;
};

export type WritingSubmission = {
  id: string;
  studentId: string;
  studentName: string;
  submitted: string;
  task1: WritingTaskScript;
  task2: WritingTaskScript;
};

// A writing module submission always contains both Task 1 and Task 2 — the
// IELTS writing module is graded as a pair.
export const writingSubmissions: WritingSubmission[] = [
  {
    id: "sub-201",
    studentId: "u-demo-student",
    studentName: "Aisha Rahman",
    submitted: "2026-05-25",
    task1: {
      taskNumber: 1,
      title: "Bar Chart — Smartphone Ownership",
      words: 162,
      prompt:
        "The bar chart below shows the percentage of households that owned a smartphone in four countries between 2010 and 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      body: `The bar chart illustrates the proportion of households owning a smartphone in four countries — Japan, Brazil, Kenya and the United Kingdom — across three points in time: 2010, 2017 and 2024.

Overall, smartphone ownership rose substantially in every country over the fourteen-year period, with the most dramatic growth observed in Kenya and Brazil.

In 2010, the United Kingdom led the field at around 38%, followed by Japan at 31%, while Brazil and Kenya trailed behind at just 12% and 6% respectively. By 2017, all four countries had crossed the halfway mark in the case of the developed nations, with Japan reaching 74% and the UK 80%. Brazil had jumped to 52%, and Kenya to 38%.

By 2024, the UK and Japan had effectively saturated their markets, sitting at 95% and 93% respectively. Brazil reached 84%, while Kenya — though still the lowest — had reached an impressive 71%, narrowing the historical gap considerably.`,
    },
    task2: {
      taskNumber: 2,
      title: "Discussion Essay — Technology in Education",
      words: 287,
      prompt:
        "Some people believe that technology has reduced students' ability to think for themselves, while others argue that it has expanded their ability to learn. Discuss both views and give your own opinion.",
      body: `In today's rapidly changing world, technology has become an inseparable part of education. While some argue that it diminishes original thought, others believe it amplifies it. This essay will discuss both views and ultimately argue that, when used carefully, technology empowers rather than weakens independent thinking.

On the one hand, those who claim technology reduces independent thought point to the constant availability of quick answers online. Students often turn to search engines instead of reasoning through a problem, which can dull their critical reasoning. Moreover, the rise of AI writing tools tempts learners to outsource their thinking entirely, which clearly weakens the very skill schools are meant to cultivate. From this perspective, the worry is reasonable.

On the other hand, technology also exposes learners to a far wider universe of ideas than any single classroom could provide. Digital archives, recorded lectures, and global discussion forums allow students to compare perspectives and form their own views with much more evidence than before. Tools like spaced repetition apps and interactive simulations help students grasp difficult concepts and apply them, which deepens understanding rather than replacing it.

In my view, technology itself is neither the hero nor the villain — it is how it is used that matters. When teachers design assignments that demand reflection, comparison, and judgement, technology becomes a powerful catalyst. When it is used merely to find answers, it does indeed weaken thinking. The solution, therefore, is not to remove the tools but to teach learners how to wield them with care.

To conclude, while there are legitimate concerns that digital convenience can erode independent thought, the wider benefits of access and personalisation outweigh the risks. Schools must invest in teaching judgement alongside the tools themselves.`,
    },
  },
  {
    id: "sub-202",
    studentId: "u-rohan",
    studentName: "Rohan Kapoor",
    submitted: "2026-05-25",
    task1: {
      taskNumber: 1,
      title: "Process Diagram — Coffee Production",
      words: 154,
      prompt:
        "The diagram below shows the stages in the production of instant coffee. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
      body: `The diagram illustrates the sequence of steps involved in producing instant coffee, from harvesting the beans through to packaging the final product.

Overall, the process consists of eight discrete stages, beginning with coffee cherries on the plantation and ending with sealed jars on a conveyor for distribution. Roasting and freeze-drying are the two heat-intensive steps that define the flavour profile.

The process begins with picking the coffee cherries by hand. These cherries are then washed and the outer pulp is removed to expose the green beans, which are spread out to dry in the sun. Once dry, the beans are sent to a roasting drum where they are heated to around 200°C until they turn dark brown.

After roasting, the beans are ground and brewed with hot water to produce a concentrated coffee extract. This extract is frozen and broken into granules, then freeze-dried under vacuum to remove the remaining water. Finally, the dried granules are weighed, sealed into jars and labelled for shipment.`,
    },
    task2: {
      taskNumber: 2,
      title: "Opinion Essay — Urban Planning",
      words: 312,
      prompt:
        "Many cities are facing severe traffic and pollution problems. Some people believe the solution is to invest heavily in public transport, while others say the priority should be reducing the number of private vehicles. Discuss both views and give your own opinion.",
      body: `As cities continue to expand, traffic congestion and air pollution have emerged as two of the most pressing urban challenges of our time. Opinions are divided between expanding public transport networks and tightening restrictions on private vehicles. Both approaches have merit, but I believe the most effective response is a coordinated combination of the two.

Supporters of investing in public transport argue that better buses, trains and cycling infrastructure make alternatives to driving genuinely attractive. When commuters can reach their destinations quickly, comfortably and affordably, the daily incentive to drive falls naturally. Cities such as Singapore and Vienna have shown that high-quality public networks can shift behaviour without resorting to heavy-handed bans.

Those who argue instead for reducing private vehicles take a different angle. They point out that even excellent public transport rarely succeeds if private cars remain the easiest and cheapest option. Measures such as congestion charges, low-emission zones, and limits on parking are sometimes the only way to make space on the roads and force the necessary behavioural shift. Without such pressure, the city's air quality and street life continue to suffer.

In my opinion, neither approach is enough on its own. Adding a bus line does little if traffic still crawls through the city, while restricting cars without offering an alternative is politically and practically untenable. The clearest path forward is to invest heavily in public transport at the same time as gradually reducing the role of private vehicles through pricing and planning. The two strategies reinforce each other.

In conclusion, cities cannot afford to choose between expanding public transport and restricting private vehicles. By doing both — providing attractive alternatives while sensibly limiting cars — urban authorities can ease congestion, clean the air, and make the streets more liveable for everyone.`,
    },
  },
  {
    id: "sub-203",
    studentId: "u-mei",
    studentName: "Mei Lin",
    submitted: "2026-05-24",
    task1: {
      taskNumber: 1,
      title: "Letter — Apartment Repair Request",
      words: 178,
      prompt:
        "You recently moved into a new flat and have discovered several problems with it. Write a letter to your landlord. In your letter: introduce yourself; describe the problems; tell the landlord what action you would like them to take.",
      body: `Dear Mr. Hayes,

My name is Mei Lin and I moved into the second-floor apartment at 14 Oakwood Lane last weekend. I am writing to bring several maintenance issues to your attention, as I would be grateful if they could be resolved as soon as possible.

To begin with, the kitchen tap leaks continuously and the cabinet beneath it is now showing signs of water damage. The radiator in the smaller bedroom also fails to warm up, even when the heating is on for several hours, and one of the windows in the living room does not close fully, allowing a noticeable draft.

I would be very grateful if you could arrange for a plumber and a heating engineer to visit at the earliest opportunity. I am available on weekday evenings after six o'clock, and on Saturday mornings before noon. Please let me know what time would suit you so that I can be at the flat to provide access.

Thank you for your prompt attention to these matters.

Yours sincerely,
Mei Lin`,
    },
    task2: {
      taskNumber: 2,
      title: "Argument Essay — Remote Work",
      words: 294,
      prompt:
        "Some people argue that working from home is more productive than working in a traditional office, while others believe it weakens collaboration and culture. Discuss both views and give your own opinion.",
      body: `The shift toward remote work has fundamentally altered modern professional life. Proponents argue that home-based work delivers higher productivity, while critics warn that it erodes the team culture on which strong organisations depend. In my view, the truth lies in a deliberate hybrid model that captures the gains of both.

Those who favour remote work point to fewer interruptions, more autonomy over scheduling, and the elimination of long commutes. Without an open-plan office buzzing around them, many employees report finishing focused work in less time. Companies also benefit from access to a wider talent pool and lower office costs, which can be redirected toward salaries or growth.

On the other side, critics observe that informal interaction is the lifeblood of healthy teams. Mentoring junior staff, sparking unplanned creative collaboration, and building the personal trust that smooths difficult conversations all thrive in shared physical space. Pure remote setups, they argue, slowly fragment the culture that holds a company together, even as short-term output remains strong.

I believe the most effective response is a structured hybrid: deep individual work happens at home, while team formation, mentoring and cross-functional sessions happen in person on agreed days. This approach respects employees' time and energy while protecting the shared rituals that build identity. Leaders must be intentional about what each setting is for — otherwise hybrid risks becoming the worst of both worlds.

In conclusion, the productivity-versus-culture debate frames the wrong choice. Both matter, and modern workplaces should design routines that protect each. The companies that thrive will be those that make their model of presence a conscious decision rather than a default inherited from either the old office or the pandemic.`,
    },
  },
];

// IELTS Speaking has three parts. A submission is only valid for grading once
// the candidate has recorded all three — `completed` reflects whether the
// student finished that section. The instructor page filters out submissions
// where any part is missing.
export type SpeakingPart = {
  partNumber: 1 | 2 | 3;
  topic: string;
  prompts: string[];
  duration: string;
  completed: boolean;
};

export type SpeakingSubmission = {
  id: string;
  studentId: string;
  studentName: string;
  submitted: string;
  part1: SpeakingPart;
  part2: SpeakingPart;
  part3: SpeakingPart;
};

export const speakingSubmissions: SpeakingSubmission[] = [
  {
    id: "sp-301",
    studentId: "u-demo-student",
    studentName: "Aisha Rahman",
    submitted: "2026-05-25",
    part1: {
      partNumber: 1,
      topic: "Hometown & daily life",
      prompts: [
        "Where is your hometown and what is it known for?",
        "What do you usually do on weekends?",
        "Do you prefer mornings or evenings? Why?",
      ],
      duration: "4:12",
      completed: true,
    },
    part2: {
      partNumber: 2,
      topic: "Describe a place you like to visit",
      prompts: [
        "You should say: where this place is, how often you go there, what you do there, and explain why you like visiting it.",
      ],
      duration: "2:04",
      completed: true,
    },
    part3: {
      partNumber: 3,
      topic: "Travel and personal places (discussion)",
      prompts: [
        "Why do people need places where they can relax?",
        "How has the way people choose holiday destinations changed in your country?",
        "Do you think it's important for cities to preserve quiet places? Why?",
      ],
      duration: "4:38",
      completed: true,
    },
  },
  {
    id: "sp-302",
    studentId: "u-rohan",
    studentName: "Rohan Kapoor",
    submitted: "2026-05-25",
    part1: {
      partNumber: 1,
      topic: "Work & studies",
      prompts: [
        "Do you work or are you a student?",
        "What's the most interesting part of what you do?",
        "Is there anything you'd like to change about it?",
      ],
      duration: "3:48",
      completed: true,
    },
    part2: {
      partNumber: 2,
      topic: "Talk about a skill you want to learn",
      prompts: [
        "You should say: what the skill is, why you want to learn it, how you plan to learn it, and explain how it would help you.",
      ],
      duration: "1:48",
      completed: true,
    },
    part3: {
      partNumber: 3,
      topic: "Skills, work and learning (discussion)",
      prompts: [
        "Are practical skills or academic skills more useful today?",
        "Should governments invest more in vocational training?",
        "How has the way people learn new skills changed in the last twenty years?",
      ],
      duration: "4:05",
      completed: true,
    },
  },
  {
    id: "sp-303",
    studentId: "u-mei",
    studentName: "Mei Lin",
    submitted: "2026-05-24",
    part1: {
      partNumber: 1,
      topic: "Food & cooking",
      prompts: [
        "Do you enjoy cooking?",
        "What kinds of food do you usually eat at home?",
        "Has your diet changed since you were younger?",
      ],
      duration: "3:55",
      completed: true,
    },
    part2: {
      partNumber: 2,
      topic: "Describe a memorable meal you had",
      prompts: [
        "You should say: where you ate it, who you were with, what you ate, and explain why it was memorable.",
      ],
      duration: "2:11",
      completed: true,
    },
    part3: {
      partNumber: 3,
      topic: "Food culture (discussion)",
      prompts: [
        "Why do special meals matter so much in many cultures?",
        "How has globalisation affected what people eat in your country?",
        "Do you think traditional cooking will survive in the future?",
      ],
      duration: "4:22",
      completed: true,
    },
  },
];

export const instructorSchedule = [
  {
    id: "sc-401",
    title: "Speaking Part 2 — Cue Card Strategy",
    cohort: "Evening Batch B",
    date: "2026-05-27",
    time: "19:30",
    seats: "12 / 15",
  },
  {
    id: "sc-402",
    title: "Listening Map Labelling Workshop",
    cohort: "Weekend Batch A",
    date: "2026-05-29",
    time: "10:00",
    seats: "18 / 20",
  },
  {
    id: "sc-403",
    title: "Writing Task 1 Clinic",
    cohort: "Evening Batch B",
    date: "2026-05-31",
    time: "18:00",
    seats: "9 / 15",
  },
];

export const mockQuestionBank = [
  {
    id: "q-501",
    module: "writing",
    type: "Task 2",
    title: "Some people believe technology has reduced our ability to think for ourselves.",
    addedOn: "2026-05-20",
  },
  {
    id: "q-502",
    module: "speaking",
    type: "Part 2",
    title: "Describe a time when you helped a stranger.",
    addedOn: "2026-05-22",
  },
  {
    id: "q-503",
    module: "reading",
    type: "Passage",
    title: "The decline of bee populations and global food security.",
    addedOn: "2026-05-23",
  },
];
