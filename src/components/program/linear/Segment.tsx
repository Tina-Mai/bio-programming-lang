"use client";
import React from "react";
import { Segment, getSegmentColors, calculateSegmentPixelWidth, SEGMENT_ARROW_WIDTH } from "@/types";

interface SegmentComponentProps {
	segment: Segment;
	index: number;
	hoveredSegment: Segment | null;
	setHoveredSegment: (segment: Segment | null) => void;
	clickedSegment: Segment | null;
	setClickedSegment: (segment: Segment | null) => void;
	baseWidth: number;
	zoomLevel: number;
	offset: number;
	position: number; // bp position based on length of prev segments
	isDragging?: boolean;
	isAnySegmentDragging?: boolean;
	onDragStart?: (e: React.MouseEvent) => void;
	baseLeftOffset?: number;
}

const SegmentComponent: React.FC<SegmentComponentProps> = ({
	segment,
	index,
	hoveredSegment,
	setHoveredSegment,
	clickedSegment,
	setClickedSegment,
	baseWidth,
	zoomLevel,
	offset,
	position,
	isDragging = false,
	isAnySegmentDragging = false,
	onDragStart,
	baseLeftOffset = 20,
}) => {
	const nucleotideWidth = baseWidth * zoomLevel;
	const segmentLength = segment.length;
	const segmentPixelWidth = calculateSegmentPixelWidth(segment, nucleotideWidth);
	const segmentLeft = baseLeftOffset + position * nucleotideWidth - offset;
	const colors = getSegmentColors(segment);
	const isHovered = !isAnySegmentDragging && hoveredSegment === segment;
	const isClicked = !isAnySegmentDragging && clickedSegment === segment;
	const isHighlighted = !isAnySegmentDragging && (isClicked || (isHovered && !clickedSegment));
	const shouldDim = !isAnySegmentDragging && (clickedSegment || hoveredSegment) && !isHighlighted;
	const polygonPoints = `0,2 ${segmentPixelWidth},2 ${segmentPixelWidth + SEGMENT_ARROW_WIDTH},20 ${segmentPixelWidth},38 0,38 ${SEGMENT_ARROW_WIDTH},20`;

	return (
		<div
			key={`segment-${index}`}
			data-segment-component
			className={`group absolute transition-all duration-200 ${isDragging ? "opacity-50" : shouldDim ? "opacity-60" : ""}`}
			style={{
				left: `${segmentLeft}px`,
				width: `${segmentPixelWidth + SEGMENT_ARROW_WIDTH}px`,
				height: "40px",
				zIndex: isDragging ? 10 : isHighlighted ? 20 : 10,
				cursor: isDragging ? "grabbing" : "grab",
				filter: isDragging ? "grayscale(80%)" : shouldDim ? "grayscale(100%)" : "none",
			}}
			onMouseEnter={() => {
				if (!clickedSegment && !isAnySegmentDragging) {
					setHoveredSegment(segment);
				}
			}}
			onMouseLeave={() => {
				if (!clickedSegment && !isAnySegmentDragging) {
					setHoveredSegment(null);
				}
			}}
			onClick={(e) => {
				if (!isAnySegmentDragging) {
					e.stopPropagation();
					setClickedSegment(segment);
					setHoveredSegment(null);
				}
			}}
			onMouseDown={(e) => {
				if (onDragStart) {
					onDragStart(e);
				}
			}}
		>
			<svg width="100%" height="40" viewBox={`0 0 ${segmentPixelWidth + SEGMENT_ARROW_WIDTH} 40`} preserveAspectRatio="none" className="overflow-visible">
				<polygon points={polygonPoints} fill={colors.fill} stroke={isClicked ? colors.highlight : colors.stroke} strokeWidth={isClicked ? "3" : "2"} />
			</svg>
			<div
				className={`absolute inset-0 flex items-center text-slate-950/70 text-xs font-medium justify-start`}
				style={{
					paddingLeft: `${SEGMENT_ARROW_WIDTH + 8}px`,
					paddingRight: `${SEGMENT_ARROW_WIDTH + 8}px`,
				}}
			>
				<span
					className={`${isHighlighted ? "text-white backdrop-blur rounded-xs px-1 text-nowrap" : "truncate"} transition-all duration-300`}
					style={{ backgroundColor: isHighlighted ? colors.highlight : "transparent" }}
				>
					{segment.label || "Segment"} <span className={`ml-1 font-mono font-normal ${isHighlighted ? "text-slate-100" : "text-slate-400"}`}>{segmentLength}</span>
				</span>
			</div>
		</div>
	);
};

export default SegmentComponent;
