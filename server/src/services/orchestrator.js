import { store } from '../data/store.js';
import { createId } from '../utils/id.js';
import { classifyEmail } from '../utils/text.js';
import { emitSystemEvent } from './event-bus.js';
import { notificationRepository } from '../repositories/notification.repo.js';
import { ticketRepository } from '../repositories/ticket.repo.js';

function planAgents(intent) {
  const plan = ['intent-agent', 'task-planner-agent', 'crm-agent', 'chief-of-staff-agent'];
  if (intent === 'schedule_meeting') plan.splice(2, 0, 'meeting-agent');
  if (intent === 'invoice_request') plan.splice(2, 0, 'invoice-agent');
  if (intent === 'support_request') plan.splice(2, 0, 'customer-support-agent');
  if (intent === 'sales_opportunity') plan.splice(2, 0, 'email-agent');
  return [...new Set(plan)];
}

function buildAgentOutput(agentId, input, analysis) {
  return {
    agentId,
    summary: `Executed ${agentId}`,
    analysis,
    input,
  };
}

export function executeOrchestration(payload = {}) {
  const context = {
    id: createId('ctx', store.agentExecutions),
    createdAt: new Date().toISOString(),
    payload,
  };

  const emailText = `${payload.subject || ''} ${payload.body || ''}`;
  const analysis = classifyEmail(emailText);
  const plannedAgents = planAgents(analysis.intent);
  const executions = [];

  for (const agentId of plannedAgents) {
    const execution = {
      id: createId('execution', store.agentExecutions),
      agentId,
      eventId: payload.emailId || payload.eventId || null,
      status: 'running',
      input: { context, payload, analysis },
      output: null,
      logs: [`${agentId} started`],
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
    };
    store.agentExecutions.push(execution);

    execution.status = 'completed';
    execution.output = buildAgentOutput(agentId, payload, analysis);
    execution.logs.push(`${agentId} completed`);
    execution.finishedAt = new Date().toISOString();
    executions.push(execution);
  }

  if (payload.emailId) {
    const email = store.emails.find((item) => item.id === payload.emailId);
    if (email) email.processed = true;
  }

  const notification = {
    id: createId('notification', store.notifications),
    type: 'agent_completed',
    title: 'Agent orchestration completed',
    message: `Processed ${plannedAgents.length} agents`,
    read: false,
    metadata: { contextId: context.id, eventId: payload.emailId || payload.eventId || null },
  };
  store.notifications.push(notification);
  void notificationRepository.create(notification);
  emitSystemEvent('agent_completed', { context, executions, notification });

  return { context, executions, notification, analysis };
}

export function executeWorkflow(workflow, payload) {
  const condition = workflow.condition ? JSON.stringify(payload).includes(workflow.condition) : true;
  const log = {
    id: createId('workflowlog', workflow.logs),
    status: condition ? 'completed' : 'skipped',
    payload,
    createdAt: new Date().toISOString(),
  };

  workflow.logs.push(log);

  if (!condition) {
    emitSystemEvent('workflow_executed', { workflow, log });
    return { workflow, log };
  }

  const actionText = `${workflow.action || ''}`.toLowerCase();
  if (actionText.includes('ticket') && payload.customerId) {
    const ticketPayload = {
      customerId: payload.customerId,
      priority: payload.priority || 'medium',
      issue: payload.issue || 'Workflow-generated ticket',
      status: 'open',
      assignedTo: null,
      resolution: '',
    };
    store.tickets.push({ id: createId('ticket', store.tickets), ...ticketPayload });
    void ticketRepository.create(ticketPayload);
  }

  if (actionText.includes('notify')) {
    const notification = {
      id: createId('notification', store.notifications),
      type: 'workflow_executed',
      title: `Workflow ${workflow.name} executed`,
      message: `Action ${workflow.action || 'completed'}`,
      read: false,
      metadata: { workflowId: workflow.id },
    };
    store.notifications.push(notification);
    void notificationRepository.create(notification);
  }

  emitSystemEvent('workflow_executed', { workflow, log });
  return { workflow, log };
}
