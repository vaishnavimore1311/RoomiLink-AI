export interface AgreementClause {
  id: number;
  category: string;
  title: string;
  content: string;
  rationale: string;
}

export interface AgreementData {
  id: number;
  household_id: number;
  household_name?: string;
  title: string;
  summary?: string;
  version: string;
  generated_via?: string;
  clauses: AgreementClause[];
  updated_at?: string | null;
}
