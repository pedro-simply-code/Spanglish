import { VOICE_SCENARIO_PREFIX, VOICE_TOPICS, type VoiceTopicKey } from "@/lib/ai-practice";

/*
 * Luna's topics: what each one is about (for the model), her fixed first line
 * (no model call) and the goals she works through. Luna follows the student's
 * lead but comes back to the goals still open, and says goodbye when they are
 * all covered.
 */

export type VoiceGoal = { key: string; goal: string };

type TopicSetup = { about: string; opening: string; goals: VoiceGoal[] };

export const VOICE_TOPIC_SETUP: Record<VoiceTopicKey, TopicSetup> = {
  intro: {
    about: "getting to know the student",
    opening: "Quiero conocerte: ¿cómo te llamas y de dónde eres?",
    goals: [
      { key: "name", goal: "their name and where they are from" },
      { key: "work", goal: "what they do (work or studies)" },
      { key: "hobbies", goal: "their hobbies or free time" },
      { key: "spanish", goal: "why they are learning Spanish" },
    ],
  },
  daily: {
    about: "the student's daily routine",
    opening: "Hoy hablamos de tu día a día. ¿Cómo es un día normal para ti?",
    goals: [
      { key: "morning", goal: "their morning routine" },
      { key: "work", goal: "what they do during the day" },
      { key: "evening", goal: "what they do in the evening" },
      { key: "weekend", goal: "how their weekend is different" },
    ],
  },
  food: {
    about: "food, cooking and restaurants",
    opening: "Hoy hablamos de comida. ¿Cuál es tu comida favorita?",
    goals: [
      { key: "favorite", goal: "their favorite food and why" },
      { key: "cooking", goal: "whether they cook and what" },
      { key: "restaurant", goal: "a restaurant or meal they remember" },
      { key: "try", goal: "a food they would like to try" },
    ],
  },
  travel: {
    about: "travel and places",
    opening: "Hoy hablamos de viajes. ¿Cuál es el mejor lugar que has visitado?",
    goals: [
      { key: "best", goal: "the best place they visited and why" },
      { key: "story", goal: "something that happened on a trip (past tense)" },
      { key: "style", goal: "how they like to travel" },
      { key: "next", goal: "where they want to go next" },
    ],
  },
  family: {
    about: "the student's family",
    opening: "Hoy hablamos de tu familia. Cuéntame, ¿cómo es tu familia?",
    goals: [
      { key: "members", goal: "who is in their family" },
      { key: "describe", goal: "what one family member is like" },
      { key: "together", goal: "what they do together" },
      { key: "tradition", goal: "a family tradition or memory" },
    ],
  },
  job: {
    about: "a practice job interview where you are the interviewer",
    opening:
      "Hoy practicamos una entrevista de trabajo y yo seré la entrevistadora. Para empezar, ¿me puedes contar un poco sobre ti?",
    goals: [
      { key: "about", goal: "a short introduction of the candidate" },
      { key: "experience", goal: "their work experience" },
      { key: "strengths", goal: "their strengths" },
      { key: "why", goal: "why they want this job" },
      { key: "questions", goal: "whether they have a question for you" },
    ],
  },
};

/** Goals for a topic the student wrote. */
const CUSTOM_GOALS: VoiceGoal[] = [
  { key: "what", goal: "what the topic means to them" },
  { key: "experience", goal: "a personal experience about it" },
  { key: "opinion", goal: "their opinion or feelings about it" },
  { key: "future", goal: "a plan or recommendation about it" },
];

export const isVoiceTopic = (key: string): key is VoiceTopicKey => key in VOICE_TOPIC_SETUP;

/** Goals for a voice conversation from its `scenario` (`luna-<key>` or `luna-custom`). */
export function voiceGoals(scenario: string): VoiceGoal[] {
  const key = scenario.startsWith(VOICE_SCENARIO_PREFIX) ? scenario.slice(VOICE_SCENARIO_PREFIX.length) : "";
  return isVoiceTopic(key) ? VOICE_TOPIC_SETUP[key].goals : CUSTOM_GOALS;
}

export const VOICE_EMOJI = "🎙️";

export function voiceEmoji(scenario: string) {
  return VOICE_TOPICS.find((topic) => `${VOICE_SCENARIO_PREFIX}${topic.key}` === scenario)?.emoji ?? VOICE_EMOJI;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "";

/** Luna's fixed lines (Spanish, no model call). */
export const voiceOpening = (name: string, line: string) =>
  `¡Hola${name ? `, ${name}` : ""}! Soy Luna. Vamos a practicar español hablando, con calma. ${line}`;
export const customOpening = (topic: string) =>
  `Hoy vamos a conversar sobre «${topic}». Para empezar, ¿qué me puedes contar de este tema?`;
export const voiceClosing = (name: string) =>
  `¡Muchas gracias${name ? `, ${name}` : ""}! Lo hiciste muy bien. Dame un momento para preparar tu informe.`;
