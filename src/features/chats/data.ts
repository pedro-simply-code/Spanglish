import { sub } from "date-fns";
import type { Chat, ChatAttachment, ChatMessage } from "@/features/chats/types";
import { demoClock } from "@/lib/demo-clock";

const adobeAttachment: ChatAttachment = {
  icon: "/images/chat/icon-adobe.svg",
  file: "service-task.pdf",
  fileSize: "2MB",
};

const chromeAttachment: ChatAttachment = {
  icon: "/images/chat/icon-chrome.svg",
  file: "homepage-design.fig",
  fileSize: "3MB",
};

const figmaAttachment: ChatAttachment = {
  icon: "/images/chat/icon-figma.svg",
  file: "about-us.html",
  fileSize: "1KB",
};

const javascriptAttachment: ChatAttachment = {
  icon: "/images/chat/icon-javascript.svg",
  file: "work-project.zip",
  fileSize: "20MB",
};

const zipAttachment: ChatAttachment = {
  icon: "/images/chat/icon-zip-folder.svg",
  file: "custom.js",
  fileSize: "2MB",
};

function message(
  id: string,
  senderId: number | string,
  msg: string,
  createdAt?: Date,
  attachment: ChatAttachment[] = [],
): ChatMessage {
  return { id, senderId, msg, createdAt, type: "text", attachment };
}

function imageMessage(
  id: string,
  senderId: number | string,
  msg: string,
  createdAt?: Date,
): ChatMessage {
  return { id, senderId, msg, createdAt, type: "image", attachment: [] };
}

/**
 * Builds the static chat list with timestamps relative to the frozen demo
 * clock, so the server render and the client render stay consistent.
 */
export function createChats(): Chat[] {
  return [
    {
      id: 1,
      name: "James Johnson",
      status: "online",
      thumb: "/images/profile/user-10.jpg",
      recent: false,
      excerpt: "Theme Developer",
      messages: [
        message(
          "c1-m1",
          1,
          "Hey Mathew, can you take a look at the new theme tokens?",
          sub(demoClock(), { hours: 1 }),
          [
            adobeAttachment,
            chromeAttachment,
            figmaAttachment,
            javascriptAttachment,
            zipAttachment,
          ],
        ),
        message(
          "c1-m2",
          1,
          "I pushed the updated palette to the shared branch.",
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c1-m3",
          "me",
          "Nice, I will review it before lunch.",
          sub(demoClock(), { minutes: 6 }),
        ),
        imageMessage(
          "c1-m4",
          "me",
          "/images/blog/blog-img1.jpg",
          sub(demoClock(), { minutes: 5 }),
        ),
        message(
          "c1-m5",
          1,
          "Looks great, let us ship it today.",
          sub(demoClock(), { minutes: 4 }),
        ),
      ],
    },
    {
      id: 2,
      name: "Maria Hernandez",
      status: "away",
      thumb: "/images/profile/user-9.jpg",
      recent: true,
      excerpt: "Doctor",
      messages: [
        message(
          "c2-m1",
          "me",
          "Good morning! Are we still on for the checkup call?",
          sub(demoClock(), { hours: 1 }),
          [adobeAttachment, chromeAttachment, javascriptAttachment, zipAttachment],
        ),
        message(
          "c2-m2",
          "me",
          "I can send over the notes from last session.",
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c2-m3",
          2,
          "Morning! Yes, same time works for me.",
          sub(demoClock(), { minutes: 6 }),
        ),
        imageMessage(
          "c2-m4",
          2,
          "/images/blog/blog-img1.jpg",
          sub(demoClock(), { minutes: 5 }),
        ),
        message(
          "c2-m5",
          "me",
          "Perfect, see you then.",
          sub(demoClock(), { minutes: 1 }),
        ),
      ],
    },
    {
      id: 3,
      name: "David Smith",
      status: "busy",
      thumb: "/images/profile/user-3.jpg",
      recent: false,
      excerpt: "Hacker",
      messages: [
        message(
          "c3-m1",
          "me",
          "The build pipeline is failing again on the staging job.",
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, zipAttachment],
        ),
        message(
          "c3-m2",
          "me",
          "I attached the log dump for you.",
          sub(demoClock(), { hours: 9 }),
        ),
        message(
          "c3-m3",
          3,
          "Found it, a missing environment variable.",
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c3-m4",
          3,
          "Adding it to the secrets manager now.",
          sub(demoClock(), { minutes: 12 }),
        ),
      ],
    },
    {
      id: 4,
      name: "Maria Rodriguez",
      status: "offline",
      thumb: "/images/profile/user-2.jpg",
      recent: true,
      excerpt: "Please wait outside of the house",
      messages: [
        message(
          "c4-m1",
          "me",
          "Are you home? I am around the corner.",
          sub(demoClock(), { hours: 2 }),
        ),
        message(
          "c4-m2",
          4,
          "Give me five minutes, I am wrapping up a call.",
          sub(demoClock(), { hours: 1 }),
          [javascriptAttachment, zipAttachment],
        ),
        imageMessage(
          "c4-m3",
          "me",
          "/images/blog/blog-img1.jpg",
          sub(demoClock(), { minutes: 45 }),
        ),
        message(
          "c4-m4",
          4,
          "Please wait outside of the house.",
          sub(demoClock(), { minutes: 6 }),
        ),
        message(
          "c4-m5",
          "me",
          "No problem, take your time.",
          sub(demoClock(), { minutes: 1 }),
        ),
      ],
    },
    {
      id: 5,
      name: "Robert Smith",
      status: "online",
      thumb: "/images/profile/user-5.jpg",
      recent: true,
      excerpt: "Front End Developer",
      messages: [
        message(
          "c5-m1",
          "me",
          "The new lesson widgets are ready for review.",
          sub(demoClock(), { hours: 1 }),
          [
            adobeAttachment,
            chromeAttachment,
            figmaAttachment,
            javascriptAttachment,
            zipAttachment,
          ],
        ),
        message(
          "c5-m2",
          "me",
          "I kept the card radius consistent with the rest.",
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c5-m3",
          5,
          "Checking the pull request right now.",
          sub(demoClock(), { minutes: 12 }),
        ),
        imageMessage(
          "c5-m4",
          5,
          "/images/blog/blog-img1.jpg",
          sub(demoClock(), { minutes: 8 }),
        ),
        message(
          "c5-m5",
          5,
          "Approving it, nice work!",
          sub(demoClock(), { minutes: 5 }),
        ),
      ],
    },
    {
      id: 6,
      name: "Joseph Sarah",
      status: "busy",
      thumb: "/images/profile/user-10.jpg",
      recent: false,
      excerpt: "Graphics Designer",
      messages: [
        message(
          "c6-m1",
          "me",
          "Do you have the final illustrations for the course?",
          sub(demoClock(), { hours: 10 }),
          [chromeAttachment, javascriptAttachment, zipAttachment],
        ),
        imageMessage(
          "c6-m2",
          "me",
          "/images/blog/blog-img1.jpg",
          sub(demoClock(), { hours: 9 }),
        ),
        message(
          "c6-m3",
          6,
          "Almost done, one export left.",
          sub(demoClock(), { minutes: 5 }),
        ),
        message(
          "c6-m4",
          6,
          "Sending everything in five.",
          sub(demoClock(), { minutes: 2 }),
        ),
      ],
    },
    {
      id: 7,
      name: "Thomas Smith",
      status: "away",
      thumb: "/images/profile/user-8.jpg",
      recent: true,
      excerpt: "Back End Developer",
      messages: [
        message(
          "c7-m1",
          "me",
          "The lesson progress endpoint is returning stale data.",
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, chromeAttachment],
        ),
        message(
          "c7-m2",
          "me",
          "Cache headers look wrong to me.",
          sub(demoClock(), { hours: 8 }),
        ),
        message(
          "c7-m3",
          7,
          "Good catch, the CDN rule was missing.",
          sub(demoClock(), { minutes: 15 }),
        ),
        message(
          "c7-m4",
          7,
          "Fixed and deployed to staging.",
          sub(demoClock(), { minutes: 10 }),
        ),
      ],
    },
    {
      id: 8,
      name: "David Elizabeth",
      status: "offline",
      thumb: "/images/profile/user-3.jpg",
      recent: false,
      excerpt: "Theme Developer",
      messages: [
        message(
          "c8-m1",
          "me",
          "Here is the updated component inventory.",
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, javascriptAttachment, zipAttachment],
        ),
        message(
          "c8-m2",
          "me",
          "Page templates are included as well.",
          sub(demoClock(), { hours: 6 }),
        ),
        message(
          "c8-m3",
          8,
          "Thanks, downloading it now.",
          sub(demoClock(), { minutes: 45 }),
        ),
        message(
          "c8-m4",
          8,
          "I will add comments by tomorrow.",
          sub(demoClock(), { minutes: 20 }),
        ),
      ],
    },
    {
      id: 9,
      name: "Charles Martha",
      status: "online",
      thumb: "/images/profile/user-4.jpg",
      recent: false,
      excerpt: "Administrator",
      messages: [
        message(
          "c9-m1",
          "me",
          "Access for the new students has been granted.",
          sub(demoClock(), { hours: 10 }),
          [javascriptAttachment, zipAttachment],
        ),
        message(
          "c9-m2",
          "me",
          "They can start with the placement quiz.",
          sub(demoClock(), { hours: 8 }),
        ),
        message(
          "c9-m3",
          9,
          "Perfect, I will welcome them in the group.",
          sub(demoClock(), { minutes: 5 }),
        ),
        message(
          "c9-m4",
          9,
          "Also, the weekly report is ready.",
          sub(demoClock(), { minutes: 2 }),
        ),
      ],
    },
    {
      id: 10,
      name: "Samuel Eliza",
      status: "online",
      thumb: "/images/profile/user-5.jpg",
      recent: false,
      excerpt: "Doctor",
      messages: [
        message(
          "c10-m1",
          "me",
          "Reminder: the health workshop starts at six.",
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, zipAttachment],
        ),
        message(
          "c10-m2",
          "me",
          "I saved you a seat near the window.",
          sub(demoClock(), { hours: 6 }),
        ),
        message(
          "c10-m3",
          10,
          "Thank you, I will be there on time.",
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c10-m4",
          10,
          "See you tonight!",
          sub(demoClock(), { minutes: 6 }),
        ),
      ],
    },
  ];
}
