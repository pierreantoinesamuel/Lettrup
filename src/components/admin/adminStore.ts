import {
  AdminAIAgent,
  AdminAILog,
  AdminWorkflow,
  AdminAuditLog,
  Article,
  INITIAL_AI_AGENTS,
  INITIAL_AI_LOGS,
  INITIAL_WORKFLOWS,
  INITIAL_AUDIT_LOGS,
  INITIAL_ARTICLES,
} from './adminData';

// Candidates/Employers/Jobs/Applications used to live here as localStorage
// mock CRUD. They're now real Supabase-backed reads/writes in
// src/lib/adminApi.ts. This store still backs AI Agents/Workflows/Articles
// (out of scope for the core-recruiting-loop migration) plus the shared
// admin action audit trail used by those still-mock views.

const STORAGE_KEYS = {
  aiAgents: 'cf_admin_ai_agents_v1',
  aiLogs: 'cf_admin_ai_logs_v1',
  workflows: 'cf_admin_workflows_v1',
  auditLogs: 'cf_admin_audit_logs_v1',
  articles: 'cf_admin_articles_v1',
};

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export const AdminStore = {
  getAIAgents: (): AdminAIAgent[] => getStored(STORAGE_KEYS.aiAgents, INITIAL_AI_AGENTS),
  saveAIAgents: (data: AdminAIAgent[]) => setStored(STORAGE_KEYS.aiAgents, data),

  getAILogs: (): AdminAILog[] => getStored(STORAGE_KEYS.aiLogs, INITIAL_AI_LOGS),
  saveAILogs: (data: AdminAILog[]) => setStored(STORAGE_KEYS.aiLogs, data),

  getWorkflows: (): AdminWorkflow[] => getStored(STORAGE_KEYS.workflows, INITIAL_WORKFLOWS),
  saveWorkflows: (data: AdminWorkflow[]) => setStored(STORAGE_KEYS.workflows, data),

  getAuditLogs: (): AdminAuditLog[] => getStored(STORAGE_KEYS.auditLogs, INITIAL_AUDIT_LOGS),
  saveAuditLogs: (data: AdminAuditLog[]) => setStored(STORAGE_KEYS.auditLogs, data),

  getArticles: (): Article[] => getStored(STORAGE_KEYS.articles, INITIAL_ARTICLES),
  saveArticles: (data: Article[]) => setStored(STORAGE_KEYS.articles, data),

  logAction: (actionType: string, targetType: AdminAuditLog['targetType'], targetId: string, notes: string) => {
    const current = getStored<AdminAuditLog[]>(STORAGE_KEYS.auditLogs, INITIAL_AUDIT_LOGS);
    const newLog: AdminAuditLog = {
      id: `audit-${Date.now()}`,
      adminName: 'Super Admin',
      adminRole: 'Super Admin',
      actionType,
      targetType,
      targetId,
      notes,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setStored(STORAGE_KEYS.auditLogs, [newLog, ...current]);
  },
};
