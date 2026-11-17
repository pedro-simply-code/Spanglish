export function classRecordingDownloadUrl(recordingId: string) {
  return `/api/class-recordings/download?id=${encodeURIComponent(recordingId)}`;
}
