import React from 'react';
import { DiffFile, DiffLine, DiffBlock, LineType } from '../types';
import * as renderUtils from '../render-utils';
import * as Rematch from '../rematch';
import Line from './line';
import BlockHeader from './block-header';
import EmptyDiff from './empty-diff';

const applyLineGroupping = (block: DiffBlock): [DiffLine[], DiffLine[], DiffLine[]][] => {
    const groups: [DiffLine[], DiffLine[], DiffLine[]][] = [];
    let context: DiffLine[] = [];
    let oldLines: DiffLine[] = [];
    let newLines: DiffLine[] = [];

    for (const line of block.lines) {
        if (line.type === LineType.CONTEXT) {
            if (oldLines.length || newLines.length) {
                groups.push([context, oldLines, newLines]);
                oldLines = [];
                newLines = [];
                context = [];
            }
            context.push(line);
        } else if (line.type === LineType.DELETE) {
            if (context.length) {
                groups.push([context, oldLines, newLines]);
                context = [];
            }
            oldLines.push(line);
        } else if (line.type === LineType.INSERT) {
            if (context.length) {
                groups.push([context, oldLines, newLines]);
                context = [];
            }
            newLines.push(line);
        }
    }

    if (context.length || oldLines.length || newLines.length) {
        groups.push([context, oldLines, newLines]);
    }

    return groups;
};

const applyRematchMatching = (
    oldLines: DiffLine[],
    newLines: DiffLine[],
    matcher: Rematch.MatcherFn<DiffLine>,
    config: any,
): [DiffLine[], DiffLine[]][] => {
    // Assume 1-to-1 pairing for simplicity
    return [[oldLines, newLines]];
};

const renderChangedLines = (file: DiffFile, config: any, oldLines: DiffLine[], newLines: DiffLine[]): JSX.Element[] => {
    return [
        ...oldLines.map((line, i) => (
            <Line
                key={`old-${line.oldNumber}-${i}`}
                file={file}
                lineType={renderUtils.CSSLineClass.DELETES}
                prefix="-"
                content={renderUtils.deconstructLine(line.content, file.isCombined).content}
                oldNumber={line.oldNumber}
                newNumber={undefined}
            />
        )),
        ...newLines.map((line, i) => (
            <Line
                key={`new-${line.newNumber}-${i}`}
                file={file}
                lineType={renderUtils.CSSLineClass.INSERTS}
                prefix="+"
                content={renderUtils.deconstructLine(line.content, file.isCombined).content}
                oldNumber={undefined}
                newNumber={line.newNumber}
            />
        )),
    ];
};

const FileDiff: React.FC<{ file: DiffFile; config: any }> = ({ file, config }) => {
    const matcher = Rematch.newMatcherFn(
        Rematch.newDistanceFn((e: DiffLine) => renderUtils.deconstructLine(e.content, file.isCombined).content),
    );

    const renderBlock = (block: DiffBlock) => {
        const groupedLines = applyLineGroupping(block);
        return (
            <div className="d2h-file-diff-block" key={block.header}>
                <BlockHeader blockHeader={block.header} CSSLineClass={renderUtils.CSSLineClass} />
                {groupedLines.map(([contextLines, oldLines, newLines], index) => {
                    if (oldLines.length && newLines.length && !contextLines.length) {
                        return applyRematchMatching(oldLines, newLines, matcher, config).map(([oLines, nLines], i) => (
                            <React.Fragment key={i}>{renderChangedLines(file, config, oLines, nLines)}</React.Fragment>
                        ));
                    }

                    if (contextLines.length) {
                        return contextLines.map(line => (
                            <Line
                                key={`ctx-${line.oldNumber}-${line.newNumber}`}
                                file={file}
                                lineType={renderUtils.CSSLineClass.CONTEXT}
                                prefix=" "
                                content={renderUtils.deconstructLine(line.content, file.isCombined).content}
                                oldNumber={line.oldNumber}
                                newNumber={line.newNumber}
                            />
                        ));
                    }

                    return renderChangedLines(file, config, oldLines, newLines);
                })}
            </div>
        );
    };

    return (
        <div className="d2h-file-diff">
            <div className="d2h-file-name">{renderUtils.filenameDiff(file)}</div>
            {file.blocks.length > 0 ? file.blocks.map(renderBlock) : <EmptyDiff />}
        </div>
    );
};

export default FileDiff;
