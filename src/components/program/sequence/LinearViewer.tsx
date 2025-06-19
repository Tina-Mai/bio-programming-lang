"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Section } from "@/types";

interface Selection {
	start: number;
	end: number;
}

// TODO: sequences can have optional positions (?) in case some parts are not generated or are generated separately?
interface LinearViewerProps {
	length: number;
	sequence?: string;
	sections?: Section[];
}

interface SectionComponentProps {
	section: Section;
	index: number;
	hoveredSection: Section | null;
	setHoveredSection: (section: Section | null) => void;
	direction: "forward" | "reverse";
	baseWidth: number;
	zoomLevel: number;
	offset: number;
}

const SectionComponent: React.FC<SectionComponentProps> = ({ section, index, hoveredSection, setHoveredSection, direction, baseWidth, zoomLevel, offset }) => {
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
	const shouldDim = hoveredSection && !isHovered;

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
			className={`group absolute transition-opacity duration-200 ${shouldDim ? "opacity-30" : "opacity-100"} cursor-pointer`}
			style={{
				left: `${sectionLeft}px`,
				width: `${sectionPixelWidth}px`,
				height: "32px",
				zIndex: isHovered ? 20 : 10,
			}}
			onMouseEnter={() => setHoveredSection(section)}
			onMouseLeave={() => setHoveredSection(null)}
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
					className={`${hoveredSection === section ? "text-white backdrop-blur rounded-xs px-1 text-nowrap" : "truncate"} transition-all duration-300`}
					style={{ backgroundColor: hoveredSection === section ? colors.stroke : "transparent" }}
				>
					{section.text} <span className={`ml-1 font-mono font-normal ${hoveredSection === section ? "text-slate-100" : "text-slate-400"}`}>{section.end - section.start + 1}</span>
				</span>
			</div>
		</div>
	);
};

const LinearViewer: React.FC<LinearViewerProps> = ({ length, sequence, sections = [] }) => {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [hoveredSection, setHoveredSection] = useState<Section | null>(null);
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

	// click outside the component to clear selection
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setSelection(null);
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
					{hoveredSection && (
						<div
							className="absolute h-5 bg-slate-500 opacity-70 pointer-events-none transition-all duration-300"
							style={{
								left: `${20 + hoveredSection.start * nucleotideWidth - offset}px`,
								width: `${(hoveredSection.end - hoveredSection.start + 1) * nucleotideWidth}px`,
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
							<TooltipContent side="top" className="vertical gap-1 justify-center items-center translate-y-0 !bg-white/40 !backdrop-blur-xs p-1">
								<div className="font-mono text-center text-slate-400">{hoveredPosition + 1}</div>
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
					<div className="relative h-10 w-full overflow-hidden">
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
									direction="forward"
									baseWidth={baseWidth}
									zoomLevel={zoomLevel}
									offset={offset}
								/>
							))}
					</div>
				)}

				{/* Backward Annotations Section */}
				{backwardSections.length > 0 && (
					<div className="relative h-10 w-full overflow-hidden">
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
									direction="reverse"
									baseWidth={baseWidth}
									zoomLevel={zoomLevel}
									offset={offset}
								/>
							))}
					</div>
				)}
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
