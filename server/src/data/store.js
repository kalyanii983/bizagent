import bcrypt from 'bcryptjs';

const seedUser = {
  id: 'user_1',
  name: 'Admin User',
  email: 'admin@opspilot.local',
  passwordHash: bcrypt.hashSync('Admin12345', 10),
  role: 'Admin',
  active: true,
  lastLoginAt: null,
};

export const store = {
  users: [seedUser],
  customers: [],
  emails: [],
  crmActivities: [],
  meetings: [],
  invoices: [],
  reports: [],
  tickets: [],
  workflows: [],
  agents: [],
  agentExecutions: [],
  notifications: [],
  sessions: [],
  memory: [],
};
