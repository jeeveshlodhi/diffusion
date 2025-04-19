import { XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/shared/global/alert';

interface ErrorAlertProps {
  error: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error }) => {
  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
};