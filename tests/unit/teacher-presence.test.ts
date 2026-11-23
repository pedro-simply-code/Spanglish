import { beforeEach, describe, expect, it, vi } from "vitest";

const listParticipants = vi.fn();
const sessionActive = vi.fn();
let client: { listParticipants: typeof listParticipants } | null = { listParticipants };

vi.mock("@/server/classes/livekit-api", () => ({ getRoomServiceClient: () => client }));
vi.mock("@/server/classes/class-live-session", () => ({ isClassLiveSessionActive: sessionActive }));
vi.mock("@/server/classes/livekit", () => ({ sanitizeLiveKitRoomName: (name: string) => name }));
vi.mock("@/server/classes/class-repository", () => ({ classRoomName: (id: string) => `class-${id}` }));
vi.mock("@/server/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ teacherId: "teacher-1" }] }) }) }) },
}));

const { isClassOpenForStudents } = await import("@/server/classes/teacher-presence");

describe("students enter only when the teacher is in the room", () => {
  beforeEach(() => {
    client = { listParticipants };
    listParticipants.mockReset();
    sessionActive.mockReset();
  });

  it("stays closed when the teacher never started the class", async () => {
    sessionActive.mockResolvedValue(false);
    expect(await isClassOpenForStudents("c1")).toBe(false);
    expect(listParticipants).not.toHaveBeenCalled();
  });

  it("opens when the class is started and the teacher is connected", async () => {
    sessionActive.mockResolvedValue(true);
    listParticipants.mockResolvedValue([{ identity: "agent-AJ_1" }, { identity: "teacher-1" }]);
    expect(await isClassOpenForStudents("c1")).toBe(true);
    expect(listParticipants).toHaveBeenCalledWith("class-c1");
  });

  it("stays closed when the class was started but only the agent or nobody is in the room", async () => {
    sessionActive.mockResolvedValue(true);
    listParticipants.mockResolvedValue([{ identity: "agent-AJ_1" }]);
    expect(await isClassOpenForStudents("c1")).toBe(false);
    listParticipants.mockRejectedValue(Object.assign(new Error("requested room does not exist"), { status: 404 }));
    expect(await isClassOpenForStudents("c1")).toBe(false);
  });

  it("falls back to the started class when LiveKit can't be asked", async () => {
    sessionActive.mockResolvedValue(true);
    listParticipants.mockRejectedValue(new Error("connect ECONNREFUSED"));
    expect(await isClassOpenForStudents("c1")).toBe(true);
    client = null;
    expect(await isClassOpenForStudents("c1")).toBe(true);
  });
});
