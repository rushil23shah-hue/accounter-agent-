import { SwarmMessage, SwarmAgentRole, SwarmMessageSchema } from "../contracts/swarm.js";

type MessageHandler = (msg: SwarmMessage) => Promise<void> | void;

export class AgentEventBus {
  private static subscribers: Map<string, MessageHandler[]> = new Map();
  private static messageLog: SwarmMessage[] = [];

  /**
   * Subscribe an agent or observer to messages directed to a specific role or BROADCAST.
   */
  public static subscribe(recipient: SwarmAgentRole | "BROADCAST" | "ALL", handler: MessageHandler) {
    if (!this.subscribers.has(recipient)) {
      this.subscribers.set(recipient, []);
    }
    this.subscribers.get(recipient)!.push(handler);
  }

  /**
   * Dispatches a typed message from one agent to another and records it in the immutable bus log.
   */
  public static async dispatch(params: {
    sender: SwarmAgentRole;
    recipient: SwarmAgentRole | "BROADCAST";
    intent: string;
    payload: Record<string, any>;
  }): Promise<SwarmMessage> {
    const messageId = `MSG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const msg = SwarmMessageSchema.parse({
      messageId,
      sender: params.sender,
      recipient: params.recipient,
      intent: params.intent,
      payload: params.payload,
      timestamp,
    });

    this.messageLog.push(msg);

    // Deliver to direct recipient
    const directHandlers = this.subscribers.get(params.recipient) || [];
    // Deliver to global observers
    const allHandlers = this.subscribers.get("ALL") || [];
    const broadcastHandlers = params.recipient === "BROADCAST" ? (this.subscribers.get("BROADCAST") || []) : [];

    const handlers = Array.from(new Set([...directHandlers, ...allHandlers, ...broadcastHandlers]));

    for (const h of handlers) {
      try {
        await h(msg);
      } catch (err) {
        console.error(`[AgentEventBus] Handler error for ${params.intent}:`, err);
      }
    }

    return msg;
  }

  public static getMessageLog(): SwarmMessage[] {
    return [...this.messageLog];
  }

  public static clearLog() {
    this.messageLog = [];
  }
}
