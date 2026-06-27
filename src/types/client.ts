export interface Client {
  id: number;
  name: string;
  phone: string;
  address: string;
  gateCode: string;
  pricePerCleaning: number;
  frequency: "Weekly" | "Twice Weekly" | "Twice Monthly" | "Monthly" | "As Needed";
  helperNeeded: boolean;
  notes: string;
  active: boolean;
}