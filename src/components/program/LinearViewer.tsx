"use client";
import React, { useState, useRef, useEffect } from "react";

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
	height?: number;
	rulerInterval?: number;
}

const LinearViewer: React.FC<LinearViewerProps> = ({ sequence, annotations = [], height = 200, rulerInterval = 10 }) => {
	const [selection, setSelection] = useState<Selection | null>(null);
	const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const sequenceLength = sequence.length;

	// Calculate position from mouse event
	const getPositionFromEvent = (e: React.MouseEvent | MouseEvent) => {
		if (!containerRef.current) return null;
		const rect = containerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const position = Math.floor((x / rect.width) * sequenceLength);
		return Math.max(0, Math.min(sequenceLength - 1, position));
	};

	// Handle mouse events for selection
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
	}, [isDragging, selection]);

	// Generate ruler marks
	const rulerMarks = [];
	for (let i = 0; i <= sequenceLength; i += rulerInterval) {
		rulerMarks.push(i);
	}

	// Get color for annotation type
	const getAnnotationColor = (annotation: Annotation) => {
		if (annotation.color) return annotation.color;
		const colors = {
			CDS: "bg-green-500",
			promoter: "bg-yellow-500",
			terminator: "bg-red-500",
			default: "bg-blue-500",
		};
		return colors[annotation.type as keyof typeof colors] || colors.default;
	};

	// Calculate annotation position and width
	const getAnnotationStyle = (annotation: Annotation) => {
		const left = (annotation.start / sequenceLength) * 100;
		const width = ((annotation.end - annotation.start) / sequenceLength) * 100;
		return {
			left: `${left}%`,
			width: `${width}%`,
		};
	};

	return (
		<div className="w-full bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
			{/* Ruler */}
			<div className="relative h-8 mb-4 border-b-2 border-gray-300 dark:border-gray-700">
				{rulerMarks.map((mark) => (
					<div key={mark} className="absolute flex flex-col items-center" style={{ left: `${(mark / sequenceLength) * 100}%` }}>
						<div className="h-2 w-px bg-gray-400 dark:bg-gray-600" />
						<span className="text-xs text-gray-600 dark:text-gray-400 mt-1">{mark}</span>
					</div>
				))}
			</div>

			{/* Main viewer container */}
			<div
				ref={containerRef}
				className="relative cursor-crosshair select-none"
				style={{ height: `${height}px` }}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
			>
				{/* Sequence line */}
				<div className="absolute top-1/2 w-full h-1 bg-gray-300 dark:bg-gray-700 transform -translate-y-1/2" />

				{/* Annotations */}
				{annotations.map((annotation, index) => (
					<div
						key={index}
						className={`absolute flex items-center justify-center text-white text-sm font-medium rounded px-2 py-1 ${getAnnotationColor(annotation)} ${
							annotation.direction === "forward" ? "top-1/4" : "bottom-1/4"
						}`}
						style={{
							...getAnnotationStyle(annotation),
							transform: annotation.direction === "forward" ? "translateY(-50%)" : "translateY(50%)",
						}}
					>
						<span className="truncate">{annotation.text}</span>
						{annotation.direction === "forward" ? (
							<svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
								<path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
							</svg>
						) : (
							<svg className="w-4 h-4 mr-1 order-first" fill="currentColor" viewBox="0 0 20 20">
								<path d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
							</svg>
						)}
					</div>
				))}

				{/* Selection highlight */}
				{selection && (
					<div
						className="absolute top-0 h-full bg-blue-200 dark:bg-blue-800 opacity-30"
						style={{
							left: `${(selection.start / sequenceLength) * 100}%`,
							width: `${((selection.end - selection.start + 1) / sequenceLength) * 100}%`,
						}}
					/>
				)}

				{/* Hover tooltip showing sequence */}
				{hoveredPosition !== null && (
					<div
						className="absolute bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
						style={{
							left: `${(hoveredPosition / sequenceLength) * 100}%`,
							bottom: "100%",
							transform: "translateX(-50%) translateY(-8px)",
						}}
					>
						<div className="font-mono">
							Position: {hoveredPosition}
							<br />
							{sequence.substring(Math.max(0, hoveredPosition - 5), Math.min(sequenceLength, hoveredPosition + 6))}
						</div>
						<div
							className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"
							style={{
								bottom: "-4px",
								left: "50%",
								transform: "translateX(-50%)",
							}}
						/>
					</div>
				)}
			</div>

			{/* Sequence display when selection is made */}
			{selection && (
				<div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
					<div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
						Selected: Position {selection.start} - {selection.end} ({selection.end - selection.start + 1} bp)
					</div>
					<div className="font-mono text-sm break-all">{sequence.substring(selection.start, selection.end + 1)}</div>
				</div>
			)}
		</div>
	);
};

export default LinearViewer;
