export interface Payment {
  firestoreId?: string;

  cleaningId: string;
  clientId: string;
  clientName: string;
  cleaningDate: string;

  amountCharged: number;
  actualHours: number;
  helperPayout: number;

  paid: boolean;
  paidDate: string;

  notes: string;
}