import { CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/shared/global/button';
import { Card } from '@/components/shared/global/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/shared/global/table';

interface DiffResultViewProps {
    parsedDiff: {
        header: string;
        summary: string;
        lines: Array<{
            type: string;
            leftLineNum?: number;
            rightLineNum?: number;
            content: string;
            selected?: boolean;
        }>;
    };
    file1Name: string | null;
    file2Name: string | null;
    onCopy: () => void;
    copied: boolean;
    onLineClick?: (index: number) => void;
}

export const DiffResultView: React.FC<DiffResultViewProps> = ({
    parsedDiff,
    file1Name,
    file2Name,
    onCopy,
    copied,
    onLineClick,
}) => {
    return (
        <Card className="animate-fadeIn">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        {parsedDiff.header}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={onCopy} className={copied ? 'text-green-600' : ''}>
                        <Copy className="h-4 w-4 mr-1" />
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                    </Button>
                </div>

                <div className="flex flex-col">
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-2 gap-1 mb-4">
                            <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                {file1Name || 'Original File'}
                            </div>
                            <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                {file2Name || 'Modified File'}
                            </div>
                        </div>

                        <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
                            <Table>
                                <TableBody className="divide-y divide-gray-200">
                                    {parsedDiff.lines.map((line, idx) => (
                                        <TableRow
                                            key={idx}
                                            className={`
                                        ${line.type === 'added' ? 'bg-green-50' : ''}
                                        ${line.type === 'removed' ? 'bg-red-50' : ''}
                                        ${onLineClick && line.type !== 'unchanged' ? 'cursor-pointer hover:bg-gray-100' : ''}
                                        ${line.selected ? 'ring-2 ring-blue-500' : ''}
                                      `}
                                            onClick={() => onLineClick && onLineClick(idx)}
                                        >
                                            <TableCell className="p-1 text-xs text-gray-500 text-right select-none w-10 border-r border-gray-200">
                                                {line.leftLineNum || ''}
                                            </TableCell>
                                            <TableCell
                                                className={`p-1 font-mono text-sm whitespace-pre ${
                                                    line.type === 'removed' ? 'bg-red-100' : ''
                                                }`}
                                            >
                                                {line.type !== 'added' ? line.content : ''}
                                            </TableCell>
                                            <TableCell className="p-1 text-xs text-gray-500 text-right select-none w-10 border-l border-r border-gray-200">
                                                {line.rightLineNum || ''}
                                            </TableCell>
                                            <TableCell
                                                className={`p-1 font-mono text-sm whitespace-pre ${
                                                    line.type === 'added' ? 'bg-green-100' : ''
                                                }`}
                                            >
                                                {line.type !== 'removed' ? line.content : ''}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                        <h4 className="font-medium text-gray-800">Summary</h4>
                        <p className="text-sm text-gray-700">
                            {parsedDiff.summary.split('\n').map((line, i) =>
                                line.startsWith('##') ? null : (
                                    <span key={i}>
                                        {line}
                                        <br />
                                    </span>
                                ),
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    );
};
