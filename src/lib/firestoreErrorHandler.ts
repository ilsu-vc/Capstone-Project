import { auth } from './firebase';
import { toast } from 'sonner';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // System diagnostic requirement: Log structured JSON
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  const jsonInfo = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonInfo);

  // User-friendly feedback
  if (errorMessage.includes('permission') || errorMessage.includes('insufficient permissions')) {
    toast.error('Access Denied', {
      description: "You don't have the required permissions to perform this action. Your role might be restricted."
    });
  } else if (errorMessage.includes('offline') || errorMessage.includes('network')) {
    toast.error('Network Error', {
      description: 'Please check your internet connection and try again.'
    });
  } else if (errorMessage.includes('quota')) {
    toast.error('Limit Exceeded', {
      description: 'System request limits reached. Please try again later.'
    });
  } else {
    toast.error('Operation Failed', {
      description: 'An unexpected error occurred. Please contact support if this persists.'
    });
  }

  // Rethrow as JSON string for system diagnostics
  throw new Error(jsonInfo);
}
