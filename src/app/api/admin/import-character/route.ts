import { NextResponse } from "next/server";
import {
  importCharacterBatchAction,
  approveCharacterImportAction,
  rejectCharacterImportAction,
} from "@/features/admin/actions/characterImportActions";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const action = formData.get("action")?.toString() ?? "import";

    switch (action) {
      case "import": {
        const result = await importCharacterBatchAction(formData);
        return NextResponse.json(result);
      }
      case "approve": {
        const result = await approveCharacterImportAction(formData);
        return NextResponse.json({ success: true, result });
      }
      case "reject": {
        const result = await rejectCharacterImportAction(formData);
        return NextResponse.json({ success: true, result });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[IMPORT_CHARACTER_API]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
