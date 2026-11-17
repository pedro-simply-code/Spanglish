import type { Metadata } from "next";
import Box from "@mui/material/Box";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { MaterialComposer } from "@/features/materials";

export const metadata: Metadata = {
  title: "New material",
  description: "Create a document, recording, or practice form",
};

export default function NewMaterialPage() {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="New material"
        subtitle="Add a resource to the library, then choose who receives it."
        items={[
          { title: "Teacher", to: "/teacher" },
          { title: "Materials", to: "/teacher/materials" },
          { title: "New" },
        ]}
      />
      <MaterialComposer />
    </Box>
  );
}
