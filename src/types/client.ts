export interface Client {
  id: number;
  firestoreId?: string;
  name: string;
  phone: string;
  address: string;
  gateCode: string;
  pricePerCleaning: number;
  startDate: string;
  estimatedHours: number;
  frequency: "Weekly" | "Twice Weekly" | "Twice Monthly" | "Monthly" | "As Needed";
  helperNeeded: boolean;
  assignedHelpers: string[];
  notes: string;
  active: boolean;
}

export interface ClientFinancial {
  clientId: string;
  pricePerCleaning: number;
  startDate: string;
}