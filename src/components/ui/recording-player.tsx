"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import { IconX } from "@tabler/icons-react";

/** Stream URL (checks access, then a short-lived private link). Never a download. */
export const recordingStreamUrl = (id: string) =>
  `/api/class-recordings/download?id=${encodeURIComponent(id)}`;

/** Times the player asks for a new link in a row before giving up (a real error). */
const MAX_RENEWALS = 3;

/**
 * Class video player without the browser's download option. Hiding the
 * button and the right-click menu stops casual saving; the private link it
 * streams from lasts 2 minutes, so a copied URL stops working almost at once.
 * When the link expires mid-class (seeking, a pause), the player quietly asks
 * for a new one and goes on from the same second.
 */
export function RecordingVideo({ recordingId, maxHeight = 480 }: { recordingId: string; maxHeight?: number | string }) {
  const renewals = useRef(0);

  const renew = (video: HTMLVideoElement) => {
    if (renewals.current >= MAX_RENEWALS) return;
    renewals.current += 1;
    const at = video.currentTime;
    const playing = !video.paused;
    video.src = `${recordingStreamUrl(recordingId)}&r=${Date.now()}`;
    video.addEventListener(
      "loadedmetadata",
      () => {
        video.currentTime = at;
        if (playing) void video.play().catch(() => undefined);
      },
      { once: true },
    );
    video.load();
  };

  return (
    <Box
      component="video"
      controls
      preload="metadata"
      playsInline
      disablePictureInPicture
      controlsList="nodownload noremoteplayback noplaybackrate"
      onContextMenu={(event: React.MouseEvent) => event.preventDefault()}
      onError={(event: React.SyntheticEvent<HTMLVideoElement>) => renew(event.currentTarget)}
      onPlaying={() => {
        renewals.current = 0;
      }}
      src={recordingStreamUrl(recordingId)}
      sx={{ width: "100%", maxHeight, bgcolor: "common.black", borderRadius: 1, display: "block" }}
    />
  );
}

/** The same player in a dialog, so the viewer stays on the page. */
export function RecordingPlayerDialog({
  recordingId,
  title,
  onClose,
}: {
  recordingId: string | null;
  title: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(recordingId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }}>
          <IconX size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {recordingId ? <RecordingVideo recordingId={recordingId} maxHeight="70vh" /> : null}
      </DialogContent>
    </Dialog>
  );
}
