import React from 'react';
import Numbers from './numbers';
import * as renderUtils from '../render-utils';

const Line: React.FC<{
    file: any;
    lineType: string;
    prefix: string;
    content: string;
    oldNumber?: number;
    newNumber?: number;
}> = ({ lineType, prefix, content, oldNumber, newNumber }) => {
    return (
        <div>
            <div className="d2h-code-linenumber">
                <Numbers oldNumber={oldNumber} newNumber={newNumber} />
            </div>
            <span className="d2h-code-line-prefix">{prefix === ' ' ? '\u00a0' : prefix}</span>
            <div className={`d2h-code-line ${lineType}`}>
                <span className="d2h-code-line-ctn">{renderUtils.createReactElementFromHTML(content)}</span>
            </div>
        </div>
    );
};

export default Line;
