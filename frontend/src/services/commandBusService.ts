import axios from "axios";
import type {
  CommandExecutionResult,
  DispatchCommandRequest,
  UIActionType,
} from "../types/command";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "";

export class CommandBusService {
  private static instance: CommandBusService | null = null;

  public static getInstance(): CommandBusService {
    if (!CommandBusService.instance) {
      CommandBusService.instance = new CommandBusService();
    }
    return CommandBusService.instance;
  }

  /**
   * Dispatch a typed command to the backend unified CommandBus.
   */
  public async dispatch(
    req: DispatchCommandRequest
  ): Promise<CommandExecutionResult> {
    try {
      const response = await axios.post<CommandExecutionResult>(
        `${API_BASE_URL}/api/v1/command/dispatch`,
        req,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );
      return response.data;
    } catch (err: any) {
      console.error("[CommandBusService] Dispatch failed:", err);
      // Construct graceful fallback result
      return {
        command_id: `CMD-FALLBACK-${Date.now()}`,
        correlation_id: req.correlation_id || `CORR-${Date.now()}`,
        status: "FAILED",
        ui_actions: [],
        message:
          err.response?.data?.detail ||
          err.message ||
          "Network error while dispatching command",
        executed_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Helper to dispatch a direct UI action originating from a button, tab, or menu click.
   */
  public async dispatchAction(
    actionType: UIActionType,
    args: Record<string, any> = {},
    options: {
      caseId?: string;
      source?: "UI" | "KEYBOARD";
    } = {}
  ): Promise<CommandExecutionResult> {
    return this.dispatch({
      source: options.source || "UI",
      intent: actionType,
      case_id: options.caseId,
      requested_actions: [actionType],
      arguments: args,
    });
  }

  /**
   * Cancel an in-flight command.
   */
  public async cancel(commandId: string): Promise<boolean> {
    try {
      const resp = await axios.post(`${API_BASE_URL}/api/v1/command/cancel`, {
        command_id: commandId,
      });
      return resp.data?.cancelled === true;
    } catch (e) {
      console.warn("[CommandBusService] Cancel failed:", e);
      return false;
    }
  }
}

export const commandBus = CommandBusService.getInstance();
