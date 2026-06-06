export interface User {
  id: number;
  username: string;
  realName: string;
  role: 'admin' | 'project_manager' | 'finance';
  email?: string;
  phone?: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  category: string;
  total_budget: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_budget: number;
  project_manager_id?: number;
  manager_name?: string;
  status: 'draft' | 'active' | 'completed' | 'suspended';
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface Donor {
  id: number;
  name: string;
  type: 'individual' | 'enterprise';
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
}

export interface Donation {
  id: number;
  donor_id: number;
  donor_name?: string;
  donor_type?: string;
  amount: number;
  donation_date: string;
  donation_type: 'designated' | 'undesignated';
  project_id?: number;
  project_name?: string;
  payment_method?: string;
  receipt_no?: string;
  status: 'pending' | 'received' | 'refunded';
  received_date?: string;
  remark?: string;
  created_at: string;
}

export interface FundPool {
  id: number;
  pool_type: 'general' | 'project';
  project_id?: number;
  project_name?: string;
  name: string;
  balance: number;
  total_in: number;
  total_out: number;
}

export interface AllocationApplication {
  id: number;
  project_id: number;
  project_name?: string;
  amount: number;
  source_pool: 'general' | 'designated';
  purpose?: string;
  applicant_id: number;
  applicant_name?: string;
  status: 'pending_finance' | 'pending_admin' | 'approved' | 'rejected';
  finance_reviewed_by?: number;
  finance_reviewer_name?: string;
  finance_review_comment?: string;
  finance_reviewed_at?: string;
  admin_approved_by?: number;
  admin_approver_name?: string;
  admin_approval_comment?: string;
  admin_approved_at?: string;
  created_at: string;
}

export interface FundAllocation {
  id: number;
  application_id?: number;
  project_id: number;
  project_name?: string;
  amount: number;
  source_pool: 'general' | 'designated';
  remark?: string;
  created_by?: number;
  creator_name?: string;
  created_at: string;
}

export interface Beneficiary {
  id: number;
  name: string;
  id_card?: string;
  phone?: string;
  address?: string;
  category?: string;
  description?: string;
  created_at: string;
}

export interface Expenditure {
  id: number;
  project_id: number;
  project_name?: string;
  beneficiary_id?: number;
  beneficiary_name?: string;
  amount: number;
  purpose: string;
  voucher_no?: string;
  expenditure_date: string;
  created_by?: number;
  creator_name?: string;
  created_at: string;
}

export interface FundFlow {
  id: number;
  flow_type: 'donation_in' | 'allocation_in' | 'allocation_out' | 'expenditure';
  amount: number;
  direction: 'in' | 'out';
  pool_id: number;
  pool_name?: string;
  pool_type?: string;
  project_name?: string;
  related_type?: string;
  related_id?: number;
  balance_after: number;
  remark?: string;
  created_at: string;
}

export interface Statistics {
  donationStats: {
    total_donations: number;
    total_received: number;
    total_pending: number;
  };
  projectStats: {
    total_projects: number;
    total_allocated: number;
    total_spent: number;
  };
  poolStats: {
    total_balance: number;
  };
  recentFlows: FundFlow[];
}
