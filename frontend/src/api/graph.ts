import apiClient from "./client";
import type { GraphResponse } from "../types/graph";


export async function fetchGraph(): Promise<GraphResponse> {
  const response = await apiClient.get<GraphResponse>("/graph/");

  return response.data;
}