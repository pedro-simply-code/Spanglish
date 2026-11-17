import { ApplicationsReview } from "@/features/teaching";
import { hasPermission } from "@/lib/auth-roles";
import { getActor } from "@/server/auth/session";
import { listApplications } from "@/server/teaching/applications";
import { listPendingTeacherInvitations } from "@/server/teaching/teacher-invites";

/** Shared by /manager/applications and /admin/organization/applications. */
export async function ApplicationsContent({ root }: { root: { title: string; to: string } }) {
  const actor = await getActor();
  const [applications, invitations] = await Promise.all([listApplications(), listPendingTeacherInvitations()]);
  return (
    <ApplicationsReview
      breadcrumbRoot={root}
      mailFromName={actor.name}
      canPromoteTeachers={hasPermission(actor.roles, "roles:manage")}
      invitations={invitations}
      applications={applications.map((item) => ({
        id: item.id,
        status: item.status,
        track: item.track,
        fluency: item.fluency,
        fluencyNote: item.fluencyNote,
        yearsTeaching: item.yearsTeaching,
        taughtOnlineBefore: item.taughtOnlineBefore,
        credentials: item.credentials,
        headline: item.headline,
        bio: item.bio,
        country: item.country,
        teaches: item.teaches,
        experience: item.experience,
        videoUrl: item.videoUrl,
        reviewNote: item.reviewNote,
        createdAt: item.createdAt,
        applicant: { name: item.applicant.name, email: item.applicant.email },
      }))}
    />
  );
}