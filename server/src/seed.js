import bcrypt from 'bcryptjs';
import { store } from './data/store.js';

function resetCollection(name) {
  store[name].splice(0, store[name].length);
}

function seed() {
  resetCollection('customers');
  resetCollection('emails');
  resetCollection('crmActivities');
  resetCollection('meetings');
  resetCollection('invoices');
  resetCollection('reports');
  resetCollection('tickets');
  resetCollection('workflows');
  resetCollection('agents');
  resetCollection('agentExecutions');
  resetCollection('notifications');
  resetCollection('memory');

  store.users[0] = {
    id: 'user_1',
    name: 'Demo Admin',
    email: 'admin@opspilot.local',
    passwordHash: bcrypt.hashSync('Admin12345', 10),
    role: 'Admin',
    active: true,
    lastLoginAt: null,
  };

  store.customers.push({
    id: 'customer_1',
    name: 'Acme Manufacturing',
    email: 'ops@acme.example',
    phone: '+1-555-0101',
    company: 'Acme Manufacturing',
    tags: ['priority', 'enterprise'],
    notes: 'Seed customer for NxtBiz demo.',
    preferences: { channel: 'email' },
    healthScore: 81,
  });

  store.workflows.push({
    id: 'workflow_1',
    name: 'Negative Email Escalation',
    trigger: 'email',
    condition: 'negative',
    action: 'notify + ticket',
    steps: ['trigger', 'condition', 'action'],
    enabled: true,
    logs: [],
  });

  store.agents.push(
    { agentId: 'intent-agent', name: 'Intent Agent', status: 'ready', lastExecution: null, logs: [], capabilities: ['classify'] },
    { agentId: 'task-planner-agent', name: 'Task Planner Agent', status: 'ready', lastExecution: null, logs: [], capabilities: ['plan'] }
  );

  store.memory.push(
    {
      id: 'mem_1',
      scope: 'customer',
      customerId: 'customer_1',
      agentId: 'crm-agent',
      key: 'preference_channel',
      value: 'Customer prefers updates via email rather than phone calls.',
      tags: ['preference', 'communication'],
      source: 'Call log analysis',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'mem_2',
      scope: 'agent',
      customerId: 'customer_1',
      agentId: 'intent-agent',
      key: 'recent_inquiry',
      value: 'Inquired about invoice payment details. Urgency was high.',
      tags: ['intent', 'invoice'],
      source: 'Email process flow',
      createdAt: new Date().toISOString(),
    }
  );
}

seed();

console.log('NxtBiz demo data loaded');
