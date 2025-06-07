export interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
  };
}
