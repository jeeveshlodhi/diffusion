import React from 'react';

const Numbers: React.FC<{
    oldNumber?: number;
    newNumber?: number;
}> = ({ oldNumber, newNumber }) => (
    <>
        <div className="line-num1">{oldNumber !== undefined ? oldNumber : ''}</div>
        <div className="line-num2">{newNumber !== undefined ? newNumber : ''}</div>
    </>
);

export default Numbers;
