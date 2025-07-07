"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Segment, ConstraintInstance, GeneratorInstance, constraintOptions, generatorOptions, Constraint, Generator as GeneratorType, SEGMENT_ARROW_WIDTH, getSegmentColors } from "@/types";
import { useProgram } from "@/context/ProgramContext";
import ConstraintBox from "@/components/program/linear/Constraint";
import GeneratorBox from "@/components/program/linear/Generator";
import SegmentComponent from "@/components/program/linear/segment/Segment";
import NewButtons from "@/components/program/linear/NewButtons";
import Portal from "@/components/global/Portal";

interface LinearViewerProps {
	segments: Segment[];
	constraints: ConstraintInstance[];
	generators: GeneratorInstance[];
	constructId?: string;
}

const INITIAL_RULER_MIN_LENGTH = 100; // min starting ruler length
const RULER_PADDING = 10; // extra ruler spacing at end of segment
const DRAG_THRESHOLD = 5; // pixels to move before drag starts

const LinearViewer: React.FC<LinearViewerProps> = ({ segments = [], constraints = [], generators = [], constructId }) => {
	const { reorderSegments, updateSegmentLength } = useProgram();
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
	const animationFrameRef = useRef<number | null>(null);

	// refs for animation values to avoid dependency issues
	const currentZoomRef = useRef<number>(1);
	const currentOffsetRef = useRef<number>(0);

	useEffect(() => {
		currentZoomRef.current = zoomLevel;
		currentOffsetRef.current = offset;
	}, []);

	// drag and drop state
	const [draggedSegment, setDraggedSegment] = useState<Segment | null>(null);
	const [draggedSegmentIndex, setDraggedSegmentIndex] = useState<number | null>(null);
	const [dropPreviewIndex, setDropPreviewIndex] = useState<number | null>(null);
	const [visualDropIndex, setVisualDropIndex] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [dragMousePosition, setDragMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// resize state
	const [isResizing, setIsResizing] = useState<boolean>(false);
	const [resizingSegment, setResizingSegment] = useState<Segment | null>(null);

	// potential drag state - for distinguishing clicks from drags
	const [potentialDrag, setPotentialDrag] = useState<{
		segment: Segment | null;
		index: number | null;
		startX: number;
		startY: number;
		hasStarted: boolean;
	}>({ segment: null, index: null, startX: 0, startY: 0, hasStarted: false });

	const containerRef = useRef<HTMLDivElement>(null);
	const segmentsRef = useRef<HTMLDivElement>(null);
	const baseWidth = 10.1;
	const nucleotideWidth = baseWidth * zoomLevel;

	const [segmentsState, setSegmentsState] = useState<Segment[]>(segments);
	useEffect(() => {
		setSegmentsState(segments);
	}, [segments]);

	// calculate total length from all segments
	const actualTotalLength = segmentsState.reduce((acc, segment) => acc + segment.length, 0);
	const totalLength = actualTotalLength < INITIAL_RULER_MIN_LENGTH ? INITIAL_RULER_MIN_LENGTH : actualTotalLength + RULER_PADDING;

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

	// calculate minimum zoom level to fit entire construct in container
	const calculateFitZoomLevel = useCallback(() => {
		const container = containerRef.current;
		if (!container || !totalLength) return 0.1;
		const availableWidth = container.clientWidth - 40;
		return Math.max(0.1, availableWidth / (totalLength * baseWidth));
	}, [totalLength, baseWidth]);

	// animate zoom level and offset
	useEffect(() => {
		let isAnimating = true;

		const animate = () => {
			if (!isAnimating) return;

			const zoomDiff = targetZoomLevel - currentZoomRef.current;
			const offsetDiff = targetOffset - currentOffsetRef.current;

			if (Math.abs(zoomDiff) < 0.001 && Math.abs(offsetDiff) < 0.1) {
				currentZoomRef.current = targetZoomLevel;
				currentOffsetRef.current = targetOffset;
				setZoomLevel(targetZoomLevel);
				setOffset(targetOffset);
				return;
			}

			const easingFactor = 0.25;
			currentZoomRef.current += zoomDiff * easingFactor;
			currentOffsetRef.current += offsetDiff * easingFactor;

			setZoomLevel(currentZoomRef.current);
			setOffset(currentOffsetRef.current);

			animationFrameRef.current = requestAnimationFrame(animate);
		};

		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}

		animate();

		return () => {
			isAnimating = false;
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [targetZoomLevel, targetOffset]);

	// handle scrolling and zooming
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			if (!isHovering) return;

			e.preventDefault();

			if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				const scrollAmount = e.deltaX || e.deltaY;
				const currentNucleotideWidth = baseWidth * currentZoomRef.current;
				const totalContentWidth = totalLength * currentNucleotideWidth + 40;
				const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, currentOffsetRef.current + scrollAmount));
				setTargetOffset(newOffset);
				return;
			}

			const minZoomLevel = calculateFitZoomLevel();
			const direction = e.deltaY < 0 ? 1 : -1;
			const zoomFactor = 0.1;
			const currentZoom = currentZoomRef.current;
			const newZoomLevel = Math.max(minZoomLevel, Math.min(10, currentZoom + direction * zoomFactor));

			if (Math.abs(newZoomLevel - currentZoom) < 0.001) return;

			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const cursorXRelativeToViewport = e.clientX - rect.left;
			const cursorXRelativeToContent = cursorXRelativeToViewport + currentOffsetRef.current;
			const currentNucleotideWidth = baseWidth * currentZoom;
			const totalCurrentContentWidth = totalLength * currentNucleotideWidth + 40;
			const cursorRatio = cursorXRelativeToContent / totalCurrentContentWidth;
			const newContentWidth = totalLength * baseWidth * newZoomLevel + 40;
			const newOffset = cursorRatio * newContentWidth - cursorXRelativeToViewport;
			const clampedNewOffset = Math.max(0, Math.min(newContentWidth - visibleWidth, newOffset));

			setTargetZoomLevel(newZoomLevel);
			setTargetOffset(clampedNewOffset);
		},
		[isHovering, totalLength, baseWidth, visibleWidth, calculateFitZoomLevel]
	);

	// handle mouse events for panning
	const handleMouseDown = (e: React.MouseEvent) => {
		const target = e.target as HTMLElement;
		const isClickingSegment = target.closest("[data-segment-component]") !== null;

		if (!isClickingSegment) {
			setClickedSegment(null);
			setHoveredSegment(null);
		}

		if (!isClickingSegment && isHovering && !isDragging && !isResizing) {
			setIsPanning(true);
			setLastMouseX(e.clientX);
		}
	};

	// handle mouse move for drag & drop segments
	const handleMouseMove = (e: React.MouseEvent) => {
		if (isResizing && resizingSegment) {
			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) return;

			const segmentPosition = segmentPositions.get(resizingSegment.id) || 0;
			const segmentPixelStart = 20 + segmentPosition * nucleotideWidth - offset;
			const mouseX = e.clientX - rect.left;
			const newPixelWidth = mouseX - segmentPixelStart;
			const newLength = Math.max(1, Math.round(newPixelWidth / nucleotideWidth));

			if (newLength !== resizingSegment.length) {
				const updatedSegment = { ...resizingSegment, length: newLength };
				setResizingSegment(updatedSegment);
				setSegmentsState((prevSegments) => prevSegments.map((s) => (s.id === updatedSegment.id ? updatedSegment : s)));
			}
			return;
		}

		if (isDragging && draggedSegment) {
			// update drag mouse position
			const rect = containerRef.current?.getBoundingClientRect();
			if (rect) {
				setDragMousePosition({
					x: e.clientX,
					y: e.clientY,
				});
			}
			if (!rect) return;

			// calculate which position to snap to
			const mouseX = e.clientX - rect.left + offset;
			let accumulatedWidth = 20;
			let newIndex = 0;

			// find insertion point
			for (let i = 0; i < segmentsState.length; i++) {
				const segmentWidth = segmentsState[i].length * nucleotideWidth;
				const segmentMidpoint = accumulatedWidth + segmentWidth / 2;

				if (mouseX < segmentMidpoint) {
					newIndex = i;
					break;
				}

				accumulatedWidth += segmentWidth;
				newIndex = i + 1;
			}

			setVisualDropIndex(newIndex);

			if (draggedSegmentIndex !== null && newIndex > draggedSegmentIndex) {
				newIndex--;
			}

			setDropPreviewIndex(newIndex);

			return;
		}

		if (isPanning) {
			const deltaX = e.clientX - lastMouseX;
			const totalContentWidth = totalLength * nucleotideWidth + 40;
			const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, currentOffsetRef.current - deltaX));
			setTargetOffset(newOffset);
			setLastMouseX(e.clientX);
			return;
		}

		const position = getPositionFromEvent(e);
		if (position !== null) {
			setHoveredPosition(position);
		}
	};

	// handle mouse up for drag & drop segments
	const handleMouseUp = () => {
		// if resizing
		if (isResizing && resizingSegment) {
			if (resizingSegment.length > 0) {
				updateSegmentLength(resizingSegment.id, resizingSegment.length).catch(console.error);
			}
			setIsResizing(false);
			setResizingSegment(null);
			setClickedSegment(null);
			return;
		}

		// if potential drag but not started dragging, treat as click
		if (potentialDrag.segment && !potentialDrag.hasStarted) {
			setPotentialDrag({ segment: null, index: null, startX: 0, startY: 0, hasStarted: false });
			return;
		}

		if (isDragging && draggedSegment && dropPreviewIndex !== null && draggedSegmentIndex !== null && constructId) {
			// only reorder if the position actually changed
			if (dropPreviewIndex !== draggedSegmentIndex) {
				const newSegments = [...segmentsState];
				console.log(
					"Original segments:",
					segmentsState.map((s) => ({ id: s.id, label: s.label }))
				);
				console.log("Dragged segment index:", draggedSegmentIndex);
				console.log("Drop preview index:", dropPreviewIndex);

				const [removed] = newSegments.splice(draggedSegmentIndex, 1);
				newSegments.splice(dropPreviewIndex, 0, removed);

				// get segment IDs in new order
				const segmentIds = newSegments.map((s) => s.id);
				console.log("New segment IDs order:", segmentIds);
				console.log(
					"New segments:",
					newSegments.map((s) => ({ id: s.id, label: s.label }))
				);

				const uniqueIds = new Set(segmentIds);
				if (uniqueIds.size !== segmentIds.length) {
					console.error("Duplicate segment IDs detected!");
				}

				reorderSegments(constructId, segmentIds).catch(console.error);
			}
		}

		// reset drag state
		setDraggedSegment(null);
		setDraggedSegmentIndex(null);
		setDropPreviewIndex(null);
		setVisualDropIndex(null);
		setIsDragging(false);
		setIsPanning(false);
		setDragMousePosition({ x: 0, y: 0 });
		setPotentialDrag({ segment: null, index: null, startX: 0, startY: 0, hasStarted: false });
	};

	const handleMouseLeave = () => {
		setHoveredPosition(null);
		if (!isPanning && !isDragging && !isResizing) {
			setIsHovering(false);
			if (!clickedSegment) {
				setHoveredSegment(null);
			}
		}
	};

	const handleMouseEnter = () => {
		setIsHovering(true);
	};

	// global mouse events for dragging outside container
	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (isResizing && resizingSegment && containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const segmentPosition = segmentPositions.get(resizingSegment.id);

				if (segmentPosition === undefined) return;

				const segmentPixelStart = 20 + segmentPosition * nucleotideWidth - offset;
				const mouseX = e.clientX - rect.left;
				const newPixelWidth = mouseX - segmentPixelStart;
				const newLength = Math.max(1, Math.round(newPixelWidth / nucleotideWidth));

				if (newLength !== resizingSegment.length) {
					const updatedSegment = { ...resizingSegment, length: newLength };
					setResizingSegment(updatedSegment);
					setSegmentsState((prevSegments) => prevSegments.map((s) => (s.id === updatedSegment.id ? updatedSegment : s)));
				}
				return;
			}
			if (potentialDrag.segment && !potentialDrag.hasStarted) {
				const deltaX = Math.abs(e.clientX - potentialDrag.startX);
				const deltaY = Math.abs(e.clientY - potentialDrag.startY);

				if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
					setDraggedSegment(potentialDrag.segment);
					setDraggedSegmentIndex(potentialDrag.index);
					setDropPreviewIndex(potentialDrag.index);
					setVisualDropIndex(potentialDrag.index);
					setIsDragging(true);
					setDragMousePosition({ x: e.clientX, y: e.clientY });
					setPotentialDrag({ ...potentialDrag, hasStarted: true });
					setHoveredSegment(null);
					setClickedSegment(null);
				}
			}

			if (isDragging && draggedSegment && containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();

				setDragMousePosition({
					x: e.clientX,
					y: e.clientY,
				});

				const mouseX = e.clientX - rect.left + offset;
				let accumulatedWidth = 20;
				let newIndex = 0;

				for (let i = 0; i < segmentsState.length; i++) {
					const segmentWidth = segmentsState[i].length * nucleotideWidth;
					const segmentMidpoint = accumulatedWidth + segmentWidth / 2;

					if (mouseX < segmentMidpoint) {
						newIndex = i;
						break;
					}

					accumulatedWidth += segmentWidth;
					newIndex = i + 1;
				}

				setVisualDropIndex(newIndex);

				if (draggedSegmentIndex !== null && newIndex > draggedSegmentIndex) {
					newIndex--;
				}

				setDropPreviewIndex(newIndex);
			}

			if (isPanning) {
				const deltaX = e.clientX - lastMouseX;
				const totalContentWidth = totalLength * nucleotideWidth + 40;
				const newOffset = Math.max(0, Math.min(totalContentWidth - visibleWidth, currentOffsetRef.current - deltaX));
				setTargetOffset(newOffset);
				setLastMouseX(e.clientX);
			}
		};

		const handleGlobalMouseUp = () => {
			if (isResizing && resizingSegment) {
				if (resizingSegment.length > 0) {
					updateSegmentLength(resizingSegment.id, resizingSegment.length).catch(console.error);
				}
				setIsResizing(false);
				setResizingSegment(null);
				setClickedSegment(null);
				return;
			}
			if (potentialDrag.segment && !potentialDrag.hasStarted) {
				setPotentialDrag({ segment: null, index: null, startX: 0, startY: 0, hasStarted: false });
				return;
			}

			if (isDragging && draggedSegment && dropPreviewIndex !== null && draggedSegmentIndex !== null && constructId) {
				if (dropPreviewIndex !== draggedSegmentIndex) {
					const newSegments = [...segmentsState];
					const [removed] = newSegments.splice(draggedSegmentIndex, 1);
					newSegments.splice(dropPreviewIndex, 0, removed);
					const segmentIds = newSegments.map((s) => s.id);
					reorderSegments(constructId, segmentIds).catch(console.error);
				}
			}

			setDraggedSegment(null);
			setDraggedSegmentIndex(null);
			setDropPreviewIndex(null);
			setVisualDropIndex(null);
			setIsDragging(false);
			setIsPanning(false);
			setDragMousePosition({ x: 0, y: 0 });
			setPotentialDrag({ segment: null, index: null, startX: 0, startY: 0, hasStarted: false });
		};

		if (isPanning || isDragging || potentialDrag.segment || isResizing) {
			document.addEventListener("mousemove", handleGlobalMouseMove);
			document.addEventListener("mouseup", handleGlobalMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleGlobalMouseMove);
			document.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [
		isPanning,
		isDragging,
		draggedSegment,
		draggedSegmentIndex,
		dropPreviewIndex,
		lastMouseX,
		offset,
		totalLength,
		nucleotideWidth,
		visibleWidth,
		segmentsState,
		constructId,
		reorderSegments,
		potentialDrag,
		DRAG_THRESHOLD,
		isResizing,
		resizingSegment,
		updateSegmentLength,
	]);

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

		const initialZoom = calculateFitZoomLevel();
		setZoomLevel(initialZoom);
		setTargetZoomLevel(initialZoom);
		currentZoomRef.current = initialZoom;

		setOffset(0);
		setTargetOffset(0);
		currentOffsetRef.current = 0;

		container.addEventListener("wheel", handleWheel, { passive: false });

		return () => {
			container.removeEventListener("wheel", handleWheel);
		};
	}, [handleWheel, calculateFitZoomLevel, updateVisibleWidth]);

	// handle window resize
	useEffect(() => {
		const handleResize = () => {
			updateVisibleWidth();
			const newZoom = calculateFitZoomLevel();
			setZoomLevel(newZoom);
			setTargetZoomLevel(newZoom);
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [calculateFitZoomLevel, updateVisibleWidth]);

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
	if (firstBpInView <= 0) {
		rulerMarks.push(0);
	}
	const firstMultiple = Math.ceil((firstBpInView + 1) / rulerInterval) * rulerInterval;
	for (let bp = firstMultiple; bp <= lastBpInView; bp += rulerInterval) {
		if (bp !== 0) {
			rulerMarks.push(bp);
		}
	}

	// calculate segment positions - segments are connected in order
	const segmentPositions = new Map<string, number>();
	let currentPosition = 0;

	// calculate positions for original segments (for ghost rendering)
	segments.forEach((segment) => {
		segmentPositions.set(segment.id, currentPosition);
		currentPosition += segment.length;
	});

	// calculate positions considering drag preview
	const displaySegmentPositions = new Map<string, number>();
	const displaySegments = [...segments];
	if (isDragging && draggedSegmentIndex !== null && dropPreviewIndex !== null && draggedSegmentIndex !== dropPreviewIndex) {
		const [removed] = displaySegments.splice(draggedSegmentIndex, 1);
		displaySegments.splice(dropPreviewIndex, 0, removed);
	}

	currentPosition = 0;
	displaySegments.forEach((segment) => {
		displaySegmentPositions.set(segment.id, currentPosition);
		currentPosition += segment.length;
	});

	// get constraints and generators for highlighted segment
	const highlightedSegment = isDragging || isResizing ? null : clickedSegment || hoveredSegment;

	return (
		<div className="w-full h-full">
			<div
				ref={containerRef}
				className="flex flex-col h-full select-none overflow-hidden relative"
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
				onMouseEnter={handleMouseEnter}
				style={{
					cursor: isDragging ? "grabbing" : isPanning ? "grabbing" : isResizing ? "ew-resize" : "default",
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
						<div className="absolute top-0 size-1 bg-slate-400" style={{ left: "-1.5px" }} />
						<div className="absolute top-0 bottom-0 w-px bg-slate-400/60" />
						<div
							className="absolute bg-slate-400 text-white font-mono text-xs py-0 px-[2.5px] rounded-xs"
							style={{
								top: "10px",
								left: "50%",
								transform: "translateX(-50%)",
								whiteSpace: "nowrap",
								zIndex: 50,
							}}
						>
							{hoveredPosition}
						</div>
					</div>
				)}

				{/* Vertical grid lines */}
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

				{/* Ruler */}
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

						{/* In-between ruler marks */}
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

				{/* Main content wrapper*/}
				<div className="flex flex-col justify-center flex-1 pt-8">
					{/* Constraints */}
					<div className="relative h-40 w-full">
						{segmentsState.map((segment) => {
							// only show if segment is hovered or clicked
							if (highlightedSegment?.id !== segment.id) return null;

							// find all constraints that apply to this segment
							const segmentConstraints = constraints
								.filter((constraint) => constraint.segments.includes(segment.id) && constraint.key)
								.map((constraint) => {
									const constraintDef = constraintOptions.find((c: Constraint) => c.key === constraint.key);
									return constraintDef || { key: constraint.key || "", name: constraint.label || constraint.key || "Unknown" };
								});
							if (segmentConstraints.length === 0) return null;
							const segmentPosition = segmentPositions.get(segment.id) || 0;
							const segmentLength = segment.length;
							const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;

							// skip if outside visible area
							if (segmentCenter < -100 || segmentCenter > visibleWidth + 100) return null;

							// calculate total width of constraint boxes
							const constraintBoxWidth = 180;
							const totalWidth = segmentConstraints.length * constraintBoxWidth + (segmentConstraints.length - 1) * 8;
							const halfWidth = totalWidth / 2;

							// calculate adjusted position to keep boxes within container
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
					{segmentsState.length > 0 && (
						<div ref={segmentsRef} className="relative h-12 w-full overflow-visible">
							{/* Resizing UI */}
							{isResizing &&
								resizingSegment &&
								(() => {
									const originalSegment = segments.find((s) => s.id === resizingSegment.id);
									if (!originalSegment) return null;

									const position = segmentPositions.get(resizingSegment.id) || 0;
									const left = 20 + position * nucleotideWidth - offset;
									const originalWidth = originalSegment.length * nucleotideWidth;
									const newWidth = resizingSegment.length * nucleotideWidth;
									const colors = getSegmentColors(resizingSegment);

									return (
										<>
											{/* Original size ghost (shown when decreasing) */}
											{newWidth < originalWidth && (
												<div
													className="absolute top-0 pointer-events-none"
													style={{
														left: `${left}px`,
														width: `${originalWidth + SEGMENT_ARROW_WIDTH}px`,
														height: "40px",
														zIndex: 24,
														opacity: 0.7,
													}}
												>
													<svg width="100%" height="40" viewBox={`0 0 ${originalWidth + SEGMENT_ARROW_WIDTH} 40`} preserveAspectRatio="none" className="overflow-visible">
														<polygon
															points={`0,2 ${originalWidth},2 ${originalWidth + SEGMENT_ARROW_WIDTH},20 ${originalWidth},38 0,38 ${SEGMENT_ARROW_WIDTH},20`}
															fill={colors.fill}
															stroke={colors.stroke}
															strokeWidth="2"
														/>
													</svg>
												</div>
											)}
											{/* Extension overlay (shown when increasing) */}
											{newWidth > originalWidth && (
												<div
													className="absolute top-0 pointer-events-none"
													style={{
														left: `${left + originalWidth}px`,
														width: `${newWidth - originalWidth + SEGMENT_ARROW_WIDTH}px`,
														height: "40px",
														zIndex: 26,
														opacity: 0.5,
													}}
												>
													<svg
														width="100%"
														height="40"
														viewBox={`0 0 ${newWidth - originalWidth + SEGMENT_ARROW_WIDTH} 40`}
														preserveAspectRatio="none"
														className="overflow-visible"
													>
														<polygon
															points={`0,2 ${newWidth - originalWidth},2 ${newWidth - originalWidth + SEGMENT_ARROW_WIDTH},20 ${
																newWidth - originalWidth
															},38 0,38 ${SEGMENT_ARROW_WIDTH},20`}
															fill={colors.fill}
															stroke={colors.stroke}
															strokeWidth="2"
														/>
													</svg>
												</div>
											)}
										</>
									);
								})()}

							{/* Drop zone indicator */}
							{isDragging && visualDropIndex !== null && (
								<div
									className="absolute"
									style={{
										left: `${20 + segmentsState.slice(0, visualDropIndex).reduce((acc, s) => acc + s.length, 0) * nucleotideWidth - offset - 2}px`,
										top: 0,
										zIndex: 40,
										filter: "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
									}}
								>
									<svg width={SEGMENT_ARROW_WIDTH} height="40" viewBox={`0 0 ${SEGMENT_ARROW_WIDTH} 40`} className="overflow-visible">
										<polyline points={`0,2 ${SEGMENT_ARROW_WIDTH},20 0,38`} fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</div>
							)}

							{displaySegments
								.filter((segment) => {
									const segmentPosition = displaySegmentPositions.get(segment.id) || 0;
									const segmentLength = segment.length;
									const segmentLeft = 20 + segmentPosition * nucleotideWidth - offset;
									const segmentWidth = segmentLength * nucleotideWidth;
									const buffer = 200;
									return segmentLeft + segmentWidth >= -buffer && segmentLeft <= visibleWidth + buffer;
								})
								.map((segment) => {
									const originalIndex = segmentsState.findIndex((s) => s.id === segment.id);
									const isDraggedSegment = draggedSegment?.id === segment.id;
									const isCurrentResizingSegment = resizingSegment?.id === segment.id;
									const displaySegment = isCurrentResizingSegment && resizingSegment ? resizingSegment : segment;

									return (
										<SegmentComponent
											key={`segment-${segment.id}`}
											segment={displaySegment}
											index={originalIndex}
											hoveredSegment={hoveredSegment}
											setHoveredSegment={setHoveredSegment}
											clickedSegment={clickedSegment}
											setClickedSegment={setClickedSegment}
											baseWidth={baseWidth}
											zoomLevel={zoomLevel}
											offset={offset}
											position={displaySegmentPositions.get(segment.id) || 0}
											isDragging={isDraggedSegment}
											isAnySegmentDragging={isDragging}
											isResizing={isCurrentResizingSegment}
											isAnySegmentResizing={isResizing}
											onDragStart={(e) => {
												e.stopPropagation();
												setPotentialDrag({
													segment: segment,
													index: originalIndex,
													startX: e.clientX,
													startY: e.clientY,
													hasStarted: false,
												});
											}}
											onResizeStart={(e) => {
												e.stopPropagation();
												setIsResizing(true);
												setResizingSegment(segment);
												setClickedSegment(segment);
												setHoveredSegment(null);
											}}
										/>
									);
								})}

							{/* Constraint connecting lines */}
							{highlightedSegment &&
								segmentsState.includes(highlightedSegment) &&
								(() => {
									const segmentConstraints = constraints
										.filter((constraint) => constraint.segments.includes(highlightedSegment.id) && constraint.key)
										.map((constraint) => {
											const constraintDef = constraintOptions.find((c: Constraint) => c.key === constraint.key);
											return constraintDef || { key: constraint.key || "", name: constraint.label || constraint.key || "Unknown" };
										});
									if (segmentConstraints.length === 0) return null;

									const segmentPosition = segmentPositions.get(highlightedSegment.id) || 0;
									const segmentLength = highlightedSegment.length;
									const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;

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
												top: "-148px",
												width: "100%",
												height: "148px",
												overflow: "visible",
											}}
										>
											{segmentConstraints.map((constraint, idx, arr) => {
												const boxOffset = (idx - (arr.length - 1) / 2) * (constraintBoxWidth + 8);
												const boxCenterX = adjustedLeft + boxOffset;
												const startX = boxCenterX;
												const startY = 72; // config: where the constraint line starts
												const endX = segmentCenter;
												const endY = 150;
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
															stroke="oklch(70.4% 0.04 256.788)"
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
															stroke="oklch(70.4% 0.04 256.788)"
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

							{/* Generator connecting lines */}
							{highlightedSegment &&
								segmentsState.includes(highlightedSegment) &&
								(() => {
									const segmentGenerators = generators
										.filter((generator) => generator.segments.includes(highlightedSegment.id) && generator.key)
										.map((generator) => {
											const generatorDef = generatorOptions.find((g: GeneratorType) => g.key === generator.key);
											return generatorDef || { key: generator.key || "", name: generator.label || generator.key || "Unknown" };
										});
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
												top: "38px",
												width: "100%",
												height: "120px",
												overflow: "visible",
											}}
										>
											{segmentGenerators.map((generator, idx, arr) => {
												const boxOffset = (idx - (arr.length - 1) / 2) * (generatorBoxWidth + 8);
												const boxCenterX = adjustedLeft + boxOffset;

												const startX = boxCenterX;
												const startY = 27;
												const endX = segmentCenter;
												const endY = 0;
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
															stroke="oklch(70.4% 0.04 256.788)"
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
															stroke="oklch(70.4% 0.04 256.788)"
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

					{/* Generators */}
					<div className="relative h-40 w-full">
						{segmentsState.map((segment) => {
							if (highlightedSegment?.id !== segment.id) return null;

							// find all generators that apply to this segment
							const segmentGenerators = generators
								.filter((generator) => generator.segments.includes(segment.id) && generator.key)
								.map((generator) => {
									const generatorDef = generatorOptions.find((g: GeneratorType) => g.key === generator.key);
									return generatorDef || { key: generator.key || "", name: generator.label || generator.key || "Unknown" };
								});
							if (segmentGenerators.length === 0) return null;
							const segmentPosition = segmentPositions.get(segment.id) || 0;
							const segmentLength = segment.length;
							const segmentCenter = 20 + segmentPosition * nucleotideWidth + (segmentLength * nucleotideWidth) / 2 - offset;
							if (segmentCenter < -100 || segmentCenter > visibleWidth + 100) return null;

							// calculate total width of generator boxes
							const generatorBoxWidth = 200;
							const totalWidth = segmentGenerators.length * generatorBoxWidth + (segmentGenerators.length - 1) * 8;
							const halfWidth = totalWidth / 2;

							// calculate adjusted position to keep boxes within container
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

			{/* Bottom buttons */}
			<NewButtons />

			{/* Floating dragged segment - rendered outside main container in a portal */}
			{isDragging && draggedSegment && (
				<Portal>
					<div
						className="fixed pointer-events-none"
						style={{
							left: `${dragMousePosition.x - (draggedSegment.length * baseWidth * zoomLevel + SEGMENT_ARROW_WIDTH) / 2}px`,
							top: `${dragMousePosition.y - 20}px`,
							width: `${draggedSegment.length * baseWidth * zoomLevel + SEGMENT_ARROW_WIDTH}px`,
							height: "40px",
							zIndex: 9999,
							transform: "scale(1.05)",
							filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
						}}
					>
						<SegmentComponent
							segment={draggedSegment}
							index={draggedSegmentIndex || 0}
							hoveredSegment={null}
							setHoveredSegment={() => {}}
							clickedSegment={null}
							setClickedSegment={() => {}}
							baseWidth={baseWidth}
							zoomLevel={zoomLevel}
							offset={0}
							position={0}
							isDragging={false}
							isAnySegmentDragging={isDragging}
							baseLeftOffset={0}
						/>
					</div>
				</Portal>
			)}
		</div>
	);
};

export default LinearViewer;
