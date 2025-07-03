"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Construct, Segment } from "@/types";
import ConstraintBox from "./Constraint";
import GeneratorBox from "./Generator";

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
}

const SegmentComponent: React.FC<SegmentComponentProps> = ({ segment, index, hoveredSegment, setHoveredSegment, clickedSegment, setClickedSegment, baseWidth, zoomLevel, offset, position }) => {
	const nucleotideWidth = baseWidth * zoomLevel;
	const segmentLength = segment.length;
	const segmentPixelWidth = segmentLength * nucleotideWidth;
	const segmentLeft = 20 + position * nucleotideWidth - offset;
	const arrowWidth = 12;

	// get colors for the annotation
	const getColors = () => {
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

	// segment arrow configuration
	const polygonPoints = `0,2 ${segmentPixelWidth - arrowWidth},2 ${segmentPixelWidth},16 ${segmentPixelWidth - arrowWidth},30 0,30`;

	return (
		<div
			key={`segment-${index}`}
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
			<svg width="100%" height="32" viewBox={`0 0 ${segmentPixelWidth} 32`} preserveAspectRatio="none" className="overflow-visible">
				<polygon points={polygonPoints} fill={colors.fill} stroke={colors.stroke} strokeWidth="1" />
			</svg>
			<div
				className={`absolute inset-0 flex items-center text-slate-950/70 text-xs font-medium justify-start`}
				style={{
					paddingLeft: "8px",
					paddingRight: "16px",
				}}
			>
				<span
					className={`${isHighlighted ? "text-white backdrop-blur rounded-xs px-1 text-nowrap" : "truncate"} transition-all duration-300`}
					style={{ backgroundColor: isHighlighted ? colors.stroke : "transparent" }}
				>
					{segment.label || "Segment"} <span className={`ml-1 font-mono font-normal ${isHighlighted ? "text-slate-100" : "text-slate-400"}`}>{segmentLength}</span>
				</span>
			</div>
		</div>
	);
};

const LinearViewer: React.FC<Construct> = ({ segments = [], constraints = [], generators = [] }) => {
	const [hoveredSegment, setHoveredSegment] = useState<Segment | null>(null);
	const [clickedSegment, setClickedSegment] = useState<Segment | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [zoomLevel, setZoomLevel] = useState<number>(1);
	const [targetZoomLevel, setTargetZoomLevel] = useState<number>(1);
	const [offset, setOffset] = useState<number>(0);
	const [targetOffset, setTargetOffset] = useState<number>(0);
	const [isHovering, setIsHovering] = useState<boolean>(false);
	const [isPanning, setIsPanning] = useState<boolean>(false);
	const [lastMouseX, setLastMouseX] = useState<number>(0);
	const [visibleWidth, setVisibleWidth] = useState<number>(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const baseWidth = 10.1; // base nucleotide width at zoom level 1
	const nucleotideWidth = baseWidth * zoomLevel;

	// Calculate total length from all segments
	const actualTotalLength = segments.reduce((acc, segment) => acc + segment.length, 0);
	const totalLength = Math.max(100, actualTotalLength); // Minimum ruler length of 100

	// update visible width from container
	const updateVisibleWidth = useCallback(() => {
		if (containerRef.current) {
			setVisibleWidth(containerRef.current.clientWidth);
		}
	}, []);

	// calculate position from mouse event
	const getPositionFromEvent = (e: React.MouseEvent | MouseEvent) => {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const adjustedX = x - 20;
		const position = Math.floor((adjustedX + offset) / nucleotideWidth);
		return Math.max(0, Math.min(totalLength, position));
	};

	// calculate minimum zoom level to fit entire sequence in container
	const calculateMinZoomLevel = useCallback(() => {
		const container = containerRef.current;
		if (!container || !totalLength) return 0.1;
		const availableWidth = container.clientWidth - 40;
		return Math.max(0.1, availableWidth / (totalLength * baseWidth));
	}, [totalLength, baseWidth]);

	// animate zoom level and offset
	useEffect(() => {
		setZoomLevel(targetZoomLevel);
		setOffset(targetOffset);
	}, [targetZoomLevel, targetOffset]);

	// handle scrolling and zooming
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			if (!isHovering) return;

			e.preventDefault();

			if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				const scrollAmount = e.deltaX || e.deltaY;
				const totalContentWidth = totalLength * nucleotideWidth + 40;
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
			const totalCurrentContentWidth = totalLength * nucleotideWidth + 40;
			const cursorRatio = cursorXRelativeToContent / totalCurrentContentWidth;
			const newContentWidth = totalLength * baseWidth * newZoomLevel + 40;
			const newOffset = cursorRatio * newContentWidth - cursorXRelativeToViewport;
			const clampedNewOffset = Math.max(0, Math.min(newContentWidth - visibleWidth, newOffset));

			setTargetZoomLevel(newZoomLevel);
			setTargetOffset(clampedNewOffset);
		},
		[isHovering, zoomLevel, offset, totalLength, nucleotideWidth, baseWidth, visibleWidth, calculateMinZoomLevel]
	);

	// handle mouse events for panning
	const handleMouseDown = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const isClickingSegment = target.closest("[data-segment-component]") !== null;

		if (!isClickingSegment) {
			setClickedSegment(null);
			setHoveredSegment(null);
		}

		if (!isClickingSegment && isHovering) {
			setIsPanning(true);
			setLastMouseX(e.clientX);
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (isPanning) {
			const deltaX = e.clientX - lastMouseX;
			const totalContentWidth = totalLength * nucleotideWidth + 40;
			const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, offset - deltaX));
			setOffset(newOffset);
			setTargetOffset(newOffset);
			setLastMouseX(e.clientX);
			return;
		}

		const position = getPositionFromEvent(e);
		if (position !== null) {
			setHoveredPosition(position);
		}
	};

	const handleMouseUp = () => {
		setIsPanning(false);
	};

	const handleMouseLeave = () => {
		setHoveredPosition(null);
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
				const totalContentWidth = totalLength * nucleotideWidth + 40;
				const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, offset - deltaX));
				setOffset(newOffset);
				setTargetOffset(newOffset);
				setLastMouseX(e.clientX);
			}
		};

		const handleGlobalMouseUp = () => {
			setIsPanning(false);
		};

		if (isPanning) {
			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleGlobalMouseMove);
			document.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [isPanning, lastMouseX, offset, totalLength, nucleotideWidth, visibleWidth]);

	// click outside the component to clear clicked segment
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
		if (zoom >= 5) return 1;
		if (zoom >= 2.5) return 2;
		if (zoom >= 1.2) return 5;
		if (zoom >= 0.6) return 10;
		if (zoom >= 0.3) return 20;
		if (zoom >= 0.15) return 50;
		if (zoom >= 0.06) return 100;
		if (zoom >= 0.03) return 200;
		if (zoom >= 0.015) return 500;
		return 1000;
	};

	const rulerInterval = calculateRulerInterval(zoomLevel);

	// generate ruler marks based on visible area
	const rulerMarks: number[] = [];
	const startIndex = Math.floor(offset / nucleotideWidth);
	const endIndex = Math.ceil((offset + visibleWidth) / nucleotideWidth);
	const firstBpInView = Math.max(0, startIndex);
	const lastBpInView = Math.min(totalLength, endIndex);

	// Always include 0 if it's in view
	if (firstBpInView <= 0) {
		rulerMarks.push(0);
	}

	// Start from the first multiple of rulerInterval that's greater than firstBpInView
	const firstMultiple = Math.ceil((firstBpInView + 1) / rulerInterval) * rulerInterval;
	for (let bp = firstMultiple; bp <= lastBpInView; bp += rulerInterval) {
		if (bp !== 0) {
			// Avoid duplicating 0
			rulerMarks.push(bp);
		}
	}

	// Calculate segment positions - segments are connected in order
	const segmentPositions = new Map<string, number>();
	let currentPosition = 0;
	segments.forEach((segment) => {
		segmentPositions.set(segment.id, currentPosition);
		currentPosition += segment.length;
	});

	// Get constraints and generators for highlighted segment
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
					cursor: isPanning ? "grabbing" : "grab",
					touchAction: "none",
				}}
			>
				{/* Hover line and tooltip */}
				{hoveredPosition !== null && (
					<div
						className="absolute top-0 bottom-0 pointer-events-none z-40"
						style={{
							left: `${20 + hoveredPosition * nucleotideWidth - offset}px`,
						}}
					>
						{/* Vertical tracking line with dots */}
						<div className="absolute top-0 size-1 bg-slate-400" style={{ left: "-1.5px" }} />
						<div className="absolute top-0 bottom-0 w-px bg-slate-400/60" />

						{/* Position tooltip */}
						<Tooltip open={true}>
							<TooltipTrigger asChild>
								<div
									className="absolute w-1 h-8"
									style={{
										top: 0,
										left: "-1.5px",
									}}
								/>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={8} className="gap-1 justify-center items-center translate-y-8.5 border-0 !bg-slate-400 py-0 px-[2.5px] !shadow-none !rounded-xs">
								<div className="font-mono text-center text-white">{hoveredPosition}</div>
							</TooltipContent>
						</Tooltip>
					</div>
				)}

				{/* Vertical grid lines at ruler positions */}
				{rulerMarks.map((mark) => {
					const leftEdge = 20 + mark * nucleotideWidth - offset;

					if (leftEdge < -50 || leftEdge > visibleWidth + 50) return null;
					return (
						<div
							key={`grid-${mark}`}
							className="absolute top-0 bottom-0 w-px border-l border-dotted border-slate-300/70 pointer-events-none"
							style={{
								left: `${leftEdge}px`,
							}}
						/>
					);
				})}

				{/* Ruler - At the top */}
				<div className="absolute top-0 left-0 right-0 h-8 w-full z-30">
					<div className="absolute w-full top-0">
						{/* Main ruler marks */}
						{rulerMarks.map((mark) => {
							const leftEdge = 20 + mark * nucleotideWidth - offset;

							if (leftEdge < -50 || leftEdge > visibleWidth + 50) return null;
							return (
								<div key={mark} className="absolute" style={{ left: `${leftEdge}px` }}>
									<div className="h-2 w-px bg-slate-400" />
									<div className="font-mono text-[10px] text-slate-500 mt-0.5" style={{ transform: "translateX(-50%)" }}>
										{mark}
									</div>
								</div>
							);
						})}

						{/* Intermediate ruler marks - only show if interval > 1 */}
						{rulerInterval > 1 &&
							rulerMarks.map((mark, index) => {
								if (index === 0) return null;

								const prevMark = rulerMarks[index - 1];
								const midPoint = prevMark + Math.floor((mark - prevMark) / 2);
								const leftEdge = 20 + midPoint * nucleotideWidth - offset;

								if (leftEdge < -50 || leftEdge > visibleWidth + 50) return null;
								return (
									<div key={`mid-${prevMark}-${mark}`} className="absolute" style={{ left: `${leftEdge}px` }}>
										<div className="h-1.5 w-px bg-slate-400/70" />
									</div>
								);
							})}
					</div>
				</div>

				{/* Main content wrapper - centered */}
				<div className="flex flex-col justify-center flex-1 pt-8">
					{/* Constraints Segment - Above segments */}
					<div className="relative h-40 w-full">
						{segments.map((segment) => {
							// Only show if this segment is hovered or clicked
							if (highlightedSegment?.id !== segment.id) return null;

							// Find all constraints that apply to this segment
							const segmentConstraints = constraints.filter((constraint) => constraint.segments.includes(segment.id));

							if (segmentConstraints.length === 0) return null;

							const segmentPosition = segmentPositions.get(segment.id) || 0;
							const segmentLength = segment.length;
							const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;

							// Skip if outside visible area
							if (segmentCenter < -100 || segmentCenter > visibleWidth + 100) return null;

							// Calculate total width of constraint boxes
							const constraintBoxWidth = 180;
							const totalWidth = segmentConstraints.length * constraintBoxWidth + (segmentConstraints.length - 1) * 8;
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
											bottom: "75px", // config: how high up the constraint boxes are
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

					{/* Segments */}
					{segments.length > 0 && (
						<div className="relative h-10 w-full overflow-visible">
							{segments
								.filter((segment) => {
									const segmentPosition = segmentPositions.get(segment.id) || 0;
									const segmentLength = segment.length;
									const segmentLeft = 20 + segmentPosition * nucleotideWidth - offset;
									const segmentWidth = segmentLength * nucleotideWidth;
									return segmentLeft + segmentWidth >= 0 && segmentLeft <= visibleWidth;
								})
								.map((segment, index) => (
									<SegmentComponent
										key={`segment-${index}`}
										segment={segment}
										index={index}
										hoveredSegment={hoveredSegment}
										setHoveredSegment={setHoveredSegment}
										clickedSegment={clickedSegment}
										setClickedSegment={setClickedSegment}
										baseWidth={baseWidth}
										zoomLevel={zoomLevel}
										offset={offset}
										position={segmentPositions.get(segment.id) || 0}
									/>
								))}

							{/* Constraint curves */}
							{highlightedSegment &&
								segments.includes(highlightedSegment) &&
								(() => {
									const segmentConstraints = constraints.filter((constraint) => constraint.segments.includes(highlightedSegment.id));
									if (segmentConstraints.length === 0) return null;

									const segmentPosition = segmentPositions.get(highlightedSegment.id) || 0;
									const segmentLength = highlightedSegment.length;
									const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;

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
												const startY = 65;
												const endX = segmentCenter;
												const endY = 142;
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

							{/* Generator curves */}
							{highlightedSegment &&
								segments.includes(highlightedSegment) &&
								(() => {
									const segmentGenerators = generators.filter((generator) => generator.segments.includes(highlightedSegment.id));
									if (segmentGenerators.length === 0) return null;

									const segmentPosition = segmentPositions.get(highlightedSegment.id) || 0;
									const segmentLength = highlightedSegment.length;
									const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;

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
												top: "30px",
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
												const endY = 27;
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

					{/* Generators Segment - Below segments */}
					<div className="relative h-40 w-full">
						{segments.map((segment) => {
							// Only show if this segment is hovered or clicked
							if (highlightedSegment?.id !== segment.id) return null;

							// Find all generators that apply to this segment
							const segmentGenerators = generators.filter((generator) => generator.segments.includes(segment.id));

							if (segmentGenerators.length === 0) return null;

							const segmentPosition = segmentPositions.get(segment.id) || 0;
							const segmentLength = segment.length;
							const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;

							// Skip if outside visible area
							if (segmentCenter < -100 || segmentCenter > visibleWidth + 100) return null;

							// Calculate total width of generator boxes
							const generatorBoxWidth = 200;
							const totalWidth = segmentGenerators.length * generatorBoxWidth + (segmentGenerators.length - 1) * 8;
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
				</div>
			</div>
		</div>
	);
};

export default LinearViewer;
