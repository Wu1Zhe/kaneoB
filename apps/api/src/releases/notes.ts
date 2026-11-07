export const releaseNotes = [
  {
    sequence: 3,
    version: "2026.11.07.1",
    date: "2026-11-07",
    title: {
      zh: "协作与工作入口更新",
      en: "Collaboration and workspace shortcuts",
    },
    items: {
      zh: [
        "任务支持主负责人和多名协作人，成员可分配任务",
        "列表和层级支持一键展开、收起及调整列宽",
        "可选择父任务，新建子任务默认带出父任务负责人",
        "创建需求时可上传 Excel 附件，文件随数据库备份",
        "首页新增公共入口和个人入口，可自定义网站快捷方式",
        "新增更新记录和按账号保存的首次更新提示",
      ],
      en: [
        "Primary assignees and multiple collaborators; members can assign tasks",
        "Expand or collapse task trees and resize columns",
        "Choose parent tasks and inherit assignees when creating subtasks",
        "Attach Excel files to requirements, included in database backups",
        "Shared and personal website shortcuts on the home page",
        "Release history with account-based unread update notices",
      ],
    },
  },
  {
    sequence: 2,
    version: "2026.11.06.1",
    date: "2026-11-06",
    title: { zh: "登录方式切换", en: "Switch sign-in methods" },
    items: {
      zh: ["配置邮件服务后，可在邮箱验证码与邮箱密码登录之间切换"],
      en: [
        "Switch between email code and password sign-in when email delivery is configured",
      ],
    },
  },
  {
    sequence: 1,
    version: "2026.11.02.1",
    date: "2026-11-02",
    title: { zh: "部署与备份工具", en: "Deployment and backup tools" },
    items: {
      zh: ["新增 Linux 加密备份、异地同步、恢复校验及升级前强制备份"],
      en: [
        "Linux encrypted backups, offsite sync, restore verification and mandatory pre-upgrade backups",
      ],
    },
  },
] as const;
