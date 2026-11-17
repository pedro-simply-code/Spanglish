import { StudentsCreditsOverview } from "@/features/enrollment";
import { listPairs } from "@/server/classes/pairs";
import { listStudentsWithBalances } from "@/server/credits/credits";
import { listRecentOrders } from "@/server/credits/orders";
import { getActor } from "@/server/auth/session";

/** Shared by /manager/students and /admin/organization/students. */
export async function StudentsCreditsContent({ root }: { root: { title: string; to: string } }) {
  const actor = await getActor();
  const [students, pairs, orders] = await Promise.all([
    listStudentsWithBalances(),
    listPairs(),
    listRecentOrders(15),
  ]);
  return (
    <StudentsCreditsOverview
      students={students}
      pairs={pairs.map(({ id, createdAt, students: members }) => ({ id, createdAt, students: members }))}
      orders={orders}
      breadcrumbRoot={root}
      mailFromName={actor.name}
    />
  );
}
