import React from "react";

interface SegmentSymbolProps {
	className?: string;
	width?: number;
	height?: number;
}

const SegmentSymbol: React.FC<SegmentSymbolProps> = ({ className = "", width = 31, height = 20 }) => {
	return (
		<svg width={width} height={height} viewBox="0 0 31 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
			<path fillRule="evenodd" clipRule="evenodd" d="M5 10L0 20H21H23.29L30.29 10L23.29 0H21H0L5 10ZM3.25 18L7.29 10L3.25 2H22L28 10L22 18H3.25Z" fill="currentColor" />
		</svg>
	);
};

export default SegmentSymbol;
