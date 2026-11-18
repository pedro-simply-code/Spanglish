import { sub } from "date-fns";
import type { useTranslations } from "next-intl";
import type { Chat, ChatAttachment, ChatMessage } from "@/features/chats/types";
import { demoClock } from "@/lib/demo-clock";

type AppsTranslator = ReturnType<typeof useTranslations<"apps">>;

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
export function createChats(t: AppsTranslator): Chat[] {
  return [
    {
      id: 1,
      name: "James Johnson",
      status: "online",
      thumb: "/images/profile/user-10.jpg",
      recent: false,
      excerpt: t("chat.excerpts.themeDeveloper"),
      messages: [
        message(
          "c1-m1",
          1,
          t("chat.messages.c1m1"),
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
          t("chat.messages.c1m2"),
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c1-m3",
          "me",
          t("chat.messages.c1m3"),
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
          t("chat.messages.c1m5"),
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
      excerpt: t("chat.excerpts.doctor"),
      messages: [
        message(
          "c2-m1",
          "me",
          t("chat.messages.c2m1"),
          sub(demoClock(), { hours: 1 }),
          [adobeAttachment, chromeAttachment, javascriptAttachment, zipAttachment],
        ),
        message(
          "c2-m2",
          "me",
          t("chat.messages.c2m2"),
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c2-m3",
          2,
          t("chat.messages.c2m3"),
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
          t("chat.messages.c2m5"),
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
      excerpt: t("chat.excerpts.hacker"),
      messages: [
        message(
          "c3-m1",
          "me",
          t("chat.messages.c3m1"),
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, zipAttachment],
        ),
        message(
          "c3-m2",
          "me",
          t("chat.messages.c3m2"),
          sub(demoClock(), { hours: 9 }),
        ),
        message(
          "c3-m3",
          3,
          t("chat.messages.c3m3"),
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c3-m4",
          3,
          t("chat.messages.c3m4"),
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
      excerpt: t("chat.excerpts.house"),
      messages: [
        message(
          "c4-m1",
          "me",
          t("chat.messages.c4m1"),
          sub(demoClock(), { hours: 2 }),
        ),
        message(
          "c4-m2",
          4,
          t("chat.messages.c4m2"),
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
          t("chat.messages.c4m4"),
          sub(demoClock(), { minutes: 6 }),
        ),
        message(
          "c4-m5",
          "me",
          t("chat.messages.c4m5"),
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
      excerpt: t("chat.excerpts.frontEnd"),
      messages: [
        message(
          "c5-m1",
          "me",
          t("chat.messages.c5m1"),
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
          t("chat.messages.c5m2"),
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c5-m3",
          5,
          t("chat.messages.c5m3"),
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
          t("chat.messages.c5m5"),
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
      excerpt: t("chat.excerpts.graphics"),
      messages: [
        message(
          "c6-m1",
          "me",
          t("chat.messages.c6m1"),
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
          t("chat.messages.c6m3"),
          sub(demoClock(), { minutes: 5 }),
        ),
        message(
          "c6-m4",
          6,
          t("chat.messages.c6m4"),
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
      excerpt: t("chat.excerpts.backEnd"),
      messages: [
        message(
          "c7-m1",
          "me",
          t("chat.messages.c7m1"),
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, chromeAttachment],
        ),
        message(
          "c7-m2",
          "me",
          t("chat.messages.c7m2"),
          sub(demoClock(), { hours: 8 }),
        ),
        message(
          "c7-m3",
          7,
          t("chat.messages.c7m3"),
          sub(demoClock(), { minutes: 15 }),
        ),
        message(
          "c7-m4",
          7,
          t("chat.messages.c7m4"),
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
      excerpt: t("chat.excerpts.themeDeveloper"),
      messages: [
        message(
          "c8-m1",
          "me",
          t("chat.messages.c8m1"),
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, javascriptAttachment, zipAttachment],
        ),
        message(
          "c8-m2",
          "me",
          t("chat.messages.c8m2"),
          sub(demoClock(), { hours: 6 }),
        ),
        message(
          "c8-m3",
          8,
          t("chat.messages.c8m3"),
          sub(demoClock(), { minutes: 45 }),
        ),
        message(
          "c8-m4",
          8,
          t("chat.messages.c8m4"),
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
      excerpt: t("chat.excerpts.administrator"),
      messages: [
        message(
          "c9-m1",
          "me",
          t("chat.messages.c9m1"),
          sub(demoClock(), { hours: 10 }),
          [javascriptAttachment, zipAttachment],
        ),
        message(
          "c9-m2",
          "me",
          t("chat.messages.c9m2"),
          sub(demoClock(), { hours: 8 }),
        ),
        message(
          "c9-m3",
          9,
          t("chat.messages.c9m3"),
          sub(demoClock(), { minutes: 5 }),
        ),
        message(
          "c9-m4",
          9,
          t("chat.messages.c9m4"),
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
      excerpt: t("chat.excerpts.doctor"),
      messages: [
        message(
          "c10-m1",
          "me",
          t("chat.messages.c10m1"),
          sub(demoClock(), { hours: 10 }),
          [adobeAttachment, zipAttachment],
        ),
        message(
          "c10-m2",
          "me",
          t("chat.messages.c10m2"),
          sub(demoClock(), { hours: 6 }),
        ),
        message(
          "c10-m3",
          10,
          t("chat.messages.c10m3"),
          sub(demoClock(), { minutes: 30 }),
        ),
        message(
          "c10-m4",
          10,
          t("chat.messages.c10m4"),
          sub(demoClock(), { minutes: 6 }),
        ),
      ],
    },
  ];
}
