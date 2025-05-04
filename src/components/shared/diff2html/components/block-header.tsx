import React from 'react';

interface BlockHeaderProps {
    blockHeader: string;
    CSSLineClass: any;
}

const BlockHeader: React.FC<BlockHeaderProps> = ({ blockHeader, CSSLineClass }) => {
    return (
        <div className={`d2h-code-linenumber d2h-${CSSLineClass.CONTEXT}`}>
            <span>{blockHeader}</span>
        </div>
    );
};

export default BlockHeader;
