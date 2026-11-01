import { act, cleanup, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider, useTranslation } from "react-i18next";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { ProjectTerminologyProvider } from "./project-terminology-provider";

afterEach(cleanup);

function Labels({ id }: { id: string }) {
  const { t } = useTranslation("common");
  return <span data-testid={id}>{t("title")}</span>;
}

describe("ProjectTerminologyProvider", () => {
  it("updates requirement copy with the language and restores project copy when switching", async () => {
    const source = createInstance();
    await source.init({
      lng: "zh-CN",
      defaultNS: "common",
      resources: {
        "zh-CN": { common: { title: "任务" } },
        "en-US": { common: { title: "Tasks" } },
      },
    });
    const contents = (kind: "project" | "requirement") => (
      <I18nextProvider i18n={source}>
        <Labels id="global" />
        <ProjectTerminologyProvider kind={kind}>
          <Labels id="scoped" />
        </ProjectTerminologyProvider>
      </I18nextProvider>
    );
    const view = render(contents("requirement"));
    expect(screen.getByTestId("scoped")).toHaveTextContent("需求");
    expect(screen.getByTestId("global")).toHaveTextContent("任务");

    await act(async () => {
      await source.changeLanguage("en-US");
    });
    expect(screen.getByTestId("scoped")).toHaveTextContent("Requirements");
    expect(screen.getByTestId("global")).toHaveTextContent("Tasks");

    view.rerender(contents("project"));
    expect(screen.getByTestId("scoped")).toHaveTextContent("Tasks");
    await act(async () => {
      await source.changeLanguage("zh-CN");
    });
    expect(screen.getByTestId("scoped")).toHaveTextContent("任务");
  });
});
