import React from 'react';
import * as DiffParser from './diff-parser';
import { FileListRenderer } from './file-list-renderer';
import LineByLineRenderer, { LineByLineRendererConfig, defaultLineByLineRendererConfig } from './line-by-line-renderer';
import SideBySideRenderer, { SideBySideRendererConfig, defaultSideBySideRendererConfig } from './side-by-side-renderer';
import { DiffFile, OutputFormatType } from './types';

// Updated configuration without Hogan.js
export interface Diff2HtmlConfig
    extends DiffParser.DiffParserConfig,
        LineByLineRendererConfig,
        SideBySideRendererConfig {
    outputFormat?: OutputFormatType;
    drawFileList?: boolean;
}

export const defaultDiff2HtmlConfig = {
    ...defaultLineByLineRendererConfig,
    ...defaultSideBySideRendererConfig,
    outputFormat: OutputFormatType.LINE_BY_LINE,
    drawFileList: true,
};

export const Diff2Html: React.FC<{ diffInput: string | DiffFile[]; configuration?: Diff2HtmlConfig }> = ({
    diffInput,
    configuration = {},
}) => {
    // Merging the default config with the passed configuration
    const config = { ...defaultDiff2HtmlConfig, ...configuration };

    // Parse the diffInput into a JSON format (either string or already parsed)
    const diffJson = typeof diffInput === 'string' ? DiffParser.parse(diffInput, config) : diffInput;

    // File list rendering logic
    const fileList = config.drawFileList ? (
        <FileListRenderer files={diffJson} colorScheme={config.colorScheme} />
    ) : null;

    // Diff rendering logic based on output format
    const diffOutput =
        config.outputFormat === 'side-by-side' ? (
            <SideBySideRenderer files={diffJson} config={config} />
        ) : (
            <LineByLineRenderer files={diffJson} config={config} />
        );

    // Return the component with file list and diff output
    return (
        <div className="diff-container">
            {fileList}
            {diffOutput}
        </div>
    );
};
