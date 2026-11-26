"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Badge from "@mui/material/Badge";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  IconFileText,
  IconHandStop,
  IconMessageCircle,
  IconPin,
  IconUsers,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ConnectionState,
  DisconnectReason,
  Room,
  RoomEvent,
  Track,
  LocalTrack,
  RemoteTrack,
  type Participant,
  type RemoteParticipant,
  type TrackPublication,
} from "livekit-client";
import {
  CLASSROOM_TOPIC_CHAT,
  CLASSROOM_TOPIC_HOST,
  CLASSROOM_TOPIC_PROFILE,
  CLASSROOM_TOPIC_RAISED_HAND,
  CLASSROOM_TOPIC_LOCAL_RECORDING,
  CLASSROOM_TOPIC_SCREEN_SHARE,
  type ClassroomChatMessage,
  type ClassroomHostSignal,
  type ClassroomLayoutMode,
  type ClassroomLocalRecordingRequestPayload,
  type ClassroomProfilePayload,
  type ClassroomRaisedHandPayload,
  type ClassroomScreenShareRequestPayload,
  isStaffGuestIdentity,
  parseClassroomParticipantMetadata,
} from "@/features/classes/classroom-protocol";
import {
  getClassLiveSessionStatusAction,
  listClassroomChatMessagesAction,
  muteClassroomParticipantAction,
  sendClassroomChatMessageAction,
} from "@/features/classes/classroom-actions";
import { ClassroomChat } from "@/features/classes/components/classroom-chat";
import {
  ClassroomTranscriptPanel,
} from "@/features/classes/components/classroom-captions";
import { useClassroomCaptions } from "@/features/classes/components/use-classroom-captions";
import { ClassroomHostToolbar } from "@/features/classes/components/classroom-host-toolbar";
import { ClassroomMediaToolbar } from "@/features/classes/components/classroom-media-toolbar";
import { LabeledToolbarTool } from "@/features/classes/components/classroom-toolbar-labeled-tool";
import { useClassroomRecording } from "@/features/classes/components/use-classroom-recording";
import type {
  LiveKitClassroomSession,
  RecordingClientConfig,
} from "@/features/classes/types";
import { friendlyMediaError } from "@/lib/media-devices";
import { useAppToast } from "@/lib/use-app-toast";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type ClassroomLiveKitStageProps = {
  liveKit: LiveKitClassroomSession;
  classId: string;
  meetingRoom: string;
  viewerName: string;
  topic: string;
  teacherName: string;
  recordingConfig: RecordingClientConfig;
  guestViewer: boolean;
  guestSelfServeMedia?: boolean;
  canModerate?: boolean;
  canEndLiveSession?: boolean;
  viewerAvatarUrl: string;
  guestJoinToken?: string | null;
};

type RosterPerson = {
  identity: string;
  name: string;
  isLocal: boolean;
  micOn: boolean;
  cameraOn: boolean;
  screenSharing: boolean;
};

type TrackRegistryEntry = {
  track: LocalTrack | RemoteTrack;
  publication: TrackPublication;
  participant: Participant;
};

type LayoutSnapshot = {
  viewMode: ClassroomLayoutMode;
  pinnedIdentity: string | null;
  galleryFocusIdentity: string | null;
  activeSpeakerIdentity: string | null;
};

function participantInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? "";
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function participantMicLive(participant: Participant) {
  const publication = participant.getTrackPublication(Track.Source.Microphone);
  if (!publication) return false;
  return !publication.isMuted;
}

function readRoster(room: Room, t: (key: string) => string): RosterPerson[] {
  const mapParticipant = (participant: Participant, isLocal: boolean): RosterPerson => ({
    identity: participant.identity,
    name: participant.name || (isLocal ? t("stage.youFallback") : t("stage.participantFallback")),
    isLocal,
    micOn: participantMicLive(participant),
    cameraOn: participant.isCameraEnabled,
    screenSharing: participant.isScreenShareEnabled,
  });

  const list = [mapParticipant(room.localParticipant, true)];
  room.remoteParticipants.forEach((participant) => {
    // The classroom agent only listens (live transcript): no tile, not in the list.
    if (participant.isAgent) return;
    list.push(mapParticipant(participant, false));
  });
  return list.sort((a, b) => Number(b.isLocal) - Number(a.isLocal));
}

function roomHasScreenShare(room: Room | null) {
  if (!room) return false;
  return listScreenSharingIdentities(room).length > 0;
}

function listScreenSharingIdentities(room: Room) {
  const ids: string[] = [];
  if (room.localParticipant.isScreenShareEnabled) {
    ids.push(room.localParticipant.identity);
  }
  room.remoteParticipants.forEach((participant) => {
    if (participant.isScreenShareEnabled) {
      ids.push(participant.identity);
    }
  });
  return ids;
}

async function tryEnableRoomDevices(room: Room) {
  try {
    await room.localParticipant.enableCameraAndMicrophone();
  } catch {
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch {
      /* no mic */
    }
    try {
      await room.localParticipant.setCameraEnabled(true);
    } catch {
      /* no camera */
    }
  }
}

function mergeRoomTracks(room: Room) {
  if (typeof MediaStream === "undefined") return null;

  const mixed = new MediaStream();
  const seen = new Set<string>();
  const addTrack = (track: MediaStreamTrack | undefined) => {
    if (!track || seen.has(track.id)) return;
    seen.add(track.id);
    mixed.addTrack(track);
  };

  room.localParticipant.trackPublications.forEach((publication) => {
    addTrack(publication.track?.mediaStreamTrack);
  });
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => {
      addTrack(publication.track?.mediaStreamTrack);
    });
  });

  return mixed.getTracks().length ? mixed : null;
}

function styleVideoElement(el: HTMLVideoElement) {
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.objectFit = "contain";
  el.style.backgroundColor = "transparent";
  el.style.display = "block";
}

function wireTileShell(tile: HTMLElement) {
  if (tile.dataset.shell === "1") {
    return {
      videoSlot: tile.querySelector('[data-role="video"]') as HTMLDivElement,
      coverEl: tile.querySelector('[data-role="cover"]') as HTMLDivElement,
    };
  }
  tile.dataset.shell = "1";
  if (!tile.style.position) tile.style.position = "relative";
  const coverEl = document.createElement("div");
  coverEl.dataset.role = "cover";
  coverEl.style.cssText =
    "position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;display:none;z-index:0;";
  const videoSlot = document.createElement("div");
  videoSlot.dataset.role = "video";
  videoSlot.style.cssText = "position:absolute;inset:0;z-index:1;";
  tile.replaceChildren(coverEl, videoSlot);
  return { videoSlot, coverEl };
}

function applyTileCover(coverEl: HTMLDivElement, avatarUrl: string | null, visible: boolean) {
  if (!visible || !avatarUrl) {
    coverEl.style.display = "none";
    coverEl.style.backgroundImage = "";
    return;
  }
  coverEl.style.display = "block";
  coverEl.style.backgroundImage = `url("${avatarUrl}")`;
}

function registryKey(identity: string) {
  return `${identity}:camera`;
}

function mergeChatMessages(
  prev: ClassroomChatMessage[],
  incoming: ClassroomChatMessage[],
): ClassroomChatMessage[] {
  const map = new Map<string, ClassroomChatMessage>();
  for (const message of [...prev, ...incoming]) {
    map.set(message.id, message);
  }
  return [...map.values()].sort(
    (left, right) => new Date(left.at).getTime() - new Date(right.at).getTime(),
  );
}

export function ClassroomLiveKitStage({
  liveKit,
  classId,
  meetingRoom,
  viewerName,
  topic,
  teacherName,
  recordingConfig,
  guestViewer,
  guestSelfServeMedia = false,
  canModerate = false,
  canEndLiveSession = false,
  viewerAvatarUrl,
  guestJoinToken = null,
}: ClassroomLiveKitStageProps) {
  const { showError, showInfo, showSuccess } = useAppToast();
  const t = useTranslations("classroom");
  const router = useRouter();
  /** Set once the teacher ends the class, so the ending is handled once. */
  const classEndedRef = useRef(false);
  const handleClassEnded = useCallback(() => {
    if (classEndedRef.current) return;
    classEndedRef.current = true;
    // The teacher who ended it already got a confirmation.
    if (!canEndLiveSession) showInfo({ message: t("signals.classEnded") });
    router.refresh();
  }, [canEndLiveSession, router, showInfo, t]);
  const handleClassEndedRef = useRef(handleClassEnded);
  useEffect(() => {
    handleClassEndedRef.current = handleClassEnded;
  }, [handleClassEnded]);
  const guestViewOnly = guestViewer && !guestSelfServeMedia;
  const showMediaDeviceControls = !guestViewOnly || guestSelfServeMedia;
  const mayPresentWithoutAsk = canModerate || guestSelfServeMedia;
  /** Enrolled students only — not host (teacher) or staff audience (manager/admin). */
  const studentAudienceTools = !canModerate && !guestSelfServeMedia;
  /** Local Speaker/Gallery toggles (students + staff audience, not host). */
  const audienceLayoutTools = !canModerate;
  const roomRef = useRef<Room | null>(null);
  /** The connected room, as state, for hooks that attach their own listeners. */
  const [liveRoom, setLiveRoom] = useState<Room | null>(null);
  const mainStageRef = useRef<HTMLDivElement>(null);
  const mainVideoSlotRef = useRef<HTMLDivElement>(null);
  const mainStageCoverRef = useRef<HTMLDivElement>(null);
  const pipRef = useRef<HTMLDivElement>(null);
  const pipVideoSlotRef = useRef<HTMLDivElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const screenShareStripRef = useRef<HTMLDivElement>(null);
  const galleryGridRef = useRef<HTMLDivElement>(null);
  const filmstripTileRefs = useRef(new Map<string, HTMLDivElement>());
  const screenShareTileRefs = useRef(new Map<string, HTMLButtonElement>());
  const galleryTileRefs = useRef(new Map<string, HTMLElement>());
  const trackRegistry = useRef(new Map<string, TrackRegistryEntry>());
  const streamRef = useRef<MediaStream | null>(null);
  const layoutRef = useRef<LayoutSnapshot>({
    viewMode: "speaker",
    pinnedIdentity: null,
    galleryFocusIdentity: null,
    activeSpeakerIdentity: null,
  });

  const [connecting, setConnecting] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [roster, setRoster] = useState<RosterPerson[]>([]);
  const [mainStageLabel, setMainStageLabel] = useState(() => t("stage.waitingForVideo"));
  const [mainHasVideo, setMainHasVideo] = useState(false);
  const [viewMode, setViewMode] = useState<ClassroomLayoutMode>("speaker");
  const [hostLayout, setHostLayout] = useState<ClassroomLayoutMode>("speaker");
  const [followHostLayout, setFollowHostLayout] = useState(() => !guestSelfServeMedia);
  const followHostLayoutRef = useRef(!guestSelfServeMedia);
  const [pinnedIdentity, setPinnedIdentity] = useState<string | null>(null);
  const [galleryFocusIdentity, setGalleryFocusIdentity] = useState<string | null>(null);
  const [activeSpeakerIdentity, setActiveSpeakerIdentity] = useState<string | null>(null);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(() => new Set());
  const [chatMessages, setChatMessages] = useState<ClassroomChatMessage[]>([]);
  const [sidebarTab, setSidebarTab] = useState<"participants" | "chat" | "transcript">(
    "participants",
  );
  const [screenShareRequests, setScreenShareRequests] = useState<
    { identity: string; name: string }[]
  >([]);
  const [screenShareGranted, setScreenShareGranted] = useState(false);
  const [screenShareRequestPending, setScreenShareRequestPending] = useState(false);
  const [localRecordingGranted, setLocalRecordingGranted] = useState(false);
  const [localRecordingRequestPending, setLocalRecordingRequestPending] = useState(false);
  const [localRecordingRequests, setLocalRecordingRequests] = useState<
    { identity: string; name: string }[]
  >([]);
  const [audienceMicLocked, setAudienceMicLocked] = useState(false);
  const [speakTurnGranted, setSpeakTurnGranted] = useState(false);
  /** Students need Accept or Allow unmute before enabling the mic again. */
  const [requireHostMicApproval, setRequireHostMicApproval] = useState(false);
  const [calledSpeakerIdentity, setCalledSpeakerIdentity] = useState<string | null>(null);
  const calledSpeakerIdentityRef = useRef<string | null>(null);
  const speakTurnGrantedRef = useRef(false);
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, string>>({});
  const [focusedScreenShareIdentity, setFocusedScreenShareIdentity] = useState<string | null>(
    null,
  );
  const focusedScreenShareRef = useRef<string | null>(null);
  const canModerateRef = useRef(canModerate);
  const mayPresentWithoutAskRef = useRef(mayPresentWithoutAsk);
  const guestSelfServeMediaRef = useRef(guestSelfServeMedia);

  useEffect(() => {
    layoutRef.current = { viewMode, pinnedIdentity, galleryFocusIdentity, activeSpeakerIdentity };
  }, [viewMode, pinnedIdentity, galleryFocusIdentity, activeSpeakerIdentity]);

  useEffect(() => {
    canModerateRef.current = canModerate;
    mayPresentWithoutAskRef.current = mayPresentWithoutAsk;
    guestSelfServeMediaRef.current = guestSelfServeMedia;
  }, [canModerate, mayPresentWithoutAsk, guestSelfServeMedia]);

  useEffect(() => {
    followHostLayoutRef.current = followHostLayout;
  }, [followHostLayout]);

  useEffect(() => {
    calledSpeakerIdentityRef.current = calledSpeakerIdentity;
  }, [calledSpeakerIdentity]);

  useEffect(() => {
    speakTurnGrantedRef.current = speakTurnGranted;
  }, [speakTurnGranted]);

  useEffect(() => {
    focusedScreenShareRef.current = focusedScreenShareIdentity;
  }, [focusedScreenShareIdentity]);

  const refreshRoster = useCallback((room: Room) => {
    setRoster(readRoster(room, t));
    setCameraOn(room.localParticipant.isCameraEnabled);
    setMicOn(participantMicLive(room.localParticipant));
    setSharingScreen(room.localParticipant.isScreenShareEnabled);
  }, [t]);

  const syncStream = useCallback(() => {
    const room = roomRef.current;
    if (!room) return null;
    const mixed = mergeRoomTracks(room);
    streamRef.current = mixed;
    return mixed;
  }, []);

  const recording = useClassroomRecording({
    classId,
    topic,
    recordingConfig,
    getMediaStream: () => syncStream(),
    localOnly: !canModerate && localRecordingGranted,
  });

  // Fallback when the room could not be deleted: students check every few
  // seconds whether the teacher ended the class.
  useEffect(() => {
    if (canModerate || !liveRoom) return;
    const id = window.setInterval(() => {
      void getClassLiveSessionStatusAction(classId).then(({ active }) => {
        if (!active) {
          liveRoom.disconnect().catch(() => undefined);
          handleClassEndedRef.current();
        }
      });
    }, 10_000);
    return () => window.clearInterval(id);
  }, [canModerate, classId, liveRoom]);

  const captions = useClassroomCaptions({ room: liveRoom, classId, guestJoinToken });

  const resolveStageCameraIdentity = useCallback((layout: LayoutSnapshot) => {
    if (layout.viewMode === "speaker" && layout.pinnedIdentity) {
      return layout.pinnedIdentity;
    }
    if (layout.viewMode === "speaker" && layout.activeSpeakerIdentity) {
      return layout.activeSpeakerIdentity;
    }
    return null;
  }, []);

  const resolveFocusedScreenShareIdentity = useCallback(
    (room: Room) => {
      const sharers = listScreenSharingIdentities(room);
      if (!sharers.length) return null;

      const preference = focusedScreenShareRef.current;
      if (preference && sharers.includes(preference)) {
        return preference;
      }

      const layout = layoutRef.current;
      if (layout.pinnedIdentity && sharers.includes(layout.pinnedIdentity)) {
        return layout.pinnedIdentity;
      }

      const teacher = roster.find(
        (person) => person.name === teacherName && sharers.includes(person.identity),
      );
      if (teacher) return teacher.identity;

      return sharers[0] ?? null;
    },
    [roster, teacherName],
  );

  const ensureFilmstripTile = useCallback((identity: string) => {
    let tile = filmstripTileRefs.current.get(identity);
    if (!tile && filmstripRef.current) {
      tile = document.createElement("div");
      tile.dataset.participant = identity;
      tile.style.width = "132px";
      tile.style.height = "74px";
      tile.style.flexShrink = "0";
      tile.style.borderRadius = "8px";
      tile.style.overflow = "hidden";
      tile.style.backgroundColor = "#111";
      tile.style.border = "1px solid rgba(255,255,255,0.14)";
      tile.style.position = "relative";
      filmstripRef.current.appendChild(tile);
      filmstripTileRefs.current.set(identity, tile);
    }
    return tile ?? null;
  }, []);

  const ensureScreenShareStripTile = useCallback((identity: string) => {
    let tile = screenShareTileRefs.current.get(identity);
    if (!tile && screenShareStripRef.current) {
      const created = document.createElement("button");
      created.type = "button";
      tile = created;
      tile.dataset.participant = identity;
      tile.dataset.screenShare = "1";
      tile.style.width = "160px";
      tile.style.height = "90px";
      tile.style.flexShrink = "0";
      tile.style.borderRadius = "8px";
      tile.style.overflow = "hidden";
      tile.style.backgroundColor = "#111";
      tile.style.border = "1px solid rgba(255,255,255,0.14)";
      tile.style.position = "relative";
      tile.style.padding = "0";
      tile.style.cursor = "pointer";
      tile.onclick = () => setFocusedScreenShareIdentity(identity);
      screenShareStripRef.current.appendChild(tile);
      screenShareTileRefs.current.set(identity, tile);
    }
    return tile ?? null;
  }, []);

  const focusGalleryParticipant = useCallback((identity: string) => {
    followHostLayoutRef.current = false;
    setFollowHostLayout(false);
    setViewMode("gallery");
    setPinnedIdentity(null);
    setGalleryFocusIdentity((prev) => (prev === identity ? null : identity));
  }, []);

  const ensureGalleryTile = useCallback((identity: string) => {
    let tile = galleryTileRefs.current.get(identity);
    if (!tile && galleryGridRef.current) {
      const button = document.createElement("button");
      button.type = "button";
      tile = button;
      tile.dataset.participant = identity;
      tile.style.width = "100%";
      tile.style.aspectRatio = "16 / 9";
      tile.style.borderRadius = "8px";
      tile.style.overflow = "hidden";
      tile.style.backgroundColor = "#111";
      tile.style.border = "1px solid rgba(255,255,255,0.14)";
      tile.style.position = "relative";
      tile.style.padding = "0";
      tile.style.cursor = "pointer";
      tile.onclick = () => focusGalleryParticipant(identity);
      galleryGridRef.current.appendChild(tile);
      galleryTileRefs.current.set(identity, tile);
    }
    return tile ?? null;
  }, [focusGalleryParticipant]);

  const getTileHost = useCallback(
    (identity: string, source: Track.Source, isLocal: boolean) => {
      const room = roomRef.current;
      const layout = layoutRef.current;
      const screenActive = roomHasScreenShare(room);

      if (source === Track.Source.ScreenShare) {
        if (!room) return null;
        const sharers = listScreenSharingIdentities(room);
        const focusId = resolveFocusedScreenShareIdentity(room);
        if (!focusId) return null;

        const person = roster.find((row) => row.identity === identity);
        const labelName = isLocal ? viewerName : (person?.name ?? t("stage.screenShare"));

        if (identity === focusId) {
          setMainStageLabel(t("stage.screenLabel", { name: labelName }));
          setMainHasVideo(true);
          return mainVideoSlotRef.current;
        }

        if (sharers.length > 1) {
          return ensureScreenShareStripTile(identity);
        }

        return null;
      }

      if (source !== Track.Source.Camera) return null;

      if (isLocal) {
        setMainHasVideo((prev) => prev || Boolean(room?.localParticipant.isCameraEnabled));
        return pipVideoSlotRef.current;
      }

      if (layout.viewMode === "gallery" && !screenActive) {
        if (layout.galleryFocusIdentity) {
          if (identity === layout.galleryFocusIdentity) {
            const person = roster.find((row) => row.identity === identity);
            setMainStageLabel(person?.name ?? t("stage.speakerFallback"));
            setMainHasVideo(true);
            return mainVideoSlotRef.current;
          }
          return ensureFilmstripTile(identity);
        }
        return ensureGalleryTile(identity);
      }

      const stageIdentity = resolveStageCameraIdentity(layout);
      if (!screenActive && stageIdentity === identity) {
        const person = roster.find((row) => row.identity === identity);
        setMainStageLabel(person?.name ?? t("stage.speakerFallback"));
        setMainHasVideo(true);
        return mainVideoSlotRef.current;
      }

      return ensureFilmstripTile(identity);
    },
    [
      ensureFilmstripTile,
      ensureScreenShareStripTile,
      ensureGalleryTile,
      resolveFocusedScreenShareIdentity,
      resolveStageCameraIdentity,
      roster,
      t,
      viewerName,
    ],
  );

  const detachVideo = useCallback((track: LocalTrack | RemoteTrack) => {
    track.detach().forEach((el) => el.remove());
  }, []);

  const attachVideo = useCallback(
    (
      track: LocalTrack | RemoteTrack,
      publication: TrackPublication,
      participant: Participant,
    ) => {
      if (track.kind !== Track.Kind.Video) return;

      const isLocal = participant.identity === roomRef.current?.localParticipant.identity;
      const host = getTileHost(participant.identity, publication.source, isLocal);
      if (!host) {
        detachVideo(track);
        return;
      }

      const videoHost =
        host === pipVideoSlotRef.current ||
        host === mainVideoSlotRef.current
          ? host
          : wireTileShell(host).videoSlot;

      const trackSid = track.mediaStreamTrack.id;
      for (const element of track.attachedElements) {
        const video = element as HTMLVideoElement;
        if (video.parentElement === videoHost && video.dataset.trackSid === trackSid) {
          return;
        }
      }

      detachVideo(track);

      const el = track.attach() as HTMLVideoElement;
      el.dataset.trackSid = trackSid;
      styleVideoElement(el);
      videoHost.replaceChildren(el);
    },
    [detachVideo, getTileHost],
  );

  const ingestParticipantMeta = useCallback((participant: Participant) => {
    const meta = parseClassroomParticipantMetadata(participant.metadata);
    const avatarUrl = meta.avatarUrl?.trim();
    if (!avatarUrl) return;
    setParticipantAvatars((prev) => ({
      ...prev,
      [participant.identity]: avatarUrl,
    }));
  }, []);

  const syncParticipantCovers = useCallback(() => {
    const room = roomRef.current;
    const localIdentity = room?.localParticipant.identity ?? "";

    const resolveCover = (identity: string, cameraOn: boolean) => {
      const isLocal = identity === localIdentity;
      const avatarUrl = isLocal ? viewerAvatarUrl : (participantAvatars[identity] ?? null);
      const visible = Boolean(avatarUrl) && !cameraOn;
      return { avatarUrl, visible };
    };

    roster.forEach((person) => {
      const { avatarUrl, visible } = resolveCover(person.identity, person.cameraOn);
      for (const tileMap of [filmstripTileRefs.current, galleryTileRefs.current]) {
        const tile = tileMap.get(person.identity);
        if (!tile) continue;
        const { coverEl, videoSlot } = wireTileShell(tile);
        applyTileCover(coverEl, avatarUrl, visible);
        coverEl.style.zIndex = visible ? "2" : "0";
        videoSlot.style.opacity = visible ? "0" : "1";
      }
    });

    const localPerson = roster.find((row) => row.isLocal);
    const pipCover = pipRef.current?.querySelector(
      '[data-role="pip-cover"]',
    ) as HTMLDivElement | null;
    if (pipCover && pipVideoSlotRef.current) {
      const { avatarUrl, visible } = resolveCover(localIdentity, localPerson?.cameraOn ?? false);
      applyTileCover(pipCover, avatarUrl, visible);
      pipCover.style.zIndex = visible ? "2" : "0";
      pipVideoSlotRef.current.style.opacity = visible ? "0" : "1";
    }

    if (mainStageCoverRef.current) {
      const layout = layoutRef.current;
      const screenActive = roomHasScreenShare(roomRef.current);
      if (
        layout.viewMode === "gallery" &&
        !screenActive &&
        !layout.galleryFocusIdentity
      ) {
        applyTileCover(mainStageCoverRef.current, null, false);
        if (mainVideoSlotRef.current) {
          mainVideoSlotRef.current.style.opacity = "1";
          mainVideoSlotRef.current.replaceChildren();
        }
      } else {
      const stageId =
        (layout.viewMode === "gallery" ? layout.galleryFocusIdentity : layout.pinnedIdentity) ??
        (layout.viewMode === "speaker" ? layout.activeSpeakerIdentity : null);
      if (!screenActive && stageId) {
        const person = roster.find((row) => row.identity === stageId);
        const { avatarUrl, visible } = resolveCover(stageId, person?.cameraOn ?? false);
        applyTileCover(mainStageCoverRef.current, avatarUrl, visible);
        mainStageCoverRef.current.style.zIndex = visible ? "2" : "0";
        if (mainVideoSlotRef.current) {
          mainVideoSlotRef.current.style.opacity = visible ? "0" : "1";
        }
      } else {
        applyTileCover(mainStageCoverRef.current, null, false);
        if (mainVideoSlotRef.current) {
          mainVideoSlotRef.current.style.opacity = "1";
        }
      }
      }
    }
  }, [participantAvatars, roster, viewerAvatarUrl]);

  const syncGalleryLayout = useCallback(() => {
    const layout = layoutRef.current;
    if (layout.viewMode !== "gallery" || roomHasScreenShare(roomRef.current)) {
      return;
    }

    if (layout.galleryFocusIdentity) {
      galleryTileRefs.current.forEach((tile, identity) => {
        tile.remove();
        galleryTileRefs.current.delete(identity);
      });
      syncParticipantCovers();
      return;
    }

    const remotes = roster.filter((person) => !person.isLocal);
    const active = new Set(remotes.map((person) => person.identity));

    for (const person of remotes) {
      const tile = ensureGalleryTile(person.identity);
      if (!tile) continue;
      let label = tile.querySelector('[data-role="gallery-label"]') as HTMLSpanElement | null;
      if (!label) {
        label = document.createElement("span");
        label.dataset.role = "gallery-label";
        label.style.cssText =
          "position:absolute;bottom:0;left:0;right:0;z-index:3;padding:2px 6px;font-size:10px;line-height:1.2;color:#fff;background:rgba(0,0,0,0.72);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;";
        tile.appendChild(label);
      }
      label.textContent = person.name;
    }

    galleryTileRefs.current.forEach((tile, identity) => {
      if (!active.has(identity)) {
        tile.remove();
        galleryTileRefs.current.delete(identity);
      }
    });

    syncParticipantCovers();
  }, [ensureGalleryTile, roster, syncParticipantCovers]);

  const relayoutAll = useCallback(() => {
    trackRegistry.current.forEach((entry) => {
      attachVideo(entry.track, entry.publication, entry.participant);
    });
    roomRef.current?.remoteParticipants.forEach((participant) => {
      participant.trackPublications.forEach((publication) => {
        const track = publication.track;
        if (track && publication.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video) {
          attachVideo(track as LocalTrack | RemoteTrack, publication, participant);
        }
      });
    });
    const room = roomRef.current;
    if (room) {
      room.localParticipant.trackPublications.forEach((publication) => {
        const track = publication.track;
        if (track && publication.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video) {
          attachVideo(track, publication, room.localParticipant);
        }
      });
    }
  }, [attachVideo]);

  const registerTrack = useCallback(
    (
      track: LocalTrack | RemoteTrack,
      publication: TrackPublication,
      participant: Participant,
    ) => {
      if (publication.source === Track.Source.Camera) {
        trackRegistry.current.set(registryKey(participant.identity), {
          track,
          publication,
          participant,
        });
      }
      attachVideo(track, publication, participant);
    },
    [attachVideo],
  );

  const clearRemoteTiles = useCallback((identity: string) => {
    const film = filmstripTileRefs.current.get(identity);
    if (film) {
      film.remove();
      filmstripTileRefs.current.delete(identity);
    }
    const screenTile = screenShareTileRefs.current.get(identity);
    if (screenTile) {
      screenTile.remove();
      screenShareTileRefs.current.delete(identity);
    }
    const gallery = galleryTileRefs.current.get(identity);
    if (gallery) {
      gallery.remove();
      galleryTileRefs.current.delete(identity);
    }
    trackRegistry.current.delete(registryKey(identity));
  }, []);

  const publishTopic = useCallback((topic: string, payload: unknown) => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    const data = textEncoder.encode(JSON.stringify(payload));
    void room.localParticipant
      .publishData(data, { reliable: true, topic })
      .catch(() => {
        /* room disconnecting or publisher not ready */
      });
  }, []);

  const sendChat = useCallback(
    (text: string) => {
      const room = roomRef.current;
      if (!room) return;
      const message: ClassroomChatMessage = {
        id: `${room.localParticipant.identity}-${Date.now()}`,
        from: room.localParticipant.identity,
        name: room.localParticipant.name || viewerName,
        text,
        at: new Date().toISOString(),
      };
      setChatMessages((prev) => mergeChatMessages(prev, [message]));
      publishTopic(CLASSROOM_TOPIC_CHAT, message);
      void sendClassroomChatMessageAction(classId, message, guestJoinToken).catch(() => {
        /* history may still arrive via LiveKit for other participants */
      });
    },
    [classId, guestJoinToken, publishTopic, viewerName],
  );

  const toggleRaisedHand = useCallback(() => {
    if (canModerate || guestSelfServeMedia) return;
    const room = roomRef.current;
    if (!room) return;
    const next = !handRaised;
    if (!next) {
      setSpeakTurnGranted(false);
    }
    setHandRaised(next);
    const payload: ClassroomRaisedHandPayload = {
      identity: room.localParticipant.identity,
      name: room.localParticipant.name || viewerName,
      raised: next,
    };
    publishTopic(CLASSROOM_TOPIC_RAISED_HAND, payload);
    setRaisedHands((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(payload.identity);
      else copy.delete(payload.identity);
      return copy;
    });
  }, [canModerate, guestSelfServeMedia, handRaised, publishTopic, viewerName]);

  const broadcastLayout = useCallback(
    (mode: ClassroomLayoutMode) => {
      setHostLayout(mode);
      const signal: ClassroomHostSignal = { type: "layout", view: mode };
      publishTopic(CLASSROOM_TOPIC_HOST, signal);
    },
    [publishTopic],
  );

  const setStudentLayout = useCallback((mode: ClassroomLayoutMode) => {
    followHostLayoutRef.current = false;
    setFollowHostLayout(false);
    if (mode === "gallery") {
      setPinnedIdentity(null);
      setGalleryFocusIdentity(null);
    } else {
      setGalleryFocusIdentity(null);
    }
    setViewMode(mode);
  }, []);

  const followTeacherLayout = useCallback(() => {
    setFollowHostLayout(true);
    setViewMode(hostLayout);
  }, [hostLayout]);

  const broadcastHostSignal = useCallback(
    (signal: ClassroomHostSignal) => {
      publishTopic(CLASSROOM_TOPIC_HOST, signal);
    },
    [publishTopic],
  );

  const sendScreenShareRequest = useCallback(
    (requested: boolean) => {
      const room = roomRef.current;
      if (!room) return;
      const payload: ClassroomScreenShareRequestPayload = {
        identity: room.localParticipant.identity,
        name: room.localParticipant.name || viewerName,
        requested,
      };
      publishTopic(CLASSROOM_TOPIC_SCREEN_SHARE, payload);
    },
    [publishTopic, viewerName],
  );

  const approveScreenShareRequest = useCallback(
    (identity: string) => {
      broadcastHostSignal({ type: "screen_share", identity, approved: true });
      setScreenShareRequests((prev) => prev.filter((row) => row.identity !== identity));
    },
    [broadcastHostSignal],
  );

  const denyScreenShareRequest = useCallback(
    (identity: string) => {
      broadcastHostSignal({ type: "screen_share", identity, approved: false });
      setScreenShareRequests((prev) => prev.filter((row) => row.identity !== identity));
    },
    [broadcastHostSignal],
  );

  const sendLocalRecordingRequest = useCallback(
    (requested: boolean) => {
      const room = roomRef.current;
      if (!room) return;
      const payload: ClassroomLocalRecordingRequestPayload = {
        identity: room.localParticipant.identity,
        name: room.localParticipant.name || viewerName,
        requested,
      };
      publishTopic(CLASSROOM_TOPIC_LOCAL_RECORDING, payload);
      setLocalRecordingRequestPending(requested);
    },
    [publishTopic, viewerName],
  );

  const approveLocalRecordingRequest = useCallback(
    (identity: string) => {
      broadcastHostSignal({ type: "local_recording", identity, granted: true });
      setLocalRecordingRequests((prev) => prev.filter((row) => row.identity !== identity));
    },
    [broadcastHostSignal],
  );

  const denyLocalRecordingRequest = useCallback(
    (identity: string) => {
      broadcastHostSignal({ type: "local_recording", identity, granted: false });
      setLocalRecordingRequests((prev) => prev.filter((row) => row.identity !== identity));
    },
    [broadcastHostSignal],
  );

  const notifyMuteAllApplied = useCallback(() => {
    setAudienceMicLocked(true);
    broadcastHostSignal({ type: "audience_mic_lock", locked: true });
    broadcastHostSignal({ type: "mute_all" });
    const room = roomRef.current;
    if (room) {
      refreshRoster(room);
      syncStream();
    }
  }, [broadcastHostSignal, refreshRoster, syncStream]);

  const releaseAudienceMics = useCallback(() => {
    setAudienceMicLocked(false);
    setRequireHostMicApproval(false);
    broadcastHostSignal({ type: "audience_mic_lock", locked: false });
  }, [broadcastHostSignal]);

  const dismissRaisedHand = useCallback(
    (identity: string) => {
      if (!canModerate) return;
      setRaisedHands((prev) => {
        const copy = new Set(prev);
        copy.delete(identity);
        return copy;
      });
      broadcastHostSignal({ type: "raised_hand", identity, decision: "denied" });
    },
    [broadcastHostSignal, canModerate],
  );

  const callOnStudent = useCallback(
    async (identity: string) => {
      if (!canModerate) return;
      const previous = calledSpeakerIdentityRef.current;
      if (previous && previous !== identity && !isStaffGuestIdentity(previous)) {
        await muteClassroomParticipantAction(classId, meetingRoom, previous);
        broadcastHostSignal({ type: "raised_hand", identity: previous, decision: "released" });
      }
      setCalledSpeakerIdentity(identity);
      broadcastHostSignal({ type: "raised_hand", identity, decision: "accepted" });
      setRaisedHands((prev) => {
        const copy = new Set(prev);
        copy.delete(identity);
        return copy;
      });
      const room = roomRef.current;
      if (room) refreshRoster(room);
    },
    [broadcastHostSignal, canModerate, classId, meetingRoom, refreshRoster],
  );

  useEffect(() => {
    if (connecting) return;
    let cancelled = false;
    void listClassroomChatMessagesAction(classId, guestJoinToken).then((result) => {
      if (cancelled || !result.ok) return;
      setChatMessages((prev) => mergeChatMessages(prev, result.messages));
    });
    return () => {
      cancelled = true;
    };
  }, [classId, connecting, guestJoinToken]);

  useEffect(() => {
    syncGalleryLayout();
    relayoutAll();
  }, [
    viewMode,
    pinnedIdentity,
    galleryFocusIdentity,
    focusedScreenShareIdentity,
    roster,
    syncGalleryLayout,
    relayoutAll,
  ]);

  useEffect(() => {
    const spotlight = viewMode === "gallery" && Boolean(galleryFocusIdentity);
    filmstripTileRefs.current.forEach((tile, identity) => {
      if (spotlight) {
        tile.onclick = () => focusGalleryParticipant(identity);
        tile.style.cursor = "pointer";
      } else {
        tile.onclick = null;
        tile.style.cursor = "";
      }
    });
  }, [focusGalleryParticipant, galleryFocusIdentity, pinnedIdentity, roster, viewMode]);

  useEffect(() => {
    if (roomHasScreenShare(roomRef.current)) return;
    relayoutAll();
  }, [activeSpeakerIdentity, relayoutAll]);

  useEffect(() => {
    const sharers = roster.filter((person) => person.screenSharing);
    const active = new Set(sharers.map((person) => person.identity));
    screenShareTileRefs.current.forEach((tile, identity) => {
      if (!active.has(identity)) {
        tile.remove();
        screenShareTileRefs.current.delete(identity);
      }
    });
    screenShareTileRefs.current.forEach((tile, identity) => {
      const focused = identity === focusedScreenShareIdentity;
      tile.style.border = focused
        ? "2px solid #fa896b"
        : "1px solid rgba(255,255,255,0.14)";
      tile.style.boxShadow = focused ? "0 0 0 1px rgba(250,137,107,0.35)" : "none";
      const person = roster.find((row) => row.identity === identity);
      let label = tile.querySelector('[data-role="label"]') as HTMLSpanElement | null;
      if (!label) {
        label = document.createElement("span");
        label.dataset.role = "label";
        label.style.cssText =
          "position:absolute;bottom:0;left:0;right:0;z-index:2;padding:2px 6px;font-size:10px;line-height:1.2;color:#fff;background:rgba(0,0,0,0.72);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;pointer-events:none;";
        tile.appendChild(label);
      }
      label.textContent = person?.isLocal
        ? t("stage.yourScreen")
        : (person?.name ?? t("stage.screenShare"));
    });
  }, [focusedScreenShareIdentity, roster, t]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const sharers = listScreenSharingIdentities(room);
    if (sharers.length === 0) {
      setFocusedScreenShareIdentity(null);
      return;
    }
    if (sharers.length === 1) {
      setFocusedScreenShareIdentity(sharers[0] ?? null);
      return;
    }
    setFocusedScreenShareIdentity((prev) =>
      prev && sharers.includes(prev) ? prev : (sharers[0] ?? null),
    );
  }, [roster]);

  useEffect(() => {
    syncParticipantCovers();
  }, [syncParticipantCovers]);

  useEffect(() => {
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const bump = () => {
      refreshRoster(room);
      syncStream();
    };

    const onTrackSubscribed = (
      track: RemoteTrack,
      publication: TrackPublication,
      participant: RemoteParticipant,
    ) => {
      registerTrack(track, publication, participant);
      bump();
    };

    const onTrackUnsubscribed = (
      track: RemoteTrack,
      publication: TrackPublication,
      participant: RemoteParticipant,
    ) => {
      detachVideo(track);
      if (publication.source === Track.Source.Camera) {
        trackRegistry.current.delete(registryKey(participant.identity));
      }
      bump();
    };

    const onLocalTrackPublished = (publication: TrackPublication) => {
      const track = publication.track;
      if (track && (track instanceof LocalTrack || track instanceof RemoteTrack)) {
        registerTrack(track, publication, room.localParticipant);
      }
      bump();
    };

    const onLocalTrackUnpublished = (publication: TrackPublication) => {
      const track = publication.track;
      if (track && (track instanceof LocalTrack || track instanceof RemoteTrack)) {
        detachVideo(track);
      }
      if (publication.source === Track.Source.ScreenShare) {
        if (!mayPresentWithoutAskRef.current) {
          setScreenShareGranted(false);
          setScreenShareRequestPending(false);
        }
        if (mainVideoSlotRef.current) {
          mainVideoSlotRef.current.replaceChildren();
          setMainStageLabel(t("stage.screenShareEnded"));
          setMainHasVideo(false);
          relayoutAll();
        }
      }
      if (publication.source === Track.Source.Camera) {
        trackRegistry.current.delete(registryKey(room.localParticipant.identity));
      }
      bump();
    };

    const onDataReceived = (
      payload: Uint8Array,
      _participant?: Participant,
      _kind?: unknown,
      topic?: string,
    ) => {
      try {
        const raw = textDecoder.decode(payload);
        if (topic === CLASSROOM_TOPIC_CHAT) {
          const message = JSON.parse(raw) as ClassroomChatMessage;
          setChatMessages((prev) => mergeChatMessages(prev, [message]));
          return;
        }
        if (topic === CLASSROOM_TOPIC_RAISED_HAND) {
          const hand = JSON.parse(raw) as ClassroomRaisedHandPayload;
          setRaisedHands((prev) => {
            const copy = new Set(prev);
            if (hand.raised) copy.add(hand.identity);
            else copy.delete(hand.identity);
            return copy;
          });
          return;
        }
        if (topic === CLASSROOM_TOPIC_HOST) {
          const signal = JSON.parse(raw) as ClassroomHostSignal;
          if (signal.type === "layout") {
            setHostLayout(signal.view);
            if (canModerateRef.current) return;
            if (followHostLayoutRef.current) {
              setViewMode(signal.view);
              if (signal.view === "speaker") {
                setGalleryFocusIdentity(null);
              }
            }
            return;
          }
          if (signal.type === "screen_share") {
            const localId = roomRef.current?.localParticipant.identity;
            if (localId && signal.identity === localId) {
              setScreenShareGranted(signal.approved);
              setScreenShareRequestPending(false);
              if (signal.approved) {
                showSuccess({ message: t("signals.screenShareApproved") });
              } else {
                showError({ message: t("signals.screenShareDenied") });
              }
            }
            return;
          }
          if (signal.type === "local_recording") {
            const localId = roomRef.current?.localParticipant.identity;
            if (localId && signal.identity === localId) {
              setLocalRecordingGranted(signal.granted);
              setLocalRecordingRequestPending(false);
              if (signal.granted) {
                showSuccess({ message: t("signals.recordingApproved") });
              } else {
                setLocalRecordingGranted(false);
                showError({ message: t("signals.recordingDenied") });
              }
            }
            return;
          }
          if (signal.type === "mute_all") {
            const activeRoom = roomRef.current;
            if (activeRoom) {
              refreshRoster(activeRoom);
              syncStream();
            }
            const audienceStudent =
              !canModerateRef.current && !guestSelfServeMediaRef.current;
            if (audienceStudent) {
              showInfo({ message: t("signals.mutedAll") });
            }
            return;
          }
          if (signal.type === "audience_mic_lock") {
            const audienceStudent =
              !canModerateRef.current && !guestSelfServeMediaRef.current;
            if (audienceStudent) {
              setAudienceMicLocked(signal.locked);
              setRequireHostMicApproval(signal.locked);
            }
            return;
          }
          if (signal.type === "raised_hand") {
            const localId = roomRef.current?.localParticipant.identity;
            setRaisedHands((prev) => {
              const copy = new Set(prev);
              copy.delete(signal.identity);
              return copy;
            });
            if (signal.decision === "accepted") {
              setCalledSpeakerIdentity(signal.identity);
            } else if (
              signal.decision === "released" &&
              calledSpeakerIdentityRef.current === signal.identity
            ) {
              setCalledSpeakerIdentity(null);
            }
            if (localId === signal.identity) {
              setHandRaised(false);
              if (!guestSelfServeMediaRef.current) {
                if (signal.decision === "accepted") {
                  setSpeakTurnGranted(true);
                  setRequireHostMicApproval(false);
                  showSuccess({ message: t("signals.micApproved") });
                } else {
                  setSpeakTurnGranted(false);
                  setRequireHostMicApproval(true);
                  if (signal.decision === "denied") {
                    showInfo({ message: t("signals.handDismissed") });
                  } else if (signal.decision === "released") {
                    showInfo({ message: t("signals.turnEnded") });
                  }
                }
              }
            }
            const activeRoom = roomRef.current;
            if (activeRoom) {
              refreshRoster(activeRoom);
              syncStream();
            }
            return;
          }
          return;
        }
        if (topic === CLASSROOM_TOPIC_SCREEN_SHARE) {
          const request = JSON.parse(raw) as ClassroomScreenShareRequestPayload;
          if (!canModerateRef.current) return;
          setScreenShareRequests((prev) => {
            if (!request.requested) {
              return prev.filter((row) => row.identity !== request.identity);
            }
            if (prev.some((row) => row.identity === request.identity)) return prev;
            return [...prev, { identity: request.identity, name: request.name }];
          });
          return;
        }
        if (topic === CLASSROOM_TOPIC_LOCAL_RECORDING) {
          const request = JSON.parse(raw) as ClassroomLocalRecordingRequestPayload;
          if (!canModerateRef.current) return;
          setLocalRecordingRequests((prev) => {
            if (!request.requested) {
              return prev.filter((row) => row.identity !== request.identity);
            }
            if (prev.some((row) => row.identity === request.identity)) return prev;
            return [...prev, { identity: request.identity, name: request.name }];
          });
          return;
        }
        if (topic === CLASSROOM_TOPIC_PROFILE) {
          const profile = JSON.parse(raw) as ClassroomProfilePayload;
          const avatarUrl = profile.avatarUrl?.trim();
          if (avatarUrl) {
            setParticipantAvatars((prev) => ({
              ...prev,
              [profile.identity]: avatarUrl,
            }));
          }
        }
      } catch {
        /* ignore malformed packets */
      }
    };

    const onActiveSpeakersChanged = (speakers: Participant[]) => {
      const first = speakers[0];
      setActiveSpeakerIdentity(first?.identity ?? null);
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished);
    room.on(RoomEvent.ParticipantConnected, (participant) => {
      ingestParticipantMeta(participant);
      bump();
    });
    room.on(RoomEvent.ParticipantMetadataChanged, (_prev, participant) => {
      ingestParticipantMeta(participant);
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      clearRemoteTiles(participant.identity);
      setRaisedHands((prev) => {
        const copy = new Set(prev);
        copy.delete(participant.identity);
        return copy;
      });
      bump();
    });
    room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      // The teacher ended the class: the server deleted the LiveKit room.
      if (reason === DisconnectReason.ROOM_DELETED) {
        handleClassEndedRef.current();
      }
      setSharingScreen(false);
      setCameraOn(false);
      setMicOn(false);
      setRoster([]);
      setChatMessages([]);
      setRaisedHands(new Set());
    });
    room.on(RoomEvent.DataReceived, onDataReceived);
    room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (
        participant.isLocal &&
        publication.source === Track.Source.Microphone &&
        !mayPresentWithoutAskRef.current &&
        speakTurnGrantedRef.current
      ) {
        setSpeakTurnGranted(false);
        setRequireHostMicApproval(true);
      }
      refreshRoster(room);
      syncStream();
    });
    room.on(RoomEvent.TrackUnmuted, () => {
      refreshRoster(room);
      syncStream();
    });

    let cancelled = false;

    void room
      .connect(liveKit.serverUrl, liveKit.token)
      .then(async () => {
        if (cancelled) return;
        if (!guestViewOnly) {
          await tryEnableRoomDevices(room);
        }
        room.localParticipant.trackPublications.forEach((publication) => {
          if (publication.track) {
            registerTrack(publication.track, publication, room.localParticipant);
          }
        });
        room.remoteParticipants.forEach((participant) => {
          ingestParticipantMeta(participant);
        });
        refreshRoster(room);
        if (viewerAvatarUrl) {
          setParticipantAvatars((prev) => ({
            ...prev,
            [room.localParticipant.identity]: viewerAvatarUrl,
          }));
          publishTopic(CLASSROOM_TOPIC_PROFILE, {
            identity: room.localParticipant.identity,
            avatarUrl: viewerAvatarUrl,
          });
        }
        setConnecting(false);
        setLiveRoom(room);
        syncStream();
      })
      .catch((cause) => {
        if (!cancelled) {
          showError({
            title: t("errors.connectionTitle"),
            message:
              cause instanceof Error ? cause.message : t("errors.connectionFallback"),
          });
          setConnecting(false);
        }
      });

    // The maps live for the whole component; keep them for the cleanup below.
    const filmstripTiles = filmstripTileRefs.current;
    const screenShareTiles = screenShareTileRefs.current;
    const galleryTiles = galleryTileRefs.current;
    const tracks = trackRegistry.current;
    return () => {
      cancelled = true;
      setLiveRoom(null);
      room.removeAllListeners();
      filmstripTiles.forEach((tile) => tile.remove());
      filmstripTiles.clear();
      screenShareTiles.forEach((tile) => tile.remove());
      screenShareTiles.clear();
      galleryTiles.forEach((tile) => tile.remove());
      galleryTiles.clear();
      tracks.clear();
      if (room.state !== ConnectionState.Disconnected) {
        void room.disconnect();
      }
    };
    // Only reconnect when the LiveKit session changes — not when UI prefs/callbacks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally narrow
  }, [guestViewOnly, liveKit.serverUrl, liveKit.token]);

  const toggleCamera = async () => {
    const room = roomRef.current;
    if (!room || guestViewOnly) return;
    try {
      await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled);
      refreshRoster(room);
      syncStream();
      relayoutAll();
    } catch (cause) {
      showError({ message: friendlyMediaError(cause, t) });
    }
  };

  const toggleMic = async () => {
    const room = roomRef.current;
    if (!room || guestViewOnly) return;
    const enabling = !participantMicLive(room.localParticipant);
    if (enabling && !mayPresentWithoutAsk && !speakTurnGranted) {
      if (requireHostMicApproval || audienceMicLocked) {
        showInfo({ message: t("signals.micLocked") });
        return;
      }
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(enabling);
      if (!enabling && speakTurnGranted && !mayPresentWithoutAsk) {
        setSpeakTurnGranted(false);
        setRequireHostMicApproval(true);
      }
      refreshRoster(room);
      syncStream();
    } catch (cause) {
      showError({ message: friendlyMediaError(cause, t) });
    }
  };

  const toggleScreenShare = async () => {
    const room = roomRef.current;
    if (!room || guestViewOnly) return;
    const enabling = !room.localParticipant.isScreenShareEnabled;
    if (enabling && !mayPresentWithoutAsk && !screenShareGranted) {
      if (screenShareRequestPending) {
        showInfo({ message: t("signals.shareWaiting") });
        return;
      }
      setScreenShareRequestPending(true);
      sendScreenShareRequest(true);
      showInfo({ message: t("signals.shareRequested") });
      return;
    }
    try {
      await room.localParticipant.setScreenShareEnabled(enabling);
      if (enabling) {
        setScreenShareRequestPending(false);
        sendScreenShareRequest(false);
        if (!mayPresentWithoutAsk) {
          setScreenShareGranted(false);
        }
      } else if (!mayPresentWithoutAsk) {
        setScreenShareGranted(false);
        setScreenShareRequestPending(false);
      }
      refreshRoster(room);
      syncStream();
      relayoutAll();
    } catch (cause) {
      showError({ message: friendlyMediaError(cause, t) });
    }
  };

  const screenShareTooltip = sharingScreen
    ? t("toolbar.stopSharing")
    : mayPresentWithoutAsk
      ? t("toolbar.shareScreenHost")
      : screenShareGranted
        ? t("toolbar.shareScreenOneTime")
        : screenShareRequestPending
          ? t("toolbar.waitingApproval")
          : t("toolbar.requestShare");

  const galleryParticipants = roster.filter((person) => !person.isLocal);
  const galleryCount = galleryParticipants.length;
  const screenSharers = roster.filter((person) => person.screenSharing);
  const anyScreenShare = screenSharers.length > 0;
  const raisedHandPeople = roster.filter((person) => raisedHands.has(person.identity));
  const raisedHandQueue = raisedHandPeople.filter(
    (person) => !(canModerate && person.isLocal),
  );
  const showScreenShareDock = screenSharers.length > 1;
  const showRaisedHandDock = canModerate && raisedHandQueue.length > 0;
  const gallerySpotlight =
    viewMode === "gallery" && Boolean(galleryFocusIdentity) && !anyScreenShare;
  const showFilmstripDock =
    (viewMode === "speaker" &&
      screenSharers.length <= 1 &&
      roster.some((person) => !person.isLocal)) ||
  (gallerySpotlight && galleryCount > 0);
  const showStageDock =
    showScreenShareDock || showRaisedHandDock || showFilmstripDock;

  return (
    <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {connecting ? (
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            bgcolor: "rgba(0,0,0,0.45)",
          }}
        >
          <CircularProgress sx={{ color: "#fff" }} />
          <Typography variant="body2" color="#fff" mt={1}>
            {t("stage.connecting")}
          </Typography>
        </Stack>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", bgcolor: "#000" }}>
          <Box
            ref={mainStageRef}
            sx={{
              position: "relative",
              flex: 1,
              minHeight: 0,
              bgcolor: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box
              ref={mainStageCoverRef}
              data-role="main-cover"
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <Box
              ref={mainVideoSlotRef}
              sx={{ position: "absolute", inset: 0, zIndex: 1 }}
            />
            <Box
              ref={galleryGridRef}
              sx={{
                position: "absolute",
                inset: 12,
                display:
                  viewMode === "gallery" &&
                  !anyScreenShare &&
                  galleryCount > 0 &&
                  !galleryFocusIdentity
                    ? "grid"
                    : "none",
                pointerEvents:
                  viewMode === "gallery" &&
                  !galleryFocusIdentity &&
                  galleryCount > 0
                    ? "auto"
                    : "none",
                gridTemplateColumns:
                  galleryCount <= 1
                    ? "1fr"
                    : galleryCount <= 4
                      ? "repeat(2, 1fr)"
                      : galleryCount <= 9
                        ? "repeat(3, 1fr)"
                        : "repeat(4, 1fr)",
                gap: 1,
                zIndex: 1,
              }}
            />

            <Stack
              alignItems="center"
              spacing={0.5}
              sx={{
                position: "absolute",
                pointerEvents: "none",
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
                px: 2,
                display: mainHasVideo ? "none" : "flex",
                zIndex: 0,
              }}
            >
              <Typography variant="body2">{mainStageLabel}</Typography>
              <Typography variant="caption">
                {viewMode === "gallery"
                  ? galleryFocusIdentity
                    ? t("stage.gallerySpotlightHint")
                    : t("stage.galleryHint")
                  : t("stage.speakerHint")}
              </Typography>
            </Stack>

            <Box
              ref={pipRef}
              sx={{
                position: "absolute",
                right: 16,
                bottom: 16,
                width: { xs: 120, sm: 168 },
                height: { xs: 68, sm: 94 },
                borderRadius: 1.5,
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.25)",
                bgcolor: "#111",
                zIndex: 2,
                boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              }}
            >
              <Box
                data-role="pip-cover"
                sx={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 0,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <Box ref={pipVideoSlotRef} sx={{ position: "absolute", inset: 0, zIndex: 1 }} />
            </Box>
          </Box>

          <Box
            sx={{
              display: showStageDock ? "block" : "none",
              px: 1,
              py: 0.75,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              bgcolor: "#0c0c0c",
            }}
          >
            {showScreenShareDock ? (
              <Box
                ref={screenShareStripRef}
                title={t("stage.clickPreview")}
                sx={{
                  display: "flex",
                  gap: 1,
                  overflowX: "auto",
                  minHeight: 90,
                  pb: 0.25,
                  alignItems: "stretch",
                }}
              />
            ) : null}
            {!showScreenShareDock ? (
              <Box
                ref={screenShareStripRef}
                sx={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  overflow: "hidden",
                  pointerEvents: "none",
                }}
                aria-hidden
              />
            ) : null}
            {showRaisedHandDock ? (
              <>
                <Stack spacing={0.75} sx={{ pb: 0.5, pt: showScreenShareDock ? 0.5 : 0 }}>
                  {raisedHandQueue.map((person) => (
                    <Stack
                      key={person.identity}
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        icon={<IconHandStop size={14} />}
                        label={
                          person.isLocal ? t("stage.you", { name: person.name }) : person.name
                        }
                        sx={{
                          bgcolor: "rgba(0,0,0,0.55)",
                          color: "#fff",
                          borderColor: "rgba(255,255,255,0.25)",
                        }}
                        variant="outlined"
                      />
                      {person.isLocal && studentAudienceTools ? (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => toggleRaisedHand()}
                          sx={{ minWidth: 0, px: 1, color: "rgba(255,255,255,0.85)" }}
                        >
                          {t("stage.lowerHand")}
                        </Button>
                      ) : null}
                      {canModerate && !person.isLocal ? (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              void callOnStudent(person.identity);
                            }}
                          >
                            {t("stage.accept")}
                          </Button>
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() => dismissRaisedHand(person.identity)}
                            sx={{ color: "rgba(255,255,255,0.75)" }}
                          >
                            {t("stage.dismiss")}
                          </Button>
                        </>
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
              </>
            ) : null}
            <Box
              ref={filmstripRef}
              sx={{
                display: showFilmstripDock ? "flex" : "none",
                gap: 1,
                overflowX: "auto",
                minHeight: showFilmstripDock ? 74 : 0,
                pb: 0.25,
                pt: showRaisedHandDock || showScreenShareDock ? 0.25 : 0,
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            width: 280,
            flexShrink: 0,
            minHeight: 0,
            alignSelf: "stretch",
            overflow: "hidden",
            display: { xs: "none", sm: "flex" },
            flexDirection: "column",
            bgcolor: "#12131a",
            borderLeft: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Tabs
            value={sidebarTab}
            onChange={(_event, value: "participants" | "chat" | "transcript") =>
              setSidebarTab(value)
            }
            variant="fullWidth"
            sx={{
              minHeight: 40,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              "& .MuiTab-root": { color: "rgba(255,255,255,0.55)", minHeight: 40, py: 0.5 },
              "& .Mui-selected": { color: "#fff" },
              "& .MuiTabs-indicator": { bgcolor: "primary.main" },
            }}
          >
            <Tab
              value="participants"
              icon={<IconUsers size={18} />}
              aria-label={t("stage.peopleTab")}
              title={t("stage.peopleTab")}
            />
            <Tab
              value="chat"
              icon={<IconMessageCircle size={18} />}
              aria-label={t("stage.chatTab")}
              title={t("stage.chatTab")}
            />
            <Tab
              value="transcript"
              icon={
                <Badge
                  variant="dot"
                  color="primary"
                  invisible={!captions.active || sidebarTab === "transcript"}
                >
                  <IconFileText size={18} />
                </Badge>
              }
              aria-label={t("stage.transcriptTab")}
              title={t("stage.transcriptTab")}
            />
          </Tabs>

          {sidebarTab === "chat" ? (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <ClassroomChat messages={chatMessages} onSend={sendChat} />
            </Box>
          ) : sidebarTab === "transcript" ? (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <ClassroomTranscriptPanel lines={captions.lines} active={captions.active} />
            </Box>
          ) : (
            <>
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="caption" color="rgba(255,255,255,0.55)">
                  {t("stage.pinHint")}
                </Typography>
              </Box>
              <List dense sx={{ flex: 1, overflow: "auto" }}>
                {roster.map((person) => (
                  <ListItem
                    key={person.identity}
                    secondaryAction={
                      !person.isLocal ? (
                        <Tooltip
                          title={
                            (viewMode === "gallery"
                              ? galleryFocusIdentity
                              : pinnedIdentity) === person.identity
                              ? t("stage.unpin")
                              : t("stage.pinSpotlight")
                          }
                        >
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => {
                              if (viewMode === "gallery") {
                                focusGalleryParticipant(person.identity);
                                return;
                              }
                              setPinnedIdentity((prev) =>
                                prev === person.identity ? null : person.identity,
                              );
                            }}
                            sx={{
                              color:
                                (viewMode === "gallery"
                                  ? galleryFocusIdentity
                                  : pinnedIdentity) === person.identity
                                  ? "primary.main"
                                  : "rgba(255,255,255,0.55)",
                            }}
                          >
                            <IconPin size={16} />
                          </IconButton>
                        </Tooltip>
                      ) : null
                    }
                    sx={{ py: 0.75 }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: 12,
                          bgcolor: person.isLocal ? "primary.main" : "grey.700",
                        }}
                      >
                        {participantInitials(person.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <span>
                            {person.isLocal ? t("stage.you", { name: person.name }) : person.name}
                          </span>
                          {raisedHands.has(person.identity) ? (
                            <IconHandStop size={14} color="#f5c542" />
                          ) : null}
                        </Stack>
                      }
                      secondary={[
                        person.micOn ? t("stage.micOn") : t("stage.micOff"),
                        person.cameraOn ? t("stage.cameraOn") : t("stage.cameraOff"),
                        person.screenSharing ? t("stage.presenting") : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      primaryTypographyProps={{ color: "#fff", variant: "body2", component: "div" }}
                      secondaryTypographyProps={{
                        color: "rgba(255,255,255,0.55)",
                        variant: "caption",
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

        </Box>
      </Box>

      <Stack
        direction="row"
        spacing={1}
        alignItems="flex-start"
        justifyContent="center"
        useFlexGap
        flexWrap="wrap"
        sx={{
          bgcolor: "#0b0b0f",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          px: 1.5,
          py: 1,
        }}
      >
        {studentAudienceTools ? (
          <LabeledToolbarTool
            label={handRaised ? t("stage.lower") : t("stage.handUp")}
            tooltip={handRaised ? t("stage.lowerYourHand") : t("stage.raiseHand")}
          >
            <IconButton
              size="small"
              onClick={() => toggleRaisedHand()}
              sx={{ color: handRaised ? "warning.main" : "#fff" }}
            >
              <IconHandStop size={20} />
            </IconButton>
          </LabeledToolbarTool>
        ) : null}
        <ClassroomMediaToolbar
          variant="inline"
          recording={recording.recording}
          persisting={recording.persisting}
          sharingScreen={sharingScreen}
          cameraOn={cameraOn}
          micOn={micOn}
          canControlDevices={showMediaDeviceControls}
          onToggleCamera={() => {
            void toggleCamera();
          }}
          onToggleMic={() => {
            void toggleMic();
          }}
          onToggleScreen={() => {
            void toggleScreenShare();
          }}
          screenShareTooltip={screenShareTooltip}
          onToggleRecord={() =>
            recording.recording ? recording.stopRecording() : recording.startRecording()
          }
          localUrl={recording.localUrl}
          cloudUrl={recording.cloudUrl}
          topic={topic}
          onUploadCloud={recording.uploadToCloud}
          canUploadToCloud={recording.canUploadToCloud}
          showBrowserRecording={
            canModerate
              ? !recordingConfig.serverRecordingAvailable
              : localRecordingGranted
          }
          showRecordingRequest={studentAudienceTools && !localRecordingGranted}
          localRecordingRequestPending={localRecordingRequestPending}
          onRequestLocalRecording={() => sendLocalRecordingRequest(true)}
          localRecordingOnly={!canModerate && localRecordingGranted}
          layoutMode={audienceLayoutTools ? viewMode : undefined}
          onLayoutModeChange={audienceLayoutTools ? setStudentLayout : undefined}
          followHostLayout={studentAudienceTools ? followHostLayout : undefined}
          onFollowHostLayout={studentAudienceTools ? followTeacherLayout : undefined}
        />
        {canModerate ? (
          <>
            <Divider
              flexItem
              orientation="vertical"
              sx={{ borderColor: "rgba(255,255,255,0.12)", mx: 0.5, alignSelf: "center", height: 36 }}
            />
            <ClassroomHostToolbar
              classId={classId}
              meetingRoom={meetingRoom}
              layoutMode={viewMode}
              onLayoutChange={setViewMode}
              onBroadcastLayout={broadcastLayout}
              canEndLiveSession={canEndLiveSession}
              screenShareRequests={screenShareRequests}
              onApproveScreenShare={approveScreenShareRequest}
              onDenyScreenShare={denyScreenShareRequest}
              localRecordingRequests={localRecordingRequests}
              onApproveLocalRecording={approveLocalRecordingRequest}
              onDenyLocalRecording={denyLocalRecordingRequest}
              onMuteAllApplied={notifyMuteAllApplied}
              audienceMicLocked={audienceMicLocked}
              onReleaseAudienceMics={releaseAudienceMics}
            />
          </>
        ) : null}
      </Stack>
    </Box>
  );
}