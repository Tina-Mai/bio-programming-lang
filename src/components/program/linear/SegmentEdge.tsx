import { SEGMENT_ARROW_WIDTH } from "@/types";
import React from "react";

interface SegmentEdgeProps {
	height?: number;
	color?: string;
	strokeWidth?: number;
}

const SegmentEdge: React.FC<SegmentEdgeProps> = ({ height = 40, color = "#3b82f6", strokeWidth = 5 }) => {
	return (
		<svg width={SEGMENT_ARROW_WIDTH} height={height} viewBox={`0 0 ${SEGMENT_ARROW_WIDTH} ${height}`} className="overflow-visible">
			<polyline points={`0,2 ${SEGMENT_ARROW_WIDTH},${height / 2} 0,${height - 2}`} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
};

export default SegmentEdge;
