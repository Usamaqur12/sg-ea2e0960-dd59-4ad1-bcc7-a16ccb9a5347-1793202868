import { supabase } from "@/integrations/supabase/client";

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
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
  description: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required" };

  // Demo mode: create mock ticket
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const mockTicket: SupportTicket = {
      id: `ticket-${Date.now()}`,
      user_id: user.id,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: "open",
      description: data.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return { success: true, ticket: mockTicket };
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      status: "open",
      description: data.description,
    })
    .select()
    .single();

  return { success: !error, ticket, error: error?.message };
}

export async function getUserTickets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, tickets: [], error: "Authentication required" };

  // Demo mode: return mock tickets
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const mockTickets: SupportTicket[] = [
      {
        id: "ticket-1",
        user_id: user.id,
        subject: "Cannot withdraw funds",
        category: "payments",
        priority: "high",
        status: "in_progress",
        description: "I'm having trouble withdrawing my winnings to my bank account.",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "ticket-2",
        user_id: user.id,
        subject: "Question about bonus terms",
        category: "account",
        priority: "medium",
        status: "resolved",
        description: "What are the wagering requirements for the welcome bonus?",
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        resolved_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    return { success: true, tickets: mockTickets };
  }

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return { success: !error, tickets: tickets || [], error: error?.message };
}

export async function getTicketMessages(ticketId: string) {
  // Demo mode: return mock messages
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
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

  const { data: messages, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return { success: !error, messages: messages || [], error: error?.message };
}

export async function addTicketMessage(ticketId: string, message: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Authentication required" };

  // Demo mode: create mock message
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
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

  const { data: newMessage, error } = await supabase
    .from("support_messages")
    .insert({
      ticket_id: ticketId,
      user_id: user.id,
      is_staff: false,
      message,
    })
    .select()
    .single();

  // Update ticket's updated_at timestamp
  if (!error) {
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString(), status: "waiting_response" })
      .eq("id", ticketId);
  }

  return { success: !error, message: newMessage, error: error?.message };
}

export async function closeTicket(ticketId: string) {
  // Demo mode: simulate close
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return { success: true };
  }

  const { error } = await supabase
    .from("support_tickets")
    .update({
      status: "closed",
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  return { success: !error, error: error?.message };
}