"use client";
import React, { useState } from "react";
import { Segment, getSegmentColors, calculateSegmentPixelWidth, SEGMENT_ARROW_WIDTH } from "@/types";
import { useViewer } from "@/context/ViewerContext";
import SegmentEdge from "@/components/program/linear/segment/SegmentEdge";
import SegmentMenu from "@/components/program/linear/segment/SegmentMenu";

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
	isResizing?: boolean;
	isAnySegmentResizing?: boolean;
	isHighlightedByBox?: boolean;
	hasBoxHover?: boolean;
	onDragStart?: (e: React.MouseEvent) => void;
	onResizeStart?: (e: React.MouseEvent) => void;
	baseLeftOffset?: number;
	onDelete?: () => void;
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
	isResizing = false,
	isAnySegmentResizing = false,
	isHighlightedByBox: isHighlightedByBoxProp = false,
	hasBoxHover: hasBoxHoverProp = false,
	onDragStart,
	onResizeStart,
	baseLeftOffset = 20,
	onDelete,
}) => {
	const [isEdgeHovered, setIsEdgeHovered] = useState(false);

	// Try to get context, if not available (e.g., in drag preview), use props
	let isHighlightedByBox = isHighlightedByBoxProp;
	let hasBoxHover = hasBoxHoverProp;
	let hasAnyClick = false;

	try {
		const viewer = useViewer();
		isHighlightedByBox = viewer.isSegmentHighlighted(segment.id);
		hasBoxHover = viewer.hasAnyHover;
		hasAnyClick = viewer.hasAnyClick;
	} catch {
		// Context not available, use props
	}

	const nucleotideWidth = baseWidth * zoomLevel;
	const segmentLength = segment.length;
	const segmentPixelWidth = calculateSegmentPixelWidth(segment, nucleotideWidth);
	const segmentLeft = baseLeftOffset + position * nucleotideWidth - offset;
	const colors = getSegmentColors(segment);
	const isHovered = !isAnySegmentDragging && !isAnySegmentResizing && hoveredSegment === segment;
	const isClicked = !isAnySegmentDragging && !isAnySegmentResizing && clickedSegment === segment;
	const isHighlighted = !isAnySegmentDragging && (isHighlightedByBox || isResizing || (!isAnySegmentResizing && (isClicked || (isHovered && !clickedSegment))));
	const shouldDim = !isAnySegmentDragging && !isResizing && (hasBoxHover || hasAnyClick) && !isHighlighted;
	const polygonPoints = `0,2 ${segmentPixelWidth},2 ${segmentPixelWidth + SEGMENT_ARROW_WIDTH},20 ${segmentPixelWidth},38 0,38 ${SEGMENT_ARROW_WIDTH},20`;

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (isAnySegmentDragging || isAnySegmentResizing) {
			setIsEdgeHovered(false);
			return;
		}
		const rect = e.currentTarget.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const handleZoneStart = segmentPixelWidth - 10;
		const handleZoneEnd = segmentPixelWidth + SEGMENT_ARROW_WIDTH;
		if (mouseX >= handleZoneStart && mouseX <= handleZoneEnd) {
			setIsEdgeHovered(true);
		} else {
			setIsEdgeHovered(false);
		}
	};

	const handleDuplicate = () => {
		console.log("Duplicate segment:", segment);
		// TODO: Implement duplicate functionality
	};

	const handleDelete = () => {
		if (onDelete) {
			onDelete();
		}
	};

	return (
		<SegmentMenu segment={segment} onDuplicate={handleDuplicate} onDelete={handleDelete}>
			<div
				key={`segment-${index}`}
				data-segment-component
				className={`group absolute ${isDragging ? "opacity-50" : shouldDim ? "opacity-60" : ""}`}
				style={{
					left: `${segmentLeft}px`,
					width: `${segmentPixelWidth + SEGMENT_ARROW_WIDTH}px`,
					height: "40px",
					zIndex: isDragging ? 10 : isResizing ? 30 : isHighlighted ? 20 : 10,
					cursor: isResizing ? "ew-resize" : isEdgeHovered ? "ew-resize" : isDragging ? "grabbing" : "grab",
					filter: isDragging ? "grayscale(80%)" : shouldDim ? "grayscale(100%)" : "none",
				}}
				onMouseMove={handleMouseMove}
				onMouseEnter={() => {
					if (!clickedSegment && !isAnySegmentDragging && !isAnySegmentResizing) {
						setHoveredSegment(segment);
					}
				}}
				onMouseLeave={() => {
					if (!clickedSegment && !isAnySegmentDragging && !isAnySegmentResizing) {
						setHoveredSegment(null);
					}
					setIsEdgeHovered(false);
				}}
				onClick={(e) => {
					if (!isAnySegmentDragging && !isAnySegmentResizing) {
						e.stopPropagation();
						setClickedSegment(isClicked ? null : segment);
						setHoveredSegment(null);
					}
				}}
				onMouseDown={(e) => {
					if (isEdgeHovered) return;
					if (onDragStart) {
						onDragStart(e);
					}
				}}
			>
				<svg width="100%" height="40" viewBox={`0 0 ${segmentPixelWidth + SEGMENT_ARROW_WIDTH} 40`} preserveAspectRatio="none" className="overflow-visible">
					<polygon points={polygonPoints} fill={colors.fill} stroke={isClicked || isResizing ? colors.highlight : colors.stroke} strokeWidth={isClicked || isResizing ? "3" : "2"} />
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
				{isEdgeHovered && !isAnySegmentDragging && !isAnySegmentResizing && (
					<div
						className="absolute top-0 h-full z-30"
						style={{
							left: `${segmentPixelWidth - 10}px`,
							width: `${10 + SEGMENT_ARROW_WIDTH}px`,
							filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
						}}
						onMouseDown={(e) => {
							e.stopPropagation();
							if (onResizeStart) onResizeStart(e);
						}}
					>
						<div
							className="absolute top-0 h-full"
							style={{
								left: "8px",
							}}
						>
							<SegmentEdge />
						</div>
					</div>
				)}
			</div>
		</SegmentMenu>
	);
};

export default SegmentComponent;
