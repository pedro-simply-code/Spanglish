"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires when the user leaves the classroom route (sidebar, link, back button).
 * LiveKit disconnect still happens in the stage unmount — this hook is for UX side effects.
 */
export function useClassroomPageLifecycle(options: {
  classId: string;
  active: boolean;
  onLeaveRoute?: () => void;
}) {
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  const leftRef = useRef(false);

  useEffect(() => {
    const roomPath = `/classes/${options.classId}/room`;
    const stillOnRoom = pathname === roomPath || pathname.startsWith(`${roomPath}?`);

    if (lastPath.current !== pathname) {
      if (
        options.active &&
        !stillOnRoom &&
        !leftRef.current &&
        lastPath.current.includes(`/classes/${options.classId}/room`)
      ) {
        leftRef.current = true;
        options.onLeaveRoute?.();
      }
      lastPath.current = pathname;
    }
  }, [options, pathname]);

}