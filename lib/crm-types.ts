export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "CLOSED"
  | "NO_INTEREST";

export type Lead = {
  id: string;
  companyName: string;
  phoneNumber: string;
  website: string | null;
  contactPerson: string | null;
  notes: string;
  status: LeadStatus;
  createdAt: string;
};

