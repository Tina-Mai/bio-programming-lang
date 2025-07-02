"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sequence, Segment } from "@/types";
import ConstraintBox from "./Constraint";
import GeneratorBox from "./Generator";

interface Selection {
	start: number;
	end: number;
}

interface SegmentComponentProps {
	segment: Segment;
	index: number;
	hoveredSegment: Segment | null;
	setHoveredSegment: (segment: Segment | null) => void;
	clickedSegment: Segment | null;
	setClickedSegment: (segment: Segment | null) => void;
	direction: "forward" | "reverse";
	baseWidth: number;
	zoomLevel: number;
	offset: number;
}

const SegmentComponent: React.FC<SegmentComponentProps> = ({ segment, index, hoveredSegment, setHoveredSegment, clickedSegment, setClickedSegment, direction, baseWidth, zoomLevel, offset }) => {
	const nucleotideWidth = baseWidth * zoomLevel;
	const segmentPixelWidth = (segment.end - segment.start + 1) * nucleotideWidth;
	const segmentLeft = 20 + segment.start * nucleotideWidth - offset;
	const arrowWidth = 12;

	// get colors for the annotation
	const getColors = () => {
		if (segment.color) return { fill: segment.color, stroke: segment.color };
		const colorMap = {
			CDS: { fill: "rgb(253 224 71 / 0.45)", stroke: "rgb(234 179 8 / 0.8)" }, // yellow
			promoter: { fill: "rgb(167 243 208 / 0.45)", stroke: "rgb(52 211 153 / 0.8)" }, // emerald
			terminator: { fill: "rgb(196 181 253 / 0.45)", stroke: "rgb(147 114 243 / 0.8)" }, // purple
			default: { fill: "rgb(165 180 252 / 0.45)", stroke: "rgb(129 140 248 / 0.8)" }, // indigo
		};
		return colorMap[segment.type as keyof typeof colorMap] || colorMap.default;
	};

	const colors = getColors();
	const isHovered = hoveredSegment === segment;
	const isClicked = clickedSegment === segment;
	const isHighlighted = isClicked || (isHovered && !clickedSegment);
	const shouldDim = (clickedSegment || hoveredSegment) && !isHighlighted;

	// direction-specific configurations
	const config = {
		forward: {
			polygonPoints: `0,2 ${segmentPixelWidth - arrowWidth},2 ${segmentPixelWidth},16 ${segmentPixelWidth - arrowWidth},30 0,30`,
			textAlign: "justify-start",
			paddingLeft: "8px",
			paddingRight: "16px",
		},
		reverse: {
			polygonPoints: `${arrowWidth},2 ${segmentPixelWidth},2 ${segmentPixelWidth},30 ${arrowWidth},30 0,16`,
			textAlign: "justify-end",
			paddingLeft: "16px",
			paddingRight: "8px",
		},
	};

	const currentConfig = config[direction];

	return (
		<div
			key={`${direction}-${index}`}
			data-segment-component
			className={`group absolute transition-opacity duration-200 ${shouldDim ? "opacity-30" : "opacity-100"} cursor-pointer`}
			style={{
				left: `${segmentLeft}px`,
				width: `${segmentPixelWidth}px`,
				height: "32px",
				zIndex: isHighlighted ? 20 : 10,
			}}
			onMouseEnter={() => {
				if (!clickedSegment) {
					setHoveredSegment(segment);
				}
			}}
			onMouseLeave={() => {
				if (!clickedSegment) {
					setHoveredSegment(null);
				}
			}}
			onClick={(e) => {
				e.stopPropagation();
				setClickedSegment(segment);
				setHoveredSegment(null);
			}}
		>
			<svg width="100%" height="32" viewBox={`0 0 ${segmentPixelWidth} 32`} preserveAspectRatio="none" className="overflow-visible backdrop-blur-[2px]">
				<polygon points={currentConfig.polygonPoints} fill={colors.fill} stroke={colors.stroke} strokeWidth="1" />
			</svg>
			<div
				className={`absolute inset-0 flex items-center text-slate-950/70 text-xs font-medium ${currentConfig.textAlign}`}
				style={{
					paddingLeft: currentConfig.paddingLeft,
					paddingRight: currentConfig.paddingRight,
				}}
			>
				<span
					className={`${isHighlighted ? "text-white backdrop-blur rounded-xs px-1 text-nowrap" : "truncate"} transition-all duration-300`}
					style={{ backgroundColor: isHighlighted ? colors.stroke : "transparent" }}
				>
					{segment.label || "Segment"} <span className={`ml-1 font-mono font-normal ${isHighlighted ? "text-slate-100" : "text-slate-400"}`}>{segment.end - segment.start + 1}</span>
				</span>
			</div>
		</div>
	);
};

const LinearViewer: React.FC<Sequence> = ({ length, sequence, segments = [], constraints = [], generators = [] }) => {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
	const [clickedSegment, setClickedSegment] = useState<Segment | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [zoomLevel, setZoomLevel] = useState<number>(1);
	const [targetZoomLevel, setTargetZoomLevel] = useState<number>(1);
	const [offset, setOffset] = useState<number>(0);
	const [targetOffset, setTargetOffset] = useState<number>(0);
	const [isHovering, setIsHovering] = useState<boolean>(false);
	const [isPanning, setIsPanning] = useState<boolean>(false);
	const [lastMouseX, setLastMouseX] = useState<number>(0);
	const [visibleWidth, setVisibleWidth] = useState<number>(0);

	const containerRef = useRef<HTMLDivElement>(null);
	const sequenceLength = length;

	const baseWidth = 10.1; // base nucleotide width at zoom level 1
	const nucleotideWidth = baseWidth * zoomLevel;

	// update visible width from container
	const updateVisibleWidth = useCallback(() => {
		if (containerRef.current) {
			setVisibleWidth(containerRef.current.clientWidth);
		}
	}, []);

	// calculate minimum zoom level to fit entire sequence in container
	const calculateMinZoomLevel = useCallback(() => {
		const container = containerRef.current;
		if (!container || !length) return 0.1;
		const availableWidth = container.clientWidth - 40;
		return Math.max(0.1, availableWidth / (length * baseWidth));
	}, [length, baseWidth]);

	// animate zoom level and offset
	useEffect(() => {
		setZoomLevel(targetZoomLevel);
		setOffset(targetOffset);
	}, [targetZoomLevel, targetOffset]);

	// calculate position from mouse event
	const getPositionFromEvent = (e: React.MouseEvent | MouseEvent) => {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const adjustedX = x - 20;
		const position = Math.round((adjustedX + offset) / nucleotideWidth);
		return Math.max(0, Math.min(sequenceLength - 1, position));
	};

	// handle scrolling and zooming
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			if (!isHovering) return;

			e.preventDefault();

			if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				const scrollAmount = e.deltaX || e.deltaY;
				const totalContentWidth = sequenceLength * nucleotideWidth + 40;
				const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, offset + scrollAmount));
				setOffset(newOffset);
				setTargetOffset(newOffset);
				return;
			}

			const minZoomLevel = calculateMinZoomLevel();
			const direction = e.deltaY < 0 ? 1 : -1;
			const zoomFactor = 0.1;
			const newZoomLevel = Math.max(minZoomLevel, Math.min(10, zoomLevel + direction * zoomFactor));

			if (newZoomLevel === zoomLevel) return;

			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const cursorXRelativeToViewport = e.clientX - rect.left;
			const cursorXRelativeToContent = cursorXRelativeToViewport + offset;
			const totalCurrentContentWidth = sequenceLength * nucleotideWidth + 40;
			const cursorRatio = cursorXRelativeToContent / totalCurrentContentWidth;
			const newContentWidth = sequenceLength * baseWidth * newZoomLevel + 40;
			const newOffset = cursorRatio * newContentWidth - cursorXRelativeToViewport;
			const clampedNewOffset = Math.max(0, Math.min(newContentWidth - visibleWidth, newOffset));

			setTargetZoomLevel(newZoomLevel);
			setTargetOffset(clampedNewOffset);
		},
		[isHovering, zoomLevel, offset, sequenceLength, nucleotideWidth, baseWidth, visibleWidth, calculateMinZoomLevel]
	);

	// handle mouse events for selection and panning
	const handleMouseDown = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const isClickingSegment = target.closest("[data-segment-component]") !== null;

		if (!isClickingSegment) {
			setClickedSegment(null);
			setHoveredSegment(null);
		}
		if (isClickingSegment) {
			setSelection(null);
			return;
		}

		const position = getPositionFromEvent(e);
		if (position !== null && !isPanning) {
			setIsDragging(true);
			setSelection({ start: position, end: position });
		} else if (isHovering) {
			setIsPanning(true);
			setLastMouseX(e.clientX);
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (isPanning) {
			const deltaX = e.clientX - lastMouseX;
			const totalContentWidth = sequenceLength * nucleotideWidth + 40;
			const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, offset - deltaX));
			setOffset(newOffset);
			setTargetOffset(newOffset);
			setLastMouseX(e.clientX);
			return;
		}

		const position = getPositionFromEvent(e);
		if (position !== null) {
			setHoveredPosition(position);
			if (isDragging && selection) {
				setSelection({
					start: Math.min(selection.start, position),
					end: Math.max(selection.start, position),
				});
			}
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
		setIsPanning(false);
	};

	const handleMouseLeave = () => {
		setHoveredPosition(null);
		setIsDragging(false);
		setIsPanning(false);
		setIsHovering(false);
		if (!clickedSegment) {
			setHoveredSegment(null);
		}
	};

	const handleMouseEnter = () => {
		setIsHovering(true);
	};

	// global mouse events for dragging outside container
	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (isPanning) {
				const deltaX = e.clientX - lastMouseX;
				const totalContentWidth = sequenceLength * nucleotideWidth + 40;
				const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, offset - deltaX));
				setOffset(newOffset);
				setTargetOffset(newOffset);
				setLastMouseX(e.clientX);
				return;
			}

			if (isDragging && selection) {
				const position = getPositionFromEvent(e);
				if (position !== null) {
					setSelection({
						start: Math.min(selection.start, position),
						end: Math.max(selection.start, position),
					});
				}
			}
		};

		const handleGlobalMouseUp = () => {
			setIsDragging(false);
			setIsPanning(false);
		};

		if (isDragging || isPanning) {
			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleGlobalMouseMove);
			document.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [isDragging, isPanning, selection, lastMouseX, offset, sequenceLength, nucleotideWidth, visibleWidth, getPositionFromEvent]);

	// click outside the component to clear selection and clicked segment
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setSelection(null);
				setClickedSegment(null);
				setHoveredSegment(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// set up event listeners and initial measurements
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		updateVisibleWidth();

		const initialZoomLevel = calculateMinZoomLevel();
		if (zoomLevel < initialZoomLevel) {
			setZoomLevel(initialZoomLevel);
			setTargetZoomLevel(initialZoomLevel);
		}

		container.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			container.removeEventListener("wheel", handleWheel);
		};
	}, [handleWheel, calculateMinZoomLevel, zoomLevel, updateVisibleWidth]);

	// handle window resize
	useEffect(() => {
		const handleResize = () => {
			updateVisibleWidth();
			const minZoomLevel = calculateMinZoomLevel();
			if (zoomLevel < minZoomLevel) {
				setZoomLevel(minZoomLevel);
				setTargetZoomLevel(minZoomLevel);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [calculateMinZoomLevel, zoomLevel, updateVisibleWidth]);

	// calculate dynamic ruler interval based on zoom level
	const calculateRulerInterval = (zoom: number): number => {
		if (zoom >= 8) return 1;
		if (zoom >= 4) return 2;
		if (zoom >= 2) return 5;
		if (zoom >= 1) return 10;
		if (zoom >= 0.5) return 20;
		if (zoom >= 0.25) return 50;
		if (zoom >= 0.1) return 100;
		if (zoom >= 0.05) return 200;
		if (zoom >= 0.025) return 500;
		return 1000;
	};

	const rulerInterval = calculateRulerInterval(zoomLevel);

	// generate ruler marks based on visible area
	const rulerMarks: number[] = [];
	const startIndex = Math.floor(offset / nucleotideWidth);
	const endIndex = Math.ceil((offset + visibleWidth) / nucleotideWidth);
	const firstBpInView = Math.max(1, startIndex + 1);
	const lastBpInView = Math.min(sequenceLength, endIndex + 1);
	if (firstBpInView <= 1) {
		rulerMarks.push(1);
	}
	const firstMultiple = Math.ceil(firstBpInView / rulerInterval) * rulerInterval;
	for (let bp = firstMultiple; bp <= lastBpInView; bp += rulerInterval) {
		if (bp !== 1) {
			rulerMarks.push(bp);
		}
	}

	const forwardSegments = segments.filter((segment) => segment.direction === "forward" || !segment.direction);
	const backwardSegments = segments.filter((segment) => segment.direction === "reverse");

	// Get constraints and generators for highlighted segment
	// Prioritize clicked segment over hovered segment
	const highlightedSegment = clickedSegment || hoveredSegment;

	return (
		<div className="w-full h-full">
			{/* Main viewer container */}
			<div
				ref={containerRef}
				className="flex flex-col h-full select-none overflow-hidden relative"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
				onMouseEnter={handleMouseEnter}
				style={{
					cursor: isPanning ? "grabbing" : isDragging ? "crosshair" : "grab",
					touchAction: "none",
				}}
			>
				{/* Hover tooltip showing sequence */}
				{hoveredPosition !== null && (
					<Tooltip open={true}>
						<TooltipTrigger asChild>
							<div
								className="absolute w-1 h-full pointer-events-none"
								style={{
									top: 0,
									left: `${20 + hoveredPosition * nucleotideWidth - offset + nucleotideWidth / 2}px`,
									transform: "translateX(-50%)",
								}}
							/>
						</TooltipTrigger>
						<TooltipContent
							side="top"
							sideOffset={8}
							className="vertical gap-1 justify-center items-center translate-y-8.5 border-0 !bg-slate-400 py-0 px-[2.5px] !shadow-none !rounded-xs"
						>
							<div className="font-mono text-center text-white">{hoveredPosition + 1}</div>
						</TooltipContent>
					</Tooltip>
				)}
				{/* Vertical grid lines at ruler positions */}
				{rulerMarks.map((mark) => {
					const leftEdge = 20 + (mark - 1) * nucleotideWidth - offset;
					const center = leftEdge + nucleotideWidth / 2;

					if (center < -50 || center > visibleWidth + 50) return null;
					return (
						<div
							key={`grid-${mark}`}
							className="absolute top-0 bottom-0 w-px border-l border-dotted border-slate-300/70 pointer-events-none"
							style={{
								left: `${center}px`,
								transform: "translateX(-50%)",
							}}
						/>
					);
				})}
				{/* Hover tracking line */}
				{hoveredPosition !== null && (
					<div
						className="absolute top-0 bottom-0 pointer-events-none z-40"
						style={{
							left: `${20 + hoveredPosition * nucleotideWidth - offset + nucleotideWidth / 2}px`,
							transform: "translateX(-50%)",
						}}
					>
						<div className="absolute top-0 size-1 bg-slate-400" style={{ left: "-1.5px" }} />
						<div className="absolute top-0 bottom-0 w-px bg-slate-400/60" />
						<div className="absolute bottom-0 size-1 bg-slate-400" style={{ left: "-1.5px" }} />
					</div>
				)}
				{/* Ruler - At the top */}
				<div className="absolute top-0 left-0 right-0 h-8 w-full z-30">
					<div className="absolute w-full top-0">
						{/* Main ruler marks */}
						{rulerMarks.map((mark) => {
							const leftEdge = 20 + (mark - 1) * nucleotideWidth - offset;
							const center = leftEdge + nucleotideWidth / 2;

							if (center < -50 || center > visibleWidth + 50) return null;
							return (
								<div key={mark} className="absolute" style={{ left: `${center}px` }}>
									<div className="h-2 w-px bg-slate-400" style={{ transform: "translateX(-50%)" }} />
									<div className="font-mono text-[10px] text-slate-500 mt-0.5" style={{ transform: "translateX(-50%)" }}>
										{mark}
									</div>
								</div>
							);
						})}

						{/* Intermediate ruler marks - only show if interval > 1 */}
						{rulerInterval > 1 &&
							rulerMarks.map((mark, index) => {
								if (index === 0) return null; // Skip first mark

								const prevMark = rulerMarks[index - 1];
								const midPoint = prevMark + Math.floor((mark - prevMark) / 2);
								const leftEdge = 20 + (midPoint - 1) * nucleotideWidth - offset;
								const center = leftEdge + nucleotideWidth / 2;

								if (center < -50 || center > visibleWidth + 50) return null;
								return (
									<div key={`mid-${prevMark}-${mark}`} className="absolute" style={{ left: `${center}px` }}>
										<div className="h-1.5 w-px bg-slate-400/70" style={{ transform: "translateX(-50%)" }} />
									</div>
								);
							})}
					</div>
				</div>
				{/* Main content wrapper - centered */}
				<div className="flex flex-col justify-center flex-1 pt-8">
					{/* Constraints Segment - Above sequence */}
					<div className="relative h-40 w-full">
						{segments.map((segment) => {
							// Only show if this segment is hovered or clicked
							if (highlightedSegment?.id !== segment.id) return null;

							// Find all constraints that apply to this segment
							const segmentConstraints = constraints.filter((constraint) => constraint.segments.includes(segment.id));

							if (segmentConstraints.length === 0) return null;

							const segmentCenter = 20 + segment.start * nucleotideWidth + ((segment.end - segment.start + 1) * nucleotideWidth) / 2 - offset;

							// Skip if outside visible area
							if (segmentCenter < -100 || segmentCenter > visibleWidth + 100) return null;

							// Calculate total width of constraint boxes (approximate)
							const constraintBoxWidth = 180; // Approximate width of each constraint box
							const totalWidth = segmentConstraints.length * constraintBoxWidth + (segmentConstraints.length - 1) * 8; // 8px gap
							const halfWidth = totalWidth / 2;

							// Calculate adjusted position to keep boxes within container
							let adjustedLeft = segmentCenter;
							const padding = 16;
							if (segmentCenter - halfWidth < padding) {
								adjustedLeft = halfWidth + padding;
							} else if (segmentCenter + halfWidth > visibleWidth - padding) {
								adjustedLeft = visibleWidth - halfWidth - padding;
							}

							return (
								<div key={`segment-${segment.id}-constraints`}>
									{/* Constraint boxes */}
									<div
										className="absolute flex flex-row gap-2 items-end justify-center"
										style={{
											left: `${adjustedLeft}px`,
											bottom: "24px",
											transform: "translateX(-50%)",
										}}
									>
										{segmentConstraints.map((constraint, idx) => (
											<div key={`constraint-${idx}`} className="relative">
												<ConstraintBox constraint={constraint} />
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>

					{/* Sequence Segment */}
					<div className="relative h-8 w-full">
						{/* Single sequence line */}
						<div
							className={`absolute top-2 h-5 border-x-4 border-slate-400  ${highlightedSegment ? "bg-slate-300/70" : "bg-slate-300"}`}
							style={{
								left: `${20 - offset}px`,
								width: `${sequenceLength * nucleotideWidth}px`,
							}}
						/>

						{/* Annotation hover highlight overlay */}
						{highlightedSegment && (
							<div
								className="absolute h-5 bg-slate-400/60 pointer-events-none transition-all duration-300"
								style={{
									left: `${20 + highlightedSegment.start * nucleotideWidth - offset}px`,
									width: `${(highlightedSegment.end - highlightedSegment.start + 1) * nucleotideWidth}px`,
									top: "8px",
								}}
							/>
						)}

						{/* Sequence segmentation lines */}
						{Array.from({ length: sequenceLength - 1 }, (_, i) => i + 1)
							.filter((position) => {
								const x = 20 + position * nucleotideWidth - offset;
								return x >= -nucleotideWidth && x <= visibleWidth + nucleotideWidth;
							})
							.map((position) => (
								<div
									key={position}
									className="absolute w-px h-5 bg-white opacity-50"
									style={{
										left: `${20 + position * nucleotideWidth - offset}px`,
										top: "8px",
									}}
								/>
							))}

						{/* Selection highlight */}
						{selection && (
							<div
								className="absolute h-full bg-blue-200 border-x-3 border-blue-500 opacity-30 z-30"
								style={{
									left: `${20 + selection.start * nucleotideWidth - offset}px`,
									width: `${(selection.end - selection.start + 1) * nucleotideWidth}px`,
									top: "-8px",
								}}
							/>
						)}
					</div>

					{/* Forward Annotations Segment */}
					{forwardSegments.length > 0 && (
						<div className="relative h-10 w-full overflow-visible">
							{forwardSegments
								.filter((segment) => {
									const segmentLeft = 20 + segment.start * nucleotideWidth - offset;
									const segmentWidth = (segment.end - segment.start + 1) * nucleotideWidth;
									return segmentLeft + segmentWidth >= 0 && segmentLeft <= visibleWidth;
								})
								.map((segment, index) => (
									<SegmentComponent
										key={`forward-${index}`}
										segment={segment}
										index={index}
										hoveredSegment={hoveredSegment}
										setHoveredSegment={setHoveredSegment}
										clickedSegment={clickedSegment}
										setClickedSegment={setClickedSegment}
										direction="forward"
										baseWidth={baseWidth}
										zoomLevel={zoomLevel}
										offset={offset}
									/>
								))}

							{/* Constraint curves for this segment if it's highlighted */}
							{highlightedSegment &&
								forwardSegments.includes(highlightedSegment) &&
								(() => {
									const segmentConstraints = constraints.filter((constraint) => constraint.segments.includes(highlightedSegment.id));
									if (segmentConstraints.length === 0) return null;

									const segmentCenter = 20 + highlightedSegment.start * nucleotideWidth + ((highlightedSegment.end - highlightedSegment.start + 1) * nucleotideWidth) / 2 - offset;

									// config: constraint box positions
									const constraintBoxWidth = 200;
									const totalWidth = segmentConstraints.length * constraintBoxWidth + (segmentConstraints.length - 1) * 8;
									const halfWidth = totalWidth / 2;

									let adjustedLeft = segmentCenter;
									const padding = 16;
									if (segmentCenter - halfWidth < padding) {
										adjustedLeft = halfWidth + padding;
									} else if (segmentCenter + halfWidth > visibleWidth - padding) {
										adjustedLeft = visibleWidth - halfWidth - padding;
									}

									return (
										<svg
											className="absolute pointer-events-none z-20"
											style={{
												left: 0,
												top: "-140px",
												width: "100%",
												height: "140px",
												overflow: "visible",
											}}
										>
											{segmentConstraints.map((constraint, idx, arr) => {
												const boxOffset = (idx - (arr.length - 1) / 2) * (constraintBoxWidth + 8);
												const boxCenterX = adjustedLeft + boxOffset;
												const startX = boxCenterX;
												const startY = 52; // config: top space to constraint box
												const endX = segmentCenter;
												const endY = 142; // config: bottom space to segment
												const isOffset = Math.abs(startX - endX) > 10;

												if (isOffset) {
													const controlY = (startY + endY) / 2;
													return (
														<path
															key={`constraint-curve-${idx}`}
															d={`M ${startX} ${startY} 
															C ${startX} ${controlY}, 
															${endX} ${controlY}, 
															${endX} ${endY}`}
															fill="none"
															stroke="oklch(55.4% 0.046 257.417)"
															strokeWidth="1.5"
															strokeDasharray="3, 3"
															className="stroke-dash-anim"
														/>
													);
												} else {
													return (
														<line
															key={`constraint-line-${idx}`}
															x1={startX}
															y1={startY}
															x2={endX}
															y2={endY}
															stroke="oklch(55.4% 0.046 257.417)"
															strokeWidth="1.5"
															strokeDasharray="3, 3"
															className="stroke-dash-anim"
														/>
													);
												}
											})}
										</svg>
									);
								})()}

							{/* Generator curves for forward segments if highlighted */}
							{highlightedSegment &&
								forwardSegments.includes(highlightedSegment) &&
								(() => {
									const segmentGenerators = generators.filter((generator) => generator.segments.includes(highlightedSegment.id));
									if (segmentGenerators.length === 0) return null;

									const segmentCenter = 20 + highlightedSegment.start * nucleotideWidth + ((highlightedSegment.end - highlightedSegment.start + 1) * nucleotideWidth) / 2 - offset;

									// config: generator box positions
									const generatorBoxWidth = 180;
									const totalWidth = segmentGenerators.length * generatorBoxWidth + (segmentGenerators.length - 1) * 8;
									const halfWidth = totalWidth / 2;

									let adjustedLeft = segmentCenter;
									const padding = 16;
									if (segmentCenter - halfWidth < padding) {
										adjustedLeft = halfWidth + padding;
									} else if (segmentCenter + halfWidth > visibleWidth - padding) {
										adjustedLeft = visibleWidth - halfWidth - padding;
									}

									return (
										<svg
											className="absolute pointer-events-none z-20"
											style={{
												left: 0,
												top: "30px", // config: top space to segment
												width: "100%",
												height: "120px",
												overflow: "visible",
											}}
										>
											{segmentGenerators.map((generator, idx, arr) => {
												const boxOffset = (idx - (arr.length - 1) / 2) * (generatorBoxWidth + 8);
												const boxCenterX = adjustedLeft + boxOffset;

												const startX = segmentCenter;
												const startY = 0;
												const endX = boxCenterX;
												const endY = 27; // config: bottom space to generator box
												const isOffset = Math.abs(startX - endX) > 10;

												if (isOffset) {
													const controlY = (startY + endY) / 2;
													return (
														<path
															key={`generator-curve-${idx}`}
															d={`M ${startX} ${startY} 
															C ${startX} ${controlY}, 
															${endX} ${controlY}, 
															${endX} ${endY}`}
															fill="none"
															stroke="oklch(55.4% 0.046 257.417)"
															strokeWidth="1.5"
															strokeDasharray="3, 3"
															className="stroke-dash-anim"
														/>
													);
												} else {
													return (
														<line
															key={`generator-line-${idx}`}
															x1={startX}
															y1={startY}
															x2={endX}
															y2={endY}
															stroke="oklch(55.4% 0.046 257.417)"
															strokeWidth="1.5"
															strokeDasharray="3, 3"
															className="stroke-dash-anim"
														/>
													);
												}
											})}
										</svg>
									);
								})()}
						</div>
					)}

					{/* Backward Annotations Segment */}
					{backwardSegments.length > 0 && (
						<div className="relative h-10 w-full overflow-visible">
							{backwardSegments
								.filter((segment) => {
									const segmentLeft = 20 + segment.start * nucleotideWidth - offset;
									const segmentWidth = (segment.end - segment.start + 1) * nucleotideWidth;
									return segmentLeft + segmentWidth >= 0 && segmentLeft <= visibleWidth;
								})
								.map((segment, index) => (
									<SegmentComponent
										key={`backward-${index}`}
										segment={segment}
										index={index}
										hoveredSegment={hoveredSegment}
										setHoveredSegment={setHoveredSegment}
										clickedSegment={clickedSegment}
										setClickedSegment={setClickedSegment}
										direction="reverse"
										baseWidth={baseWidth}
										zoomLevel={zoomLevel}
										offset={offset}
									/>
								))}

							{/* Generator curves for this segment if it's highlighted */}
							{highlightedSegment &&
								backwardSegments.includes(highlightedSegment) &&
								(() => {
									const segmentGenerators = generators.filter((generator) => generator.segments.includes(highlightedSegment.id));
									if (segmentGenerators.length === 0) return null;

									const segmentCenter = 20 + highlightedSegment.start * nucleotideWidth + ((highlightedSegment.end - highlightedSegment.start + 1) * nucleotideWidth) / 2 - offset;

									// Calculate generator box positions
									const generatorBoxWidth = 200;
									const totalWidth = segmentGenerators.length * generatorBoxWidth + (segmentGenerators.length - 1) * 8;
									const halfWidth = totalWidth / 2;

									let adjustedLeft = segmentCenter;
									const padding = 16;
									if (segmentCenter - halfWidth < padding) {
										adjustedLeft = halfWidth + padding;
									} else if (segmentCenter + halfWidth > visibleWidth - padding) {
										adjustedLeft = visibleWidth - halfWidth - padding;
									}

									return (
										<svg
											className="absolute pointer-events-none z-20"
											style={{
												left: 0,
												top: "40px", // Below segment
												width: "100%",
												height: "120px",
												overflow: "visible",
											}}
										>
											{segmentGenerators.map((generator, idx, arr) => {
												const boxOffset = (idx - (arr.length - 1) / 2) * (generatorBoxWidth + 8);
												const boxCenterX = adjustedLeft + boxOffset;

												const startX = segmentCenter;
												const startY = 0; // Just below segment
												const endX = boxCenterX;
												const endY = 20; // Very short line

												// Use straight line if close to center, curve if offset
												const isOffset = Math.abs(startX - endX) > 10;

												if (isOffset) {
													const controlY = (startY + endY) / 2;
													return (
														<path
															key={`generator-curve-${idx}`}
															d={`M ${startX} ${startY} 
															C ${startX} ${controlY}, 
															${endX} ${controlY}, 
															${endX} ${endY}`}
															fill="none"
															stroke="oklch(55.4% 0.046 257.417)"
															strokeWidth="1.5"
															strokeDasharray="3, 3"
															className="stroke-dash-anim"
														/>
													);
												} else {
													return (
														<line
															key={`generator-line-${idx}`}
															x1={startX}
															y1={startY}
															x2={endX}
															y2={endY}
															stroke="oklch(55.4% 0.046 257.417)"
															strokeWidth="1.5"
															strokeDasharray="3, 3"
															className="stroke-dash-anim"
														/>
													);
												}
											})}
										</svg>
									);
								})()}
						</div>
					)}

					{/* Generators Segment - Below annotations */}
					<div className="relative h-40 w-full">
						{segments.map((segment) => {
							// Only show if this segment is hovered or clicked
							if (highlightedSegment?.id !== segment.id) return null;

							// Find all generators that apply to this segment
							const segmentGenerators = generators.filter((generator) => generator.segments.includes(segment.id));

							if (segmentGenerators.length === 0) return null;

							const segmentCenter = 20 + segment.start * nucleotideWidth + ((segment.end - segment.start + 1) * nucleotideWidth) / 2 - offset;

							// Skip if outside visible area
							if (segmentCenter < -100 || segmentCenter > visibleWidth + 100) return null;

							// Calculate total width of generator boxes (approximate)
							const generatorBoxWidth = 200; // Approximate width of each generator box
							const totalWidth = segmentGenerators.length * generatorBoxWidth + (segmentGenerators.length - 1) * 8; // 8px gap
							const halfWidth = totalWidth / 2;

							// Calculate adjusted position to keep boxes within container
							let adjustedLeft = segmentCenter;
							const padding = 16;
							if (segmentCenter - halfWidth < padding) {
								adjustedLeft = halfWidth + padding;
							} else if (segmentCenter + halfWidth > visibleWidth - padding) {
								adjustedLeft = visibleWidth - halfWidth - padding;
							}

							return (
								<div key={`segment-${segment.id}-generators`}>
									{/* Generator boxes */}
									<div
										className="absolute flex flex-row gap-2 items-start justify-center"
										style={{
											left: `${adjustedLeft}px`,
											top: "16px",
											transform: "translateX(-50%)",
										}}
									>
										{segmentGenerators.map((generator, idx) => (
											<div key={`generator-${idx}`} className="relative">
												<GeneratorBox generator={generator} />
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</div>{" "}
				{/* End of main content wrapper */}
			</div>

			{/* Sequence display when selection is made */}
			{selection && sequence && (
				<div className="absolute bottom-0 left-0 right-0 p-3 bg-slate-200 border-t border-slate-300">
					<div className="text-sm text-slate-500 mb-1">{`Position ${selection.start + 1} ${selection.start === selection.end ? "" : `- ${selection.end + 1}`} (${
						selection.end - selection.start + 1
					} bp)`}</div>
					<div className="font-mono text-sm break-all">
						{(() => {
							const safeSequence = sequence.length > sequenceLength ? sequence.substring(0, sequenceLength) : sequence;
							if (selection.start >= safeSequence.length) {
								return <span className="text-slate-400">No sequence data available for this region</span>;
							}
							const endPos = Math.min(selection.end + 1, safeSequence.length);
							return safeSequence.substring(selection.start, endPos);
						})()}
					</div>
				</div>
			)}
		</div>
	);
};

export default LinearViewer;
