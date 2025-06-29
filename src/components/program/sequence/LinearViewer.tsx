"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Sequence, Section } from "@/types";
import ConstraintBox from "./Constraint";
import GeneratorBox from "./Generator";

interface Selection {
	start: number;
	end: number;
}

interface SectionComponentProps {
	section: Section;
	index: number;
	hoveredSection: Section | null;
	setHoveredSection: (section: Section | null) => void;
	clickedSection: Section | null;
	setClickedSection: (section: Section | null) => void;
	direction: "forward" | "reverse";
	baseWidth: number;
	zoomLevel: number;
	offset: number;
}

const SectionComponent: React.FC<SectionComponentProps> = ({ section, index, hoveredSection, setHoveredSection, clickedSection, setClickedSection, direction, baseWidth, zoomLevel, offset }) => {
	const nucleotideWidth = baseWidth * zoomLevel;
	const sectionPixelWidth = (section.end - section.start + 1) * nucleotideWidth;
	const sectionLeft = 20 + section.start * nucleotideWidth - offset;
	const arrowWidth = 12;

	// get colors for the annotation
	const getColors = () => {
		if (section.color) return { fill: section.color, stroke: section.color };
		const colorMap = {
			CDS: { fill: "rgb(253 224 71 / 0.45)", stroke: "rgb(234 179 8 / 0.8)" }, // yellow
			promoter: { fill: "rgb(167 243 208 / 0.45)", stroke: "rgb(52 211 153 / 0.8)" }, // emerald
			terminator: { fill: "rgb(196 181 253 / 0.45)", stroke: "rgb(147 114 243 / 0.8)" }, // purple
			default: { fill: "rgb(165 180 252 / 0.45)", stroke: "rgb(129 140 248 / 0.8)" }, // indigo
		};
		return colorMap[section.type as keyof typeof colorMap] || colorMap.default;
	};

	const colors = getColors();
	const isHovered = hoveredSection === section;
	const isClicked = clickedSection === section;
	const isHighlighted = isClicked || (isHovered && !clickedSection);
	const shouldDim = (clickedSection || hoveredSection) && !isHighlighted;

	// direction-specific configurations
	const config = {
		forward: {
			polygonPoints: `0,2 ${sectionPixelWidth - arrowWidth},2 ${sectionPixelWidth},16 ${sectionPixelWidth - arrowWidth},30 0,30`,
			textAlign: "justify-start",
			paddingLeft: "8px",
			paddingRight: "16px",
		},
		reverse: {
			polygonPoints: `${arrowWidth},2 ${sectionPixelWidth},2 ${sectionPixelWidth},30 ${arrowWidth},30 0,16`,
			textAlign: "justify-end",
			paddingLeft: "16px",
			paddingRight: "8px",
		},
	};

	const currentConfig = config[direction];

	return (
		<div
			key={`${direction}-${index}`}
			data-section-component
			className={`group absolute transition-opacity duration-200 ${shouldDim ? "opacity-30" : "opacity-100"} cursor-pointer`}
			style={{
				left: `${sectionLeft}px`,
				width: `${sectionPixelWidth}px`,
				height: "32px",
				zIndex: isHighlighted ? 20 : 10,
			}}
			onMouseEnter={() => {
				if (!clickedSection) {
					setHoveredSection(section);
				}
			}}
			onMouseLeave={() => {
				if (!clickedSection) {
					setHoveredSection(null);
				}
			}}
			onClick={(e) => {
				e.stopPropagation();
				setClickedSection(section);
				setHoveredSection(null);
			}}
		>
			<svg width="100%" height="32" viewBox={`0 0 ${sectionPixelWidth} 32`} preserveAspectRatio="none" className="overflow-visible backdrop-blur-[2px]">
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
					{section.label || "Section"} <span className={`ml-1 font-mono font-normal ${isHighlighted ? "text-slate-100" : "text-slate-400"}`}>{section.end - section.start + 1}</span>
				</span>
			</div>
		</div>
	);
};

const LinearViewer: React.FC<Sequence> = ({ length, sequence, sections = [], constraints = [], generators = [] }) => {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [hoveredSection, setHoveredSection] = useState<Section | null>(null);
	const [clickedSection, setClickedSection] = useState<Section | null>(null);
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
		const isClickingSection = target.closest("[data-section-component]") !== null;

		if (!isClickingSection) {
			setClickedSection(null);
			setHoveredSection(null);
		}
		if (isClickingSection) {
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
		// Only clear hover if no section is clicked
		if (!clickedSection) {
			setHoveredSection(null);
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

	// click outside the component to clear selection and clicked section
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// Check if the click is within the container
			if (containerRef.current) {
				const target = event.target as HTMLElement;
				const isInContainer = containerRef.current.contains(target);

				if (!isInContainer) {
					// Click is completely outside the viewer
					setSelection(null);
					setClickedSection(null);
					setHoveredSection(null);
				} else if (isInContainer && !target.closest("[data-section-component]")) {
					// Click is inside viewer but not on a section
					setSelection(null);
					setClickedSection(null);
					setHoveredSection(null);
				}
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
	const rulerMarks = [];
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

	const forwardSections = sections.filter((section) => section.direction === "forward" || !section.direction);
	const backwardSections = sections.filter((section) => section.direction === "reverse");

	// Get constraints and generators for highlighted section
	// Prioritize clicked section over hovered section
	const highlightedSection = clickedSection || hoveredSection;

	return (
		<div className="w-full h-full">
			{/* Main viewer container */}
			<div
				ref={containerRef}
				className="flex flex-col h-full select-none justify-center overflow-hidden relative"
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
						className="absolute top-0 bottom-0 w-px bg-slate-400 pointer-events-none z-40"
						style={{
							left: `${20 + hoveredPosition * nucleotideWidth - offset + nucleotideWidth / 2}px`,
							transform: "translateX(-50%)",
						}}
					/>
				)}

				{/* Constraints Section - Above sequence */}
				<div className="relative h-40 w-full">
					{sections.map((section) => {
						// Only show if this section is hovered or clicked
						if (highlightedSection?.id !== section.id) return null;

						// Find all constraints that apply to this section
						const sectionConstraints = constraints.filter((constraint) => constraint.sections.includes(section.id));

						if (sectionConstraints.length === 0) return null;

						const sectionCenter = 20 + section.start * nucleotideWidth + ((section.end - section.start + 1) * nucleotideWidth) / 2 - offset;

						// Skip if outside visible area
						if (sectionCenter < -100 || sectionCenter > visibleWidth + 100) return null;

						// Calculate total width of constraint boxes (approximate)
						const constraintBoxWidth = 180; // Approximate width of each constraint box
						const totalWidth = sectionConstraints.length * constraintBoxWidth + (sectionConstraints.length - 1) * 8; // 8px gap
						const halfWidth = totalWidth / 2;

						// Calculate adjusted position to keep boxes within container
						let adjustedLeft = sectionCenter;
						const padding = 16;
						if (sectionCenter - halfWidth < padding) {
							adjustedLeft = halfWidth + padding;
						} else if (sectionCenter + halfWidth > visibleWidth - padding) {
							adjustedLeft = visibleWidth - halfWidth - padding;
						}

						return (
							<div key={`section-${section.id}-constraints`}>
								{/* Constraint boxes */}
								<div
									className="absolute flex flex-row gap-2 items-end justify-center"
									style={{
										left: `${adjustedLeft}px`,
										bottom: "16px",
										transform: "translateX(-50%)",
									}}
								>
									{sectionConstraints.map((constraint, idx) => (
										<div key={`constraint-${idx}`} className="relative">
											<ConstraintBox constraint={constraint} />
										</div>
									))}
								</div>
							</div>
						);
					})}
				</div>

				{/* Sequence + Ruler Section */}
				<div className="relative h-16 w-full">
					{/* Single sequence line */}
					<div
						className="absolute top-2 h-5 border-x-4 border-slate-400 bg-slate-300"
						style={{
							left: `${20 - offset}px`,
							width: `${sequenceLength * nucleotideWidth}px`,
						}}
					/>

					{/* Annotation hover highlight overlay */}
					{highlightedSection && (
						<div
							className="absolute h-5 bg-slate-500 opacity-70 pointer-events-none transition-all duration-300"
							style={{
								left: `${20 + highlightedSection.start * nucleotideWidth - offset}px`,
								width: `${(highlightedSection.end - highlightedSection.start + 1) * nucleotideWidth}px`,
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

					{/* Ruler */}
					<div className="absolute w-full top-7">
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
					</div>

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

					{/* Hover tooltip showing sequence */}
					{hoveredPosition !== null && (
						<Tooltip open={true}>
							<TooltipTrigger asChild>
								<div
									className="absolute w-1 h-full pointer-events-none"
									style={{
										left: `${20 + hoveredPosition * nucleotideWidth - offset + nucleotideWidth / 2}px`,
										transform: "translateX(-50%)",
									}}
								/>
							</TooltipTrigger>
							<TooltipContent side="top" className="vertical border-slate-400/60 gap-1 justify-center items-center translate-y-0 !bg-white/40 !backdrop-blur-xs p-1">
								<div className="font-mono text-center text-slate-500/70">{hoveredPosition + 1}</div>
								{sequence && (
									<div className="flex">
										{(() => {
											// handle sequence length mismatches
											const safeSequence = sequence.length > sequenceLength ? sequence.substring(0, sequenceLength) : sequence;
											const windowStart = Math.max(0, hoveredPosition - 4);
											const windowEnd = Math.min(sequenceLength, hoveredPosition + 5);
											const windowArray = [];
											for (let i = windowStart; i < windowEnd; i++) {
												if (i < safeSequence.length) {
													windowArray.push(safeSequence[i]);
												} else {
													windowArray.push("·");
												}
											}

											// TODO: for the very start and end of a sequence the gradient shouldn't be focused in the middle since the focused nucleotide is not in the middle!
											return windowArray.map((letter, index) => {
												const isCenter = windowStart + index === hoveredPosition;
												return (
													<span
														key={index}
														className={`text-slate-500`}
														style={{
															opacity: isCenter ? 1 : Math.max(0.1, 1 - Math.abs(index - (windowArray.length - 1) / 2) / ((windowArray.length - 1) / 2)),
														}}
													>
														{letter}
													</span>
												);
											});
										})()}
									</div>
								)}
							</TooltipContent>
						</Tooltip>
					)}
				</div>

				{/* Forward Annotations Section */}
				{forwardSections.length > 0 && (
					<div className="relative h-10 w-full overflow-visible">
						{forwardSections
							.filter((section) => {
								const sectionLeft = 20 + section.start * nucleotideWidth - offset;
								const sectionWidth = (section.end - section.start + 1) * nucleotideWidth;
								return sectionLeft + sectionWidth >= 0 && sectionLeft <= visibleWidth;
							})
							.map((section, index) => (
								<SectionComponent
									key={`forward-${index}`}
									section={section}
									index={index}
									hoveredSection={hoveredSection}
									setHoveredSection={setHoveredSection}
									clickedSection={clickedSection}
									setClickedSection={setClickedSection}
									direction="forward"
									baseWidth={baseWidth}
									zoomLevel={zoomLevel}
									offset={offset}
								/>
							))}

						{/* Constraint curves for this section if it's highlighted */}
						{highlightedSection &&
							forwardSections.includes(highlightedSection) &&
							(() => {
								const sectionConstraints = constraints.filter((constraint) => constraint.sections.includes(highlightedSection.id));
								if (sectionConstraints.length === 0) return null;

								const sectionCenter = 20 + highlightedSection.start * nucleotideWidth + ((highlightedSection.end - highlightedSection.start + 1) * nucleotideWidth) / 2 - offset;

								// Calculate constraint box positions
								const constraintBoxWidth = 200;
								const totalWidth = sectionConstraints.length * constraintBoxWidth + (sectionConstraints.length - 1) * 8;
								const halfWidth = totalWidth / 2;

								let adjustedLeft = sectionCenter;
								const padding = 16;
								if (sectionCenter - halfWidth < padding) {
									adjustedLeft = halfWidth + padding;
								} else if (sectionCenter + halfWidth > visibleWidth - padding) {
									adjustedLeft = visibleWidth - halfWidth - padding;
								}

								return (
									<svg
										className="absolute pointer-events-none z-20"
										style={{
											left: 0,
											top: "-140px", // Position in the gap between constraints and section
											width: "100%",
											height: "140px",
											overflow: "visible",
										}}
									>
										{sectionConstraints.map((constraint, idx, arr) => {
											const boxOffset = (idx - (arr.length - 1) / 2) * (constraintBoxWidth + 8);
											const boxCenterX = adjustedLeft + boxOffset;
											const startX = boxCenterX;
											const startY = 60; // config: top space to constraint box
											const endX = sectionCenter;
											const endY = 142; // config: bottom space to section
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
														stroke="rgb(148 163 184)"
														strokeWidth="1"
														strokeDasharray="2,2"
													/>
												);
											} else {
												return (
													<line key={`constraint-line-${idx}`} x1={startX} y1={startY} x2={endX} y2={endY} stroke="rgb(148 163 184)" strokeWidth="1" strokeDasharray="2,2" />
												);
											}
										})}
									</svg>
								);
							})()}

						{/* Generator curves for forward sections if highlighted */}
						{highlightedSection &&
							forwardSections.includes(highlightedSection) &&
							(() => {
								const sectionGenerators = generators.filter((generator) => generator.sections.includes(highlightedSection.id));
								if (sectionGenerators.length === 0) return null;

								const sectionCenter = 20 + highlightedSection.start * nucleotideWidth + ((highlightedSection.end - highlightedSection.start + 1) * nucleotideWidth) / 2 - offset;

								// Calculate generator box positions
								const generatorBoxWidth = 180;
								const totalWidth = sectionGenerators.length * generatorBoxWidth + (sectionGenerators.length - 1) * 8;
								const halfWidth = totalWidth / 2;

								let adjustedLeft = sectionCenter;
								const padding = 16;
								if (sectionCenter - halfWidth < padding) {
									adjustedLeft = halfWidth + padding;
								} else if (sectionCenter + halfWidth > visibleWidth - padding) {
									adjustedLeft = visibleWidth - halfWidth - padding;
								}

								return (
									<svg
										className="absolute pointer-events-none z-20"
										style={{
											left: 0,
											top: "30px", // config: top space to section
											width: "100%",
											height: "120px",
											overflow: "visible",
										}}
									>
										{sectionGenerators.map((generator, idx, arr) => {
											const boxOffset = (idx - (arr.length - 1) / 2) * (generatorBoxWidth + 8);
											const boxCenterX = adjustedLeft + boxOffset;

											const startX = sectionCenter;
											const startY = 0; // Just below section
											const endX = boxCenterX;
											const endY = 28;

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
														stroke="rgb(148 163 184)"
														strokeWidth="1"
														strokeDasharray="2,2"
													/>
												);
											} else {
												return (
													<line key={`generator-line-${idx}`} x1={startX} y1={startY} x2={endX} y2={endY} stroke="rgb(148 163 184)" strokeWidth="1" strokeDasharray="2,2" />
												);
											}
										})}
									</svg>
								);
							})()}
					</div>
				)}

				{/* Backward Annotations Section */}
				{backwardSections.length > 0 && (
					<div className="relative h-10 w-full overflow-visible">
						{backwardSections
							.filter((section) => {
								const sectionLeft = 20 + section.start * nucleotideWidth - offset;
								const sectionWidth = (section.end - section.start + 1) * nucleotideWidth;
								return sectionLeft + sectionWidth >= 0 && sectionLeft <= visibleWidth;
							})
							.map((section, index) => (
								<SectionComponent
									key={`backward-${index}`}
									section={section}
									index={index}
									hoveredSection={hoveredSection}
									setHoveredSection={setHoveredSection}
									clickedSection={clickedSection}
									setClickedSection={setClickedSection}
									direction="reverse"
									baseWidth={baseWidth}
									zoomLevel={zoomLevel}
									offset={offset}
								/>
							))}

						{/* Generator curves for this section if it's highlighted */}
						{highlightedSection &&
							backwardSections.includes(highlightedSection) &&
							(() => {
								const sectionGenerators = generators.filter((generator) => generator.sections.includes(highlightedSection.id));
								if (sectionGenerators.length === 0) return null;

								const sectionCenter = 20 + highlightedSection.start * nucleotideWidth + ((highlightedSection.end - highlightedSection.start + 1) * nucleotideWidth) / 2 - offset;

								// Calculate generator box positions
								const generatorBoxWidth = 200;
								const totalWidth = sectionGenerators.length * generatorBoxWidth + (sectionGenerators.length - 1) * 8;
								const halfWidth = totalWidth / 2;

								let adjustedLeft = sectionCenter;
								const padding = 16;
								if (sectionCenter - halfWidth < padding) {
									adjustedLeft = halfWidth + padding;
								} else if (sectionCenter + halfWidth > visibleWidth - padding) {
									adjustedLeft = visibleWidth - halfWidth - padding;
								}

								return (
									<svg
										className="absolute pointer-events-none z-20"
										style={{
											left: 0,
											top: "40px", // Below section
											width: "100%",
											height: "120px",
											overflow: "visible",
										}}
									>
										{sectionGenerators.map((generator, idx, arr) => {
											const boxOffset = (idx - (arr.length - 1) / 2) * (generatorBoxWidth + 8);
											const boxCenterX = adjustedLeft + boxOffset;

											const startX = sectionCenter;
											const startY = 0; // Just below section
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
														stroke="rgb(148 163 184)"
														strokeWidth="1"
														strokeDasharray="2,2"
													/>
												);
											} else {
												return (
													<line key={`generator-line-${idx}`} x1={startX} y1={startY} x2={endX} y2={endY} stroke="rgb(148 163 184)" strokeWidth="1" strokeDasharray="2,2" />
												);
											}
										})}
									</svg>
								);
							})()}
					</div>
				)}

				{/* Generators Section - Below annotations */}
				<div className="relative h-40 w-full">
					{sections.map((section) => {
						// Only show if this section is hovered or clicked
						if (highlightedSection?.id !== section.id) return null;

						// Find all generators that apply to this section
						const sectionGenerators = generators.filter((generator) => generator.sections.includes(section.id));

						if (sectionGenerators.length === 0) return null;

						const sectionCenter = 20 + section.start * nucleotideWidth + ((section.end - section.start + 1) * nucleotideWidth) / 2 - offset;

						// Skip if outside visible area
						if (sectionCenter < -100 || sectionCenter > visibleWidth + 100) return null;

						// Calculate total width of generator boxes (approximate)
						const generatorBoxWidth = 200; // Approximate width of each generator box
						const totalWidth = sectionGenerators.length * generatorBoxWidth + (sectionGenerators.length - 1) * 8; // 8px gap
						const halfWidth = totalWidth / 2;

						// Calculate adjusted position to keep boxes within container
						let adjustedLeft = sectionCenter;
						const padding = 16;
						if (sectionCenter - halfWidth < padding) {
							adjustedLeft = halfWidth + padding;
						} else if (sectionCenter + halfWidth > visibleWidth - padding) {
							adjustedLeft = visibleWidth - halfWidth - padding;
						}

						return (
							<div key={`section-${section.id}-generators`}>
								{/* Generator boxes */}
								<div
									className="absolute flex flex-row gap-2 items-start justify-center"
									style={{
										left: `${adjustedLeft}px`,
										top: "16px",
										transform: "translateX(-50%)",
									}}
								>
									{sectionGenerators.map((generator, idx) => (
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

			{/* Sequence display when selection is made */}
			{/* {selection && sequence && (
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
			)} */}
		</div>
	);
};

export default LinearViewer;
