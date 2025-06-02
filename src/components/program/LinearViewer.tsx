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
		if (length <= 100) return 10;
		if (length <= 500) return 50;
		if (length <= 1000) return 100;
		if (length <= 5000) return 500;
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
		<div className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
			{/* Ruler */}
			<div className="relative h-8 mb-4 border-b-2 border-slate-300 dark:border-slate-700">
				{rulerMarks.map((mark) => (
					<div key={mark} className="absolute flex flex-col items-center" style={{ left: `${(mark / sequenceLength) * 100}%` }}>
						<div className="h-2 w-px bg-slate-400 dark:bg-slate-600" />
						<span className="text-xs text-slate-600 dark:text-slate-400 mt-1">{mark}</span>
					</div>
				))}
			</div>

			{/* Main viewer container */}
			<div
				ref={containerRef}
				className="relative cursor-crosshair select-none"
				style={{ height: "200px" }}
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
					const containerWidth = containerRef.current?.getBoundingClientRect().width || 800;
					const pixelWidth = Math.max(32, (annotationWidth / 100) * containerWidth);
					const arrowWidth = 8;

					// Get colors for the annotation
					const getColors = () => {
						if (annotation.color) return { fill: annotation.color, stroke: annotation.color };
						const colorMap = {
							CDS: { fill: "rgb(190 242 100 / 0.45)", stroke: "rgb(163 230 53 / 0.8)" },
							promoter: { fill: "rgb(167 243 208 / 0.45)", stroke: "rgb(52 211 153 / 0.8)" },
							terminator: { fill: "rgb(196 181 253 / 0.45)", stroke: "rgb(147 114 243 / 0.8)" },
							default: { fill: "rgb(165 180 252 / 0.45)", stroke: "rgb(129 140 248 / 0.8)" },
						};
						return colorMap[annotation.type as keyof typeof colorMap] || colorMap.default;
					};

					const colors = getColors();

					return (
						<div
							key={index}
							className={`absolute ${annotation.direction === "forward" ? "top-1/4" : "bottom-1/4"}`}
							style={{
								left: `${(annotation.start / sequenceLength) * 100}%`,
								width: `${annotationWidth}%`,
								transform: annotation.direction === "forward" ? "translateY(-50%)" : "translateY(50%)",
								height: "24px",
								minWidth: "32px",
							}}
						>
							<svg width="100%" height="24" viewBox={`0 0 ${pixelWidth} 24`} className="overflow-visible">
								{annotation.direction === "forward" ? (
									<polygon
										points={`0,2 ${pixelWidth - arrowWidth},2 ${pixelWidth},12 ${pixelWidth - arrowWidth},22 0,22`}
										fill={colors.fill}
										stroke={colors.stroke}
										strokeWidth="1"
									/>
								) : (
									<polygon points={`${arrowWidth},2 ${pixelWidth},2 ${pixelWidth},22 ${arrowWidth},22 0,12`} fill={colors.fill} stroke={colors.stroke} strokeWidth="1" />
								)}
							</svg>
							<div
								className="absolute inset-0 flex items-center justify-start text-slate-950/70 text-xs font-medium px-2"
								style={{
									paddingLeft: annotation.direction === "reverse" ? "12px" : "8px",
									paddingRight: annotation.direction === "forward" ? "12px" : "8px",
								}}
							>
								<span className="truncate">{annotation.text}</span>
							</div>
						</div>
					);
				})}

				{/* Selection highlight */}
				{selection && (
					<div
						className="absolute top-0 h-full bg-blue-200 dark:bg-blue-800 bor opacity-30"
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
					<div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
						Selected: Position {selection.start} - {selection.end} ({selection.end - selection.start + 1} bp)
					</div>
					<div className="font-mono text-sm break-all">{sequence.substring(selection.start, selection.end + 1)}</div>
				</div>
			)}
		</div>
	);
};

export default LinearViewer;
