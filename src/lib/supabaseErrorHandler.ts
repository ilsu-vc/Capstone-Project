import { toast } from 'sonner';

export enum OperationType {
  GET = 'GET',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  WRITE = 'WRITE'
}

export function handleSupabaseError(error: unknown, operation: OperationType, context: string) {
  console.error(`Supabase Error [${operation}] in ${context}:`, error);
  let message = 'An unexpected error occurred.';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    message = String((error as { message: unknown }).message);
  }

  toast.error(`Database Error (${operation})`, {
    description: message
  });
}
