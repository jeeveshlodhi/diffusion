import { File } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/shared/global/card';
import { Input } from '@/components/shared/global/input';
import { Label } from '@/components/shared/global/label';

interface FileUploadCardProps {
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
}

export const FileUploadCard: React.FC<FileUploadCardProps> = ({ file, onChange, label }) => {
  return (
    <Card>
      <CardHeader>
        <Label className="font-medium">{label}</Label>
      </CardHeader>
      <CardContent>
        <Label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <File className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
          </div>
          <Input type="file" className="hidden" onChange={onChange} />
        </Label>
      </CardContent>
    </Card>
  );
};