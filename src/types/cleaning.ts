export interface Cleaning {
  firestoreId?: string;

  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  clientGateCode: string;
  clientNotes: string;

  date: string;
  startTime: string;
  estimatedHours: number;
  assignedHelpers: string[];
  status: "Scheduled" | "Completed" | "Cancelled";
  notes: string;
}