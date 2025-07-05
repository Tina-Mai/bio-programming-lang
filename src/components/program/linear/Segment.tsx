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
	isResizing?: boolean;
	isAnySegmentResizing?: boolean;
	onResizeStart?: (e: React.MouseEvent) => void;
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
	isResizing = false,
	isAnySegmentResizing = false,
	onResizeStart,
}) => {
	const nucleotideWidth = baseWidth * zoomLevel;
	const segmentLength = segment.length;
	const segmentPixelWidth = calculateSegmentPixelWidth(segment, nucleotideWidth);
	const segmentLeft = baseLeftOffset + position * nucleotideWidth - offset;
	const colors = getSegmentColors(segment);
	const isHovered = !isAnySegmentDragging && !isAnySegmentResizing && hoveredSegment === segment;
	const isClicked = !isAnySegmentDragging && !isAnySegmentResizing && clickedSegment === segment;
	const isHighlighted = !isAnySegmentDragging && !isAnySegmentResizing && (isClicked || (isHovered && !clickedSegment));
	const shouldDim = !isAnySegmentDragging && !isAnySegmentResizing && (clickedSegment || hoveredSegment) && !isHighlighted;
	const polygonPoints = `0,2 ${segmentPixelWidth},2 ${segmentPixelWidth + SEGMENT_ARROW_WIDTH},20 ${segmentPixelWidth},38 0,38 ${SEGMENT_ARROW_WIDTH},20`;

	const [isHoveringResizeHandle, setIsHoveringResizeHandle] = React.useState(false);

	const handleMouseMove = (e: React.MouseEvent) => {
		if (isAnySegmentDragging || isAnySegmentResizing) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const resizeHandleWidth = 10; // pixels from the end edge that trigger resize
		const endEdgeX = segmentPixelWidth;

		// Check if hovering near the end edge (right side before the arrow)
		if (x >= endEdgeX - resizeHandleWidth && x <= endEdgeX + 2) {
			setIsHoveringResizeHandle(true);
		} else {
			setIsHoveringResizeHandle(false);
		}
	};

	const handleMouseLeave = () => {
		setIsHoveringResizeHandle(false);
		if (!clickedSegment && !isAnySegmentDragging && !isAnySegmentResizing) {
			setHoveredSegment(null);
		}
	};

	return (
		<div
			key={`segment-${index}`}
			data-segment-component
			className={`group absolute ${isDragging || isResizing ? "opacity-50" : shouldDim ? "opacity-60" : ""}`}
			style={{
				left: `${segmentLeft}px`,
				width: `${segmentPixelWidth + SEGMENT_ARROW_WIDTH}px`,
				height: "40px",
				zIndex: isDragging || isResizing ? 10 : isHighlighted ? 20 : 10,
				cursor: isDragging ? "grabbing" : isResizing ? "ew-resize" : isHoveringResizeHandle ? "ew-resize" : "grab",
				filter: isDragging || isResizing ? "grayscale(80%)" : shouldDim ? "grayscale(100%)" : "none",
				// Remove all transitions - they conflict with JS animation
			}}
			onMouseEnter={() => {
				if (!clickedSegment && !isAnySegmentDragging && !isAnySegmentResizing) {
					setHoveredSegment(segment);
				}
			}}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			onClick={(e) => {
				if (!isAnySegmentDragging && !isAnySegmentResizing && !isHoveringResizeHandle) {
					e.stopPropagation();
					setClickedSegment(segment);
					setHoveredSegment(null);
				}
			}}
			onMouseDown={(e) => {
				if (isHoveringResizeHandle && onResizeStart) {
					e.stopPropagation();
					onResizeStart(e);
				} else if (onDragStart && !isHoveringResizeHandle) {
					onDragStart(e);
				}
			}}
		>
			<svg width="100%" height="40" viewBox={`0 0 ${segmentPixelWidth + SEGMENT_ARROW_WIDTH} 40`} preserveAspectRatio="none" className="overflow-visible">
				<polygon points={polygonPoints} fill={colors.fill} stroke={isClicked ? colors.highlight : colors.stroke} strokeWidth={isClicked ? "3" : "2"} />
			</svg>

			{/* Resize handle indicator - visual cue when hovering */}
			{isHoveringResizeHandle && !isAnySegmentDragging && !isAnySegmentResizing && (
				<div
					className="absolute top-1 bottom-1 w-0.5 bg-blue-500/50"
					style={{
						left: `${segmentPixelWidth - 1}px`,
					}}
				/>
			)}

			<div
				className={`absolute inset-0 flex items-center text-slate-950/70 text-xs font-medium justify-start`}
				style={{
					paddingLeft: `${SEGMENT_ARROW_WIDTH + 8}px`,
					paddingRight: `${SEGMENT_ARROW_WIDTH + 8}px`,
				}}
			>
				<span
					className={`${isHighlighted ? "text-white backdrop-blur rounded-xs px-1 text-nowrap" : "truncate"}`}
					style={{ backgroundColor: isHighlighted ? colors.highlight : "transparent" }}
				>
					{segment.label || "Segment"} <span className={`ml-1 font-mono font-normal ${isHighlighted ? "text-slate-100" : "text-slate-400"}`}>{segmentLength}</span>
				</span>
			</div>
		</div>
	);
};

export default SegmentComponent;
