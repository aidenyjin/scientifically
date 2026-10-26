import type { ExerciseCore } from "@/content/types";
import { autoCheckDialogue, gradeDialogue } from "./grade";
import {
  dialogueResponseSchema,
  dialogueSchema,
  type Dialogue,
  type DialogueResponse,
} from "./schema";

export const dialogue: ExerciseCore<Dialogue, DialogueResponse> = {
  type: "dialogue",
  label: "Dialogue",
  schema: dialogueSchema,
  responseSchema: dialogueResponseSchema,
  grade: gradeDialogue,
  autoCheck: autoCheckDialogue,
  promptNotes:
    "Write 2–4 short lines (under ~20 words each) between 1–3 cast members, in character, that set up a concrete puzzle; the `prompt` is the question the learner answers about the scene. The lines must not state the answer. Exactly one option is correct and the distractors are common misconceptions of similar length.",
  examples: [
    {
      id: "dlg-osmosis-swelling",
      type: "dialogue",
      prompt: "What is flooding into Pip?",
      lines: [
        {
          characterId: "pip",
          text: "Lumi! Someone dropped me in **pure water** and I'm getting BIGGER!",
        },
        {
          characterId: "lumi",
          text: "Your cytoplasm is full of dissolved sugars and salts. The water outside has none.",
        },
        { characterId: "pip", text: "So what's rushing in?!" },
      ],
      question: {
        options: [
          "Water, moving in by osmosis",
          "Salt, moving in by diffusion",
          "Water, pumped in by active transport",
          "Sugar, absorbed from the water",
        ],
        answerIndex: 0,
      },
      explanation:
        "**Osmosis**: water moves across a partially permeable membrane from a dilute solution (pure water) into a more concentrated one (the cytoplasm). It needs no energy. An animal cell can swell until it bursts; a plant cell's wall stops that.",
      hint: "Which way does water move: towards more dissolved stuff, or less?",
      skillTags: ["cells.osmosis"],
      difficulty: 2,
    },
    {
      id: "dlg-series-circuit",
      type: "dialogue",
      prompt: "What happens to the second bulb?",
      lines: [
        {
          characterId: "volt",
          text: "Two bulbs, one battery, one loop of wire. A classic **series** circuit!",
        },
        { characterId: "terra", text: "And if I gently unscrew the first bulb?" },
        {
          characterId: "volt",
          text: "Then I've got nowhere to go. Quick — what does bulb two do?",
        },
      ],
      question: {
        options: [
          "It glows brighter — it gets all the current",
          "It goes out — the loop is broken",
          "It stays exactly as bright as before",
          "It dims a little but stays lit",
        ],
        answerIndex: 1,
      },
      explanation:
        "A series circuit has only **one path** for charge. Removing a bulb breaks the loop, so the current stops everywhere and the other bulb goes out too. In a *parallel* circuit, it would stay lit.",
      skillTags: ["electricity.series-circuits"],
      difficulty: 2,
    },
    {
      id: "dlg-seasons-tilt",
      type: "dialogue",
      prompt: "What really causes the seasons?",
      lines: [
        {
          characterId: "nova",
          text: "Fun fact: Earth is closest to the Sun in early **January**.",
        },
        {
          characterId: "terra",
          text: "Yet in the northern hemisphere, January is the middle of winter.",
        },
        { characterId: "nova", text: "So distance can't be the reason for the seasons. What is?" },
      ],
      question: {
        options: [
          "The Sun gives out more energy during our summer",
          "Earth's orbit is a long, stretched-out oval",
          "Earth's tilted axis changes how directly sunlight hits us",
          "Winter clouds block most of the Sun's light",
        ],
        answerIndex: 2,
      },
      explanation:
        "Earth's axis is tilted about 23.5°. When your hemisphere leans towards the Sun, sunlight hits it more directly and days are longer — summer. The orbit is nearly circular: the distance to the Sun only changes by about 3%.",
      hint: "If it were distance, both hemispheres would have summer at the same time.",
      skillTags: ["space.seasons"],
      difficulty: 3,
    },
  ],
};
