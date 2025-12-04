export interface User {
  email: string,
  // firstname: string;
  username: string;
  displayname?: string;
  lastname?: string;
  token?: string;
  id?: string;
  userUID: string;
  roleAdmin?: boolean;
}
