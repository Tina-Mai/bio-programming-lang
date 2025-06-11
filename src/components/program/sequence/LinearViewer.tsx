"use client";
import React, { useState, useRef, useEffect } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Annotation } from "@/types";

interface Selection {
	start: number;
	end: number;
}

interface LinearViewerProps {
	sequence: string;
	annotations?: Annotation[];
}

interface AnnotationComponentProps {
	annotation: Annotation;
	index: number;
	sequenceLength: number;
	hoveredAnnotation: Annotation | null;
	setHoveredAnnotation: (annotation: Annotation | null) => void;
	direction: "forward" | "reverse";
}

const AnnotationComponent: React.FC<AnnotationComponentProps> = ({ annotation, index, sequenceLength, hoveredAnnotation, setHoveredAnnotation, direction }) => {
	const annotationWidth = ((annotation.end - annotation.start + 1) / sequenceLength) * 100;
	const estimatedPixelWidth = Math.max(40, (annotationWidth / 100) * 800);
	const arrowWidth = 12;

	// get colors for the annotation
	const getColors = () => {
		if (annotation.color) return { fill: annotation.color, stroke: annotation.color };
		const colorMap = {
			CDS: { fill: "rgb(253 224 71 / 0.45)", stroke: "rgb(234 179 8 / 0.8)" }, // yellow
			promoter: { fill: "rgb(167 243 208 / 0.45)", stroke: "rgb(52 211 153 / 0.8)" }, // emerald
			terminator: { fill: "rgb(196 181 253 / 0.45)", stroke: "rgb(147 114 243 / 0.8)" }, // purple
			default: { fill: "rgb(165 180 252 / 0.45)", stroke: "rgb(129 140 248 / 0.8)" }, // indigo
		};
		return colorMap[annotation.type as keyof typeof colorMap] || colorMap.default;
	};

	const colors = getColors();
	const isHovered = hoveredAnnotation === annotation;
	const shouldDim = hoveredAnnotation && !isHovered;

	// direction-specific configurations
	const config = {
		forward: {
			polygonPoints: `0,2 ${estimatedPixelWidth - arrowWidth},2 ${estimatedPixelWidth},16 ${estimatedPixelWidth - arrowWidth},30 0,30`,
			textAlign: "justify-start",
			paddingLeft: "8px",
			paddingRight: "16px",
		},
		reverse: {
			polygonPoints: `${arrowWidth},2 ${estimatedPixelWidth},2 ${estimatedPixelWidth},30 ${arrowWidth},30 0,16`,
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
				left: `${(annotation.start / sequenceLength) * 100}%`,
				width: `${annotationWidth}%`,
				height: "32px",
				zIndex: isHovered ? 20 : 10,
			}}
			onMouseEnter={() => setHoveredAnnotation(annotation)}
			onMouseLeave={() => setHoveredAnnotation(null)}
		>
			<svg width="100%" height="32" viewBox={`0 0 ${estimatedPixelWidth} 32`} preserveAspectRatio="none" className="overflow-visible backdrop-blur-[2px]">
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
					className={`${hoveredAnnotation === annotation ? "text-white backdrop-blur rounded-xs px-1 text-nowrap" : "truncate"} transition-all duration-300`}
					style={{ backgroundColor: hoveredAnnotation === annotation ? colors.stroke : "transparent" }}
				>
					{annotation.text}
				</span>
			</div>
		</div>
	);
};

const LinearViewer: React.FC<LinearViewerProps> = ({ sequence, annotations = [] }) => {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [hoveredAnnotation, setHoveredAnnotation] = useState<Annotation | null>(null);
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

	// global mouse events for dragging outside container
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

	const forwardAnnotations = annotations.filter((annotation) => annotation.direction === "forward");
	const backwardAnnotations = annotations.filter((annotation) => annotation.direction === "reverse");

	return (
		<div className="w-full">
			{/* Main viewer container */}
			<div
				ref={containerRef}
				className="flex flex-col cursor-crosshair select-none px-5 py-7"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
				style={{ border: "1px solid red" }}
			>
				{/* Sequence + Ruler Section */}
				<div className="relative h-16 w-full">
					{/* Single sequence line */}
					<div className="absolute top-2 w-full h-5 border-x-4 rounded-xs border-slate-400 bg-slate-300" />

					{/* Annotation hover highlight overlay */}
					{hoveredAnnotation && (
						<div
							className="absolute h-5 bg-slate-500 opacity-70 pointer-events-none transition-all duration-300"
							style={{
								left: `${(hoveredAnnotation.start / sequenceLength) * 100}%`,
								width: `${((hoveredAnnotation.end - hoveredAnnotation.start + 1) / sequenceLength) * 100}%`,
								top: "8px",
							}}
						/>
					)}

					{/* Sequence segmentation lines */}
					{Array.from({ length: sequenceLength - 1 }, (_, i) => i + 1).map((position) => (
						<div
							key={position}
							className="absolute w-px h-5 bg-white opacity-30"
							style={{
								left: `${(position / sequenceLength) * 100}%`,
								top: "8px",
							}}
						/>
					))}

					{/* Ruler - positioned right below sequence line */}
					<div className="absolute w-full top-7">
						{rulerMarks.map((mark) => (
							<div key={mark} className="absolute flex flex-col items-center" style={{ left: `${(mark / sequenceLength) * 100}%` }}>
								<div className="h-2 w-px bg-slate-400" />
								<span className="font-mono text-[10px] text-slate-500 mt-0.5">{mark}</span>
							</div>
						))}
					</div>

					{/* Selection highlight */}
					{selection && (
						<div
							className="absolute h-full bg-blue-200 border-x-3 border-blue-500 opacity-30 z-30"
							style={{
								left: `${(selection.start / sequenceLength) * 100}%`,
								width: `${((selection.end - selection.start + 1) / sequenceLength) * 100}%`,
								top: "0",
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
							<TooltipContent side="top" className="translate-y-5">
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

				{/* Forward Annotations Section */}
				{forwardAnnotations.length > 0 && (
					<div className="relative h-10 w-full">
						{forwardAnnotations.map((annotation, index) => (
							<AnnotationComponent
								key={`forward-${index}`}
								annotation={annotation}
								index={index}
								sequenceLength={sequenceLength}
								hoveredAnnotation={hoveredAnnotation}
								setHoveredAnnotation={setHoveredAnnotation}
								direction="forward"
							/>
						))}
					</div>
				)}

				{/* Backward Annotations Section */}
				{backwardAnnotations.length > 0 && (
					<div className="relative h-10 w-full">
						{backwardAnnotations.map((annotation, index) => (
							<AnnotationComponent
								key={`backward-${index}`}
								annotation={annotation}
								index={index}
								sequenceLength={sequenceLength}
								hoveredAnnotation={hoveredAnnotation}
								setHoveredAnnotation={setHoveredAnnotation}
								direction="reverse"
							/>
						))}
					</div>
				)}
			</div>

			{/* Sequence display when selection is made */}
			{selection && (
				<div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xs">
					<div className="text-sm text-slate-600 dark:text-slate-400 mb-1">{`Position ${selection.start} ${selection.start === selection.end ? "" : `- ${selection.end}`} (${
						selection.end - selection.start + 1
					} bp)`}</div>
					<div className="font-mono text-sm break-all">{sequence.substring(selection.start, selection.end + 1)}</div>
				</div>
			)}
		</div>
	);
};

export default LinearViewer;
