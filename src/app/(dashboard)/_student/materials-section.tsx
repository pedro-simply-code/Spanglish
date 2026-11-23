import { StudentMaterialsOverview } from "@/features/materials";
import { getActor } from "@/server/auth/session";
import { listMaterialsForStudent } from "@/server/materials/library";
import { listStudentWords } from "@/server/learning/vocabulary";

export async function MaterialsSection() {
  const actor = await getActor();
  const [materials, words] = await Promise.all([
    listMaterialsForStudent(actor.userId),
    listStudentWords(actor.userId),
  ]);
  return <StudentMaterialsOverview materials={materials} vocabularyCount={words.length} />;
}
