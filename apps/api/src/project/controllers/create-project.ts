import db from "../../database";
import { insertProject } from "./insert-project";

async function createProject(
  workspaceId: string,
  name: string,
  icon: string,
  slug: string,
  userId: string,
  kind: "project" | "requirement" = "project",
) {
  return db.transaction((tx) =>
    insertProject(tx, { workspaceId, name, icon, slug, userId, kind }),
  );
}

export default createProject;
