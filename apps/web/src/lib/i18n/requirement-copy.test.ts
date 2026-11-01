import { createInstance } from "i18next";
import { getI18n, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vite-plus/test";
import {
  createRequirementI18n,
  syncRequirementResources,
} from "./create-requirement-i18n";
import { requirementCopy } from "./requirement-copy";

describe("requirement interface copy", () => {
  it("changes labels and plurals while keeping resource keys and interpolation names", () => {
    expect(
      requirementCopy({
        taskId: "任务 {{task}}",
        count_one: "{{count}} Task",
        count_other: "{{count}} Tasks",
        child: "Subtasks",
      }),
    ).toEqual({
      taskId: "需求 {{task}}",
      count_one: "{{count}} Requirement",
      count_other: "{{count}} Requirements",
      child: "Subrequirements",
    });
    expect(requirementCopy("任務／子任務")).toBe("需求／子需求");
  });

  it("isolates requirement copy and preserves user data inserted into a template", async () => {
    const source = createInstance().use(initReactI18next);
    await source.init({
      lng: "zh-CN",
      fallbackLng: "en-US",
      resources: {
        "zh-CN": { tasks: { title: "任务", created: "创建任务“{{title}}”" } },
        "en-US": { tasks: { title: "Tasks" } },
      },
    });
    const scoped = createRequirementI18n(source);
    expect(getI18n()).toBe(source);
    expect(scoped.t("tasks:title")).toBe("需求");
    expect(scoped.t("tasks:created", { title: "任务原始名称" })).toBe(
      "创建需求“任务原始名称”",
    );
    expect(source.t("tasks:title")).toBe("任务");
    source.addResourceBundle("zh-CN", "common", { dialog: "新建任务" });
    syncRequirementResources(source, scoped);
    expect(scoped.t("common:dialog")).toBe("新建需求");
    expect(source.t("common:dialog")).toBe("新建任务");
  });
});
