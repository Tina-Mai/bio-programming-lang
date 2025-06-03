"use client";
import React, { useState, useRef, useEffect } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface Annotation {
	text: string;
	type: string;
	direction: "forward" | "reverse";
	start: number;
	end: number;
	color?: string;
}

interface Selection {
	start: number;
	end: number;
}

interface LinearViewerProps {
	sequence: string;
	annotations?: Annotation[];
}

const LinearViewer: React.FC<LinearViewerProps> = ({ sequence, annotations = [] }) => {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const sequenceLength = sequence.length;

	// calculate dynamic ruler interval
	const calculateRulerInterval = (length: number): number => {
		if (length <= 50) return 5;
		if (length <= 100) return 10;
		if (length <= 200) return 20;
		if (length <= 500) return 50;
		if (length <= 1000) return 100;
		if (length <= 2000) return 200;
		if (length <= 5000) return 500;
		if (length <= 10000) return 1000;
		if (length <= 20000) return 2000;
		if (length <= 50000) return 5000;
		if (length <= 10000) return 1000;
		return Math.max(1, Math.pow(10, Math.floor(Math.log10(length / 10)))); // Fallback for very large sequences
	};

	const rulerInterval = calculateRulerInterval(sequenceLength);

	// calculate position from mouse event
	const getPositionFromEvent = (e: React.MouseEvent | MouseEvent) => {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const position = Math.floor((x / rect.width) * sequenceLength);
		return Math.max(0, Math.min(sequenceLength - 1, position));
	};

	// handle mouse events for selection
	const handleMouseDown = (e: React.MouseEvent) => {
		const position = getPositionFromEvent(e);
		if (position !== null) {
			setIsDragging(true);
			setSelection({ start: position, end: position });
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
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
	};

	const handleMouseLeave = () => {
		setHoveredPosition(null);
		setIsDragging(false);
	};

	// Global mouse events for dragging outside container
	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
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
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleGlobalMouseMove);
			document.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [isDragging, selection, getPositionFromEvent]);

	// generate ruler marks
	const rulerMarks = [];
	for (let i = 0; i <= sequenceLength; i += rulerInterval) {
		rulerMarks.push(i);
	}
	// ensure the last mark is always the sequence length if it's not already included and close to it
	if (sequenceLength % rulerInterval !== 0 && sequenceLength > 0) {
		if (rulerMarks.length === 0 || rulerMarks[rulerMarks.length - 1] < sequenceLength) {
			if (!rulerMarks.length || sequenceLength - rulerMarks[rulerMarks.length - 1] > rulerInterval / 2) {
				rulerMarks.push(sequenceLength);
			}
		}
	}

	return (
		<div className="w-full">
			{/* Ruler */}
			<div className="relative h-8 mb-4 border-b-2 border-slate-300">
				{rulerMarks.map((mark) => (
					<div key={mark} className="absolute flex flex-col items-center" style={{ left: `${(mark / sequenceLength) * 100}%` }}>
						<div className="h-2 w-px bg-slate-400" />
						<span className="font-mono text-[10px] text-slate-500 mt-0.5">{mark}</span>
					</div>
				))}
			</div>

			{/* Main viewer container */}
			<div
				ref={containerRef}
				className="relative cursor-crosshair select-none"
				style={{ height: "175px" }}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
			>
				{/* Sequence line */}
				<div className="absolute top-1/2 w-full h-3 bg-slate-300 dark:bg-slate-700 transform -translate-y-1/2" />

				{/* Annotations */}
				{annotations.map((annotation, index) => {
					const annotationWidth = ((annotation.end - annotation.start + 1) / sequenceLength) * 100;
					// Calculate approximate pixel width based on typical container width
					const estimatedPixelWidth = Math.max(40, (annotationWidth / 100) * 800); // Assume ~800px container
					const arrowWidth = 12;

					// Get colors for the annotation
					const getColors = () => {
						if (annotation.color) return { fill: annotation.color, stroke: annotation.color };
						const colorMap = {
							CDS: { fill: "rgb(190 242 100 / 0.45)", stroke: "rgb(163 230 53 / 0.8)" }, // lime
							promoter: { fill: "rgb(167 243 208 / 0.45)", stroke: "rgb(52 211 153 / 0.8)" }, // emerald
							terminator: { fill: "rgb(196 181 253 / 0.45)", stroke: "rgb(147 114 243 / 0.8)" }, // purple
							default: { fill: "rgb(165 180 252 / 0.45)", stroke: "rgb(129 140 248 / 0.8)" }, // indigo
						};
						return colorMap[annotation.type as keyof typeof colorMap] || colorMap.default;
					};

					const colors = getColors();

					return (
						<div
							key={index}
							className={`group absolute ${annotation.direction === "forward" ? "top-1/4" : "bottom-1/4"}`}
							style={{
								left: `${(annotation.start / sequenceLength) * 100}%`,
								width: `${annotationWidth}%`,
								transform: annotation.direction === "forward" ? "translateY(-50%)" : "translateY(50%)",
								height: "32px",
							}}
						>
							<svg width="100%" height="32" viewBox={`0 0 ${estimatedPixelWidth} 32`} preserveAspectRatio="none" className="overflow-visible">
								{annotation.direction === "forward" ? (
									<polygon
										points={`0,2 ${estimatedPixelWidth - arrowWidth},2 ${estimatedPixelWidth},16 ${estimatedPixelWidth - arrowWidth},30 0,30`}
										fill={colors.fill}
										stroke={colors.stroke}
										strokeWidth="1"
									/>
								) : (
									<polygon
										points={`${arrowWidth},2 ${estimatedPixelWidth},2 ${estimatedPixelWidth},30 ${arrowWidth},30 0,16`}
										fill={colors.fill}
										stroke={colors.stroke}
										strokeWidth="1"
									/>
								)}
							</svg>
							<div
								className="absolute inset-0 flex items-center text-slate-950/70 text-xs font-medium"
								style={{
									paddingLeft: annotation.direction === "reverse" ? "16px" : "8px",
									paddingRight: annotation.direction === "forward" ? "16px" : "8px",
								}}
							>
								<span className="truncate">{annotation.text}</span>
							</div>
							<div className={`group-hover:visible hidden absolute -bottom-10 left-0 text-white text-xs font-medium`} style={{ backgroundColor: colors.stroke }}>
								{annotation.text}
							</div>
						</div>
					);
				})}

				{/* Selection highlight */}
				{selection && (
					<div
						className="absolute top-0 h-full bg-blue-200 border-x-3 border-blue-500  opacity-30"
						style={{
							left: `${(selection.start / sequenceLength) * 100}%`,
							width: `${((selection.end - selection.start + 1) / sequenceLength) * 100}%`,
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
									left: `${(hoveredPosition / sequenceLength) * 100}%`,
									transform: "translateX(-50%)",
								}}
							/>
						</TooltipTrigger>
						<TooltipContent side="top">
							<div className="mb-1">
								Position: <span className="font-mono text-black">{hoveredPosition}</span>
							</div>
							<div className="flex">
								{sequence
									.substring(Math.max(0, hoveredPosition - 5), Math.min(sequenceLength, hoveredPosition + 6))
									.split("")
									.map((letter, index) => {
										const substringStart = Math.max(0, hoveredPosition - 5);
										const isCenter = substringStart + index === hoveredPosition;
										return (
											<span key={index} className={isCenter ? "text-black" : "text-slate-400"}>
												{letter}
											</span>
										);
									})}
							</div>
						</TooltipContent>
					</Tooltip>
				)}
			</div>

			{/* Sequence display when selection is made */}
			{selection && (
				<div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded">
					<div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{`Selected: Position ${selection.start} ${selection.start === selection.end ? "" : `- ${selection.end}`} (${
						selection.end - selection.start + 1
					} bp)`}</div>
					<div className="font-mono text-sm break-all">{sequence.substring(selection.start, selection.end + 1)}</div>
				</div>
			)}
		</div>
	);
};

export default LinearViewer;
