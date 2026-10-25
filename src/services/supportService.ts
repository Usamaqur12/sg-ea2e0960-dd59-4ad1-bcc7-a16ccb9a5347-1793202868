import { supabase } from "@/integrations/supabase/client";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  is_staff: boolean;
  message: string;
  created_at: string;
  attachments?: string[];
}

export type TicketCategory = "account" | "betting" | "payments" | "technical" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_response" | "resolved" | "closed";

export async function createSupportTicket(data: {
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  message: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required" };

  // Create mock ticket (demo mode only - no database table exists)
  const mockTicket: SupportTicket = {
    id: `ticket-${Date.now()}`,
    user_id: user.id,
    subject: data.subject,
    category: data.category,
    priority: data.priority,
    status: "open",
    message: data.message,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return { success: true, ticket: mockTicket };
}

export async function getUserTickets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, tickets: [], error: "Authentication required" };

  // Return mock tickets (demo mode only - no database table exists)
  const mockTickets: SupportTicket[] = [
    {
      id: "ticket-1",
      user_id: user.id,
      subject: "Cannot withdraw funds",
      category: "payments",
      priority: "high",
      status: "in_progress",
      message: "I'm having trouble withdrawing my winnings to my bank account.",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      assigned_to: "Support Agent",
    },
    {
      id: "ticket-2",
      user_id: user.id,
      subject: "Question about bonus terms",
      category: "account",
      priority: "medium",
      status: "resolved",
      message: "What are the wagering requirements for the welcome bonus?",
      created_at: new Date(Date.now() - 172800000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      assigned_to: "Support Agent",
    },
  ];
  return { success: true, tickets: mockTickets };
}

export async function getTicketMessages(ticketId: string) {
  // Return mock messages (demo mode only - no database table exists)
  const mockMessages: TicketMessage[] = [
    {
      id: "msg-1",
      ticket_id: ticketId,
      user_id: "user-id",
      is_staff: false,
      message: "I'm having trouble withdrawing my winnings to my bank account.",
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "msg-2",
      ticket_id: ticketId,
      user_id: "support-id",
      is_staff: true,
      message: "Thank you for contacting us. We're looking into your withdrawal request. Can you please provide your transaction ID?",
      created_at: new Date(Date.now() - 82800000).toISOString(),
    },
    {
      id: "msg-3",
      ticket_id: ticketId,
      user_id: "user-id",
      is_staff: false,
      message: "The transaction ID is TXN-2026-10-25-12345",
      created_at: new Date(Date.now() - 79200000).toISOString(),
    },
  ];
  return { success: true, messages: mockMessages };
}

export async function addTicketMessage(ticketId: string, message: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required" };

  // Create mock message (demo mode only - no database table exists)
  const mockMessage: TicketMessage = {
    id: `msg-${Date.now()}`,
    ticket_id: ticketId,
    user_id: user.id,
    is_staff: false,
    message,
    created_at: new Date().toISOString(),
  };
  return { success: true, message: mockMessage };
}

export async function closeTicket(ticketId: string) {
  // Simulate close (demo mode only - no database table exists)
  return { success: true };
}