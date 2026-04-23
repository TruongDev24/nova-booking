import { Role } from '@prisma/client';

export interface UserPayload {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
}
