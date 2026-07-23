export interface Cleaning {
  firestoreId?: string;
  clientId: string;
  date: string;
  startTime: string;
  estimatedHours: number;
  assignedHelpers: string[];
  status: "Scheduled" | "Completed" | "Cancelled";
  notes: string;
}