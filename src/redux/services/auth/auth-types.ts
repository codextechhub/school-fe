import type { SchoolInfo, TenantInfo, User } from "@/redux/features/auth/auth-types";

export interface ResponseMessage {
    status: boolean;
    message: string;
}

export interface LoginResponse extends ResponseMessage {
  data: {
    access: string
    session_id: number
    user: User
    permissions: string[]
    school: SchoolInfo | null
    /**
     * The tenant the session belongs to. Present on every login response; the
     * type omitted it, so the CX-staff guard had nothing to read but the
     * `user_type` column that has since been removed.
     */
    tenant: TenantInfo | null
  }
}
