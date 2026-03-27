export type LeadStatus =
  | "NEW"
  | "VERIFIED"
  | "CONTACTED"
  | "INTERESTED"
  | "CLOSED"
  | "NO_INTEREST";

export type Lead = {
  id: string;
  companyName: string;
  phoneNumber: string;
  website: string | null;
  googleMapsUrl: string | null;
  contactPerson: string | null;
  tags: string | null;
  location: string | null;
  notes: string;
  status: LeadStatus;
  createdAt: string;
};

