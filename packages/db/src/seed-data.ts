/**
 * DEMO seed content. Everything here is obviously fake: names say "Demo",
 * emails use the reserved .invalid TLD (RFC 2606) and codes start with DEMO.
 * Do not replace with real people, real qualifications or real curricula.
 */

export const DEMO_EMAIL_DOMAIN = "example.invalid";
export const DEMO_QUALIFICATION_CODE = "DEMO-0000-NOT-A-REAL-CURRICULUM";

export type DemoUserKey =
  | "admin"
  | "facilitator"
  | "assessor"
  | "moderator"
  | "evaluator"
  | "learner1"
  | "learner2"
  | "learner3";

export const demoUsers: Record<
  DemoUserKey,
  { displayName: string; email: string }
> = {
  admin: {
    displayName: "Demo Admin (fake)",
    email: `demo.admin@${DEMO_EMAIL_DOMAIN}`,
  },
  facilitator: {
    displayName: "Demo Facilitator (fake)",
    email: `demo.facilitator@${DEMO_EMAIL_DOMAIN}`,
  },
  assessor: {
    displayName: "Demo Assessor (fake)",
    email: `demo.assessor@${DEMO_EMAIL_DOMAIN}`,
  },
  moderator: {
    displayName: "Demo Moderator (fake)",
    email: `demo.moderator@${DEMO_EMAIL_DOMAIN}`,
  },
  evaluator: {
    displayName: "Demo External Evaluator (fake, read-only)",
    email: `demo.evaluator@${DEMO_EMAIL_DOMAIN}`,
  },
  learner1: {
    displayName: "Demo Learner One (fake)",
    email: `demo.learner1@${DEMO_EMAIL_DOMAIN}`,
  },
  learner2: {
    displayName: "Demo Learner Two (fake)",
    email: `demo.learner2@${DEMO_EMAIL_DOMAIN}`,
  },
  learner3: {
    displayName: "Demo Learner Three (fake)",
    email: `demo.learner3@${DEMO_EMAIL_DOMAIN}`,
  },
};

export type DemoOption = { label: string; correct?: boolean; pinned?: number };
export type DemoQuestion = {
  stem: string;
  feedback: string;
  options: DemoOption[];
};
export type DemoSection = {
  title: string;
  component: string;
  body: string;
  media?: {
    kind: "audio" | "video";
    assetId: string;
    durationSeconds: number;
    sizeBytes: number;
    /** Own transcript, or null when the section text is the transcript. */
    transcript: string | null;
  };
  questions: DemoQuestion[];
};

const allOfTheAbove = (correct = false): DemoOption => ({
  label: "All of the above",
  correct,
  pinned: -1,
});

export const demoKnowledgeSections: DemoSection[] = [
  {
    title: "DEMO Section 1: What a computer is",
    component: "DEMO-KM-01-KT01",
    body: [
      "> [!NOTE]",
      "> DEMO CONTENT. This is placeholder text for testing the LMS, not real course material.",
      "",
      "## The four jobs of a computer",
      "",
      "Every computer does four things: it takes **input**, **processes** it, **stores** it and produces **output**.",
      "",
      "- Input: keyboard, mouse, microphone",
      "- Processing: the CPU",
      "- Storage: SSD, hard drive, USB drive",
      "- Output: monitor, speakers, printer",
      "",
      "![Diagram: input flows into the processor, which stores data and sends output to a screen](/content/demo/computer-flow.svg)",
      "",
      "> [!TIP]",
      "> If you can touch it, it's hardware. If you can only see it on the screen, it's software.",
    ].join("\n"),
    media: {
      kind: "video",
      assetId: "DEMO-PLACEHOLDER-VIDEO-001",
      durationSeconds: 360,
      sizeBytes: 25_000_000,
      transcript:
        "[DEMO TRANSCRIPT] Placeholder transcript for the demo video. In real content this is the full spoken text.",
    },
    questions: [
      {
        stem: "[DEMO] Which of these is an input device?",
        feedback: "A keyboard sends input to the computer.",
        options: [
          { label: "Keyboard", correct: true },
          { label: "Monitor" },
          { label: "Speaker" },
          { label: "Printer" },
        ],
      },
      {
        stem: "[DEMO] Which part of a computer does the processing?",
        feedback: "The CPU (processor) carries out instructions.",
        options: [
          { label: "CPU", correct: true },
          { label: "Mouse" },
          { label: "Webcam" },
          { label: "Power cable" },
        ],
      },
      {
        stem: "[DEMO] Which of these can store files?",
        feedback: "SSDs, USB drives and hard drives all store data.",
        options: [
          { label: "SSD" },
          { label: "USB flash drive" },
          { label: "Hard drive" },
          allOfTheAbove(true),
        ],
      },
      {
        stem: "[DEMO] Which of these is an output device?",
        feedback: "A monitor shows output from the computer.",
        options: [
          { label: "Monitor", correct: true },
          { label: "Microphone" },
          { label: "Scanner" },
          { label: "Keyboard" },
        ],
      },
    ],
  },
  {
    title: "DEMO Section 2: Networks",
    component: "DEMO-KM-01-KT02",
    body: [
      "> [!NOTE]",
      "> DEMO CONTENT. This is placeholder text for testing the LMS, not real course material.",
      "",
      "## What a network does",
      "",
      "A network connects devices so they can share information. A **router** forwards traffic between networks, for example between your home network and the internet.",
      "",
      "## Checking a connection",
      "",
      "You can test whether a device answers with the `ping` command:",
      "",
      "```",
      "ping 192.0.2.1",
      "```",
      "",
      "> [!WARNING]",
      "> Only test devices you are allowed to test.",
    ].join("\n"),
    media: {
      kind: "audio",
      assetId: "DEMO-PLACEHOLDER-AUDIO-001",
      durationSeconds: 240,
      sizeBytes: 4_000_000,
      transcript: null, // the section text is the transcript
    },
    questions: [
      {
        stem: "[DEMO] Which device forwards traffic between different networks?",
        feedback: "A router connects networks together.",
        options: [
          { label: "Router", correct: true },
          { label: "Monitor" },
          { label: "Keyboard" },
          { label: "Printer" },
        ],
      },
      {
        stem: "[DEMO] What does Wi-Fi provide?",
        feedback: "Wi-Fi is a wireless network connection.",
        options: [
          { label: "A wireless network connection", correct: true },
          { label: "Extra storage" },
          { label: "A faster processor" },
          { label: "More screen space" },
        ],
      },
      {
        stem: "[DEMO] Which of these needs a network connection to work?",
        feedback: "Email, web browsing and video calls all need a network.",
        options: [
          { label: "Sending email" },
          { label: "Browsing a website" },
          { label: "A video call" },
          allOfTheAbove(true),
        ],
      },
      {
        stem: "[DEMO] What is an IP address used for?",
        feedback: "An IP address identifies a device on a network.",
        options: [
          { label: "Identifying a device on a network", correct: true },
          { label: "Measuring screen brightness" },
          { label: "Charging a battery" },
          { label: "Naming a document" },
        ],
      },
    ],
  },
  {
    title: "DEMO Section 3: Staying safe online",
    component: "DEMO-KM-01-KT03",
    body: [
      "> [!NOTE]",
      "> DEMO CONTENT. This is placeholder text for testing the LMS, not real course material.",
      "",
      "## Strong passwords",
      "",
      "Use a long passphrase that is different for every account. A password manager helps you remember them.",
      "",
      "## Spotting phishing",
      "",
      "1. Check who really sent the message.",
      "2. Don't click links that ask for your PIN or password.",
      "3. When in doubt, contact the organisation directly.",
    ].join("\n"),
    questions: [
      {
        stem: "[DEMO] Which password is strongest?",
        feedback: "Long passphrases with mixed words are hardest to guess.",
        options: [
          { label: "correct-horse-battery-staple-42", correct: true },
          { label: "password" },
          { label: "123456" },
          { label: "qwerty" },
        ],
      },
      {
        stem: "[DEMO] An email asks you to 'confirm your bank PIN'. What should you do?",
        feedback: "Banks never ask for your PIN by email. It is phishing.",
        options: [
          { label: "Ignore it and report it as phishing", correct: true },
          { label: "Reply with your PIN" },
          { label: "Click the link to check" },
          { label: "Forward it to friends" },
        ],
      },
      {
        stem: "[DEMO] Why should you install software updates?",
        feedback: "Updates often fix security holes.",
        options: [
          { label: "They fix security problems", correct: true },
          { label: "They make the screen bigger" },
          { label: "They delete your files" },
          { label: "They are never needed" },
        ],
      },
      {
        stem: "[DEMO] Which of these is NOT safe to share publicly?",
        feedback: "Passwords, ID numbers and one-time PINs must stay private.",
        options: [
          { label: "Your password" },
          { label: "Your ID number" },
          { label: "A one-time PIN" },
          allOfTheAbove(true),
        ],
      },
    ],
  },
];

export const demoPracticalSection = {
  title: "DEMO Practical Section 1: Set up a workstation",
  component: "DEMO-PM-01-PS01",
  body: "[DEMO CONTENT — NOT REAL COURSE MATERIAL]\n\nRead the brief and complete the task on an assessment day. This placeholder text exists only to test the LMS.",
};

export const demoBrief = {
  title: "DEMO Brief: Set up and test a workstation",
  component: "DEMO-PM-01-PS01",
  instructions:
    "[DEMO] Connect a computer, monitor, keyboard and mouse, then confirm it starts.",
  assessmentCriteria:
    "[DEMO] AC1 Devices connected correctly. AC2 Computer starts. AC3 Workspace left tidy.",
  variants: [
    {
      label: "A",
      variantInstructions: "[DEMO] Variant A: use the desktop computer.",
    },
    {
      label: "B",
      variantInstructions:
        "[DEMO] Variant B: use the laptop and external monitor.",
    },
  ],
};

export const demoLibrary = [
  {
    title: "DEMO: Glossary of computer terms (fake link)",
    description: "Placeholder resource for testing the digital library.",
    url: "https://example.invalid/demo/glossary",
  },
  {
    title: "DEMO: Further reading on networks (fake link)",
    description: "Placeholder resource for testing the digital library.",
    url: "https://example.invalid/demo/networks",
  },
];
