export type ChatAttachment = {
  icon: string;
  file: string;
  fileSize: string;
};

export type ChatMessage = {
  id: string;
  createdAt?: Date;
  msg: string;
  senderId: number | string;
  type: "text" | "image";
  attachment: ChatAttachment[];
};

export type ChatStatus = "online" | "busy" | "away" | "offline";

export type Chat = {
  id: number;
  name: string;
  status: ChatStatus;
  thumb: string;
  recent: boolean;
  excerpt: string;
  messages: ChatMessage[];
};
