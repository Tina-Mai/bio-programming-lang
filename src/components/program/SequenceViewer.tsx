import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Nucleotide, Sequence as SequenceType, nucleotideColors } from "@/types";
import { Copy, Checkmark, ChevronDown, ChevronUp } from "@carbon/icons-react";
import { Dna } from "lucide-react";
import { Button } from "@/components/ui/button";
import HelpTooltip from "@/components/global/HelpTooltip";
import { cn } from "@/lib/utils";

const SequenceKey = () => {
	return (
		<div className="horizontal gap-1.5 items-center justify-center text-[10px]">
			<div className="flex size-5 items-center justify-center rounded-xs text-foreground" style={{ backgroundColor: nucleotideColors.A }}>
				A
			</div>
			<div className="flex size-5 items-center justify-center rounded-xs text-foreground" style={{ backgroundColor: nucleotideColors.C }}>
				C
			</div>
			<div className="flex size-5 items-center justify-center rounded-xs text-foreground" style={{ backgroundColor: nucleotideColors.T }}>
				T
			</div>
			<div className="flex size-5 items-center justify-center rounded-xs text-foreground " style={{ backgroundColor: nucleotideColors.G }}>
				G
			</div>
		</div>
	);
};

const NucleotideTooltip = ({ tooltipPosition, hoveredNucleotide }: { tooltipPosition: { x: number; y: number }; hoveredNucleotide: { position: number; base: string } }) => {
	return (
		<div
			className={cn(
				"absolute z-50 max-w-xs whitespace-normal break-words origin-(--radix-tooltip-content-transform-origin) rounded bg-white/50 border border-slate-200 backdrop-blur-sm px-3 py-1.5 text-xs text-slate-400 shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none",
				"data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
			)}
			style={{
				left: `${tooltipPosition.x}px`,
				top: "0px",
				transform: "translate(-50%, -115%)",
			}}
		>
			<div className="w-full">
				<div className="flex items-center gap-1">
					<div>
						Position: <span className="font-mono text-black">{hoveredNucleotide.position}</span>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<div>
						Base: <span className="font-mono text-black">{hoveredNucleotide.base}</span>
					</div>
					<div className="flex size-2 rounded-full" style={{ backgroundColor: nucleotideColors[hoveredNucleotide.base as Nucleotide] }} />
				</div>
			</div>
		</div>
	);
};

const SequenceViewer = ({ sequence, showSequence, setShowSequence }: { sequence: SequenceType; showSequence: boolean; setShowSequence: (showSequence: boolean) => void }) => {
	const sequenceString: string = sequence?.sequence || "";
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const requestRef = useRef<number>(0);
	const zoomAnimationRef = useRef<{ stop: () => void } | null>(null);
	const lastHoveredPositionRef = useRef<number | null>(null);

	const [zoomLevel, setZoomLevel] = useState<number>(1);
	const [targetZoomLevel, setTargetZoomLevel] = useState<number>(1);
	const [offset, setOffset] = useState<number>(0);
	const [targetOffset, setTargetOffset] = useState<number>(0);
	const [isHovering, setIsHovering] = useState<boolean>(false);
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [lastMouseX, setLastMouseX] = useState<number>(0);
	const [dpr, setDpr] = useState<number>(1);
	const [hoveredNucleotide, setHoveredNucleotide] = useState<{ position: number; base: string } | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
	const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
	const [isCopied, setIsCopied] = useState<boolean>(false);

	const baseWidth = 10.1; // base nucleotide width at zoom level 1
	const nucleotideWidth = baseWidth * zoomLevel;
	const visibleWidth = containerRef.current?.clientWidth || 0;

	useEffect(() => {
		setDpr(window.devicePixelRatio || 1);
	}, []);

	// calculate zoom level based on container width and sequence length
	const calculateMinZoomLevel = useCallback(() => {
		const container = containerRef.current;
		if (!container || !sequenceString) return 0.1;
		return Math.max(0.1, container.clientWidth / (sequenceString.length * baseWidth));
	}, [sequenceString, baseWidth]);

	// animate zoom level and offset with subtle animation
	useEffect(() => {
		if (zoomLevel === targetZoomLevel && offset === targetOffset) return;
		if (zoomAnimationRef.current) {
			zoomAnimationRef.current.stop();
		}
		setZoomLevel(targetZoomLevel);
		setOffset(targetOffset);
	}, [targetZoomLevel, targetOffset, zoomLevel, offset]);

	// handle scrolling and zooming
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			if (!isHovering) return;

			e.preventDefault();

			if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				const scrollAmount = e.deltaX || e.deltaY;
				const newOffset = Math.max(0, Math.min(sequenceString.length * nucleotideWidth - visibleWidth, offset + scrollAmount));
				setOffset(newOffset);
				setTargetOffset(newOffset);
				return;
			}

			const minZoomLevel = calculateMinZoomLevel();
			const direction = e.deltaY < 0 ? 1 : -1;
			const zoomFactor = 0.1;
			const newZoomLevel = Math.max(minZoomLevel, Math.min(10, zoomLevel + direction * zoomFactor));

			if (newZoomLevel === zoomLevel) return;

			const rect = canvasRef.current?.getBoundingClientRect();
			if (!rect) return;

			const cursorXRelativeToViewport = e.clientX - rect.left;
			const cursorXRelativeToContent = cursorXRelativeToViewport + offset;
			const cursorRatio = cursorXRelativeToContent / (sequenceString.length * nucleotideWidth);
			const newContentWidth = sequenceString.length * baseWidth * newZoomLevel;
			const newOffset = cursorRatio * newContentWidth - cursorXRelativeToViewport;
			const clampedNewOffset = Math.max(0, Math.min(newContentWidth - visibleWidth, newOffset));

			setTargetZoomLevel(newZoomLevel);
			setTargetOffset(clampedNewOffset);
		},
		[isHovering, zoomLevel, offset, sequenceString, nucleotideWidth, baseWidth, visibleWidth, calculateMinZoomLevel]
	);

	// get nucleotide at position
	const getNucleotideAtPosition = useCallback(
		(x: number, y: number) => {
			const canvas = canvasRef.current;
			if (!canvas || !sequenceString) return null;
			const height = (canvas.height * 0.65) / dpr;
			if (y < 0 || y > height) return null;
			const nucleotideIndex = Math.floor((x + offset) / nucleotideWidth);
			if (nucleotideIndex < 0 || nucleotideIndex >= sequenceString.length) return null;

			return {
				position: nucleotideIndex,
				base: sequenceString[nucleotideIndex],
				x: nucleotideIndex * nucleotideWidth - offset + nucleotideWidth / 2,
				y: 5,
			};
		},
		[sequenceString, offset, nucleotideWidth, dpr]
	);

	const updateTooltip = useCallback(
		(nucleotide: { position: number; base: string; x: number; y: number } | null) => {
			if (!nucleotide) {
				if (tooltipOpen) {
					setTooltipOpen(false);
				}
				if (hoveredNucleotide) {
					setHoveredNucleotide(null);
				}
				if (tooltipPosition) {
					setTooltipPosition(null);
				}
				lastHoveredPositionRef.current = null;
				return;
			}

			if (lastHoveredPositionRef.current === nucleotide.position) {
				if (!tooltipOpen) {
					setTooltipOpen(true);
				}
				return;
			}

			lastHoveredPositionRef.current = nucleotide.position;
			setTooltipPosition({
				x: nucleotide.x,
				y: nucleotide.y,
			});
			setHoveredNucleotide(nucleotide);
			setTooltipOpen(true);
		},
		[tooltipOpen, hoveredNucleotide, tooltipPosition]
	);

	// handle mouse down to start dragging
	const handleMouseDown = useCallback(
		(e: MouseEvent) => {
			if (!isHovering) return;
			setIsDragging(true);
			setLastMouseX(e.clientX);
			setTooltipOpen(false);
		},
		[isHovering]
	);

	// handle mouse move to scroll horizontally while dragging
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			if (isDragging) {
				if (tooltipOpen) {
					setTooltipOpen(false);
				}

				const deltaX = e.clientX - lastMouseX;
				const newOffset = Math.max(0, Math.min(sequenceString.length * nucleotideWidth - visibleWidth, offset - deltaX));
				setOffset(newOffset);
				setTargetOffset(newOffset);
				setLastMouseX(e.clientX);
				return;
			}

			const nucleotide = getNucleotideAtPosition(x, y);
			updateTooltip(nucleotide);
		},
		[isDragging, lastMouseX, offset, sequenceString, nucleotideWidth, visibleWidth, getNucleotideAtPosition, updateTooltip, tooltipOpen]
	);

	// handle mouse up to stop dragging
	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// handle mouse enter/leave
	const handleMouseEnter = useCallback(() => {
		setIsHovering(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovering(false);
		setIsDragging(false);
		setHoveredNucleotide(null);
		setTooltipPosition(null);
		setTooltipOpen(false);
		lastHoveredPositionRef.current = null;
	}, []);

	// draw sequence and ruler with proper colors, fonts, sizes, etc.
	const drawSequence = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx2d = canvas.getContext("2d");
		if (!ctx2d) return;

		// if sequence is empty, display a message
		if (!sequenceString || sequenceString.length === 0) {
			const logicalWidth = canvas.width / dpr;
			const logicalHeight = canvas.height / dpr;

			ctx2d.clearRect(0, 0, logicalWidth, logicalHeight);
			ctx2d.fillStyle = "#f5f5f5";
			ctx2d.fillRect(0, 0, logicalWidth, logicalHeight);

			ctx2d.fillStyle = "#333333";
			ctx2d.textAlign = "center";
			ctx2d.textBaseline = "middle";
			ctx2d.font = "14px sans-serif";
			ctx2d.fillText("No sequence data available", logicalWidth / 2, logicalHeight / 2);
			return;
		}

		const monoFont = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "IBM Plex Mono, monospace";
		const sansFont = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim() || "Favorit, sans-serif";
		const logicalWidth = canvas.width / dpr;
		const logicalHeight = canvas.height / dpr;
		const height = logicalHeight * 0.55; // nucleotide height %
		const rulerHeight = logicalHeight * 0.45; // ruler height %

		ctx2d.clearRect(0, 0, logicalWidth, logicalHeight);

		const startIndex = Math.floor(offset / nucleotideWidth);
		const endIndex = Math.ceil((offset + visibleWidth) / nucleotideWidth);
		const visibleRange = Math.min(sequenceString.length, endIndex) - startIndex;

		// draw nucleotides
		for (let i = startIndex; i < startIndex + visibleRange; i++) {
			if (i >= sequenceString.length) break;

			const nucleotide = sequenceString[i];
			if (!nucleotide) continue;

			const x = i * nucleotideWidth - offset;
			const bgColor = nucleotideColors[nucleotide as Nucleotide] || "#DCDEE2";

			ctx2d.fillStyle = bgColor;
			ctx2d.fillRect(x, 0, nucleotideWidth, height);

			const fadeThreshold = 10;
			let textOpacity = 1;

			if (nucleotideWidth < fadeThreshold) {
				textOpacity = nucleotideWidth / fadeThreshold;
			}

			if (nucleotideWidth > 5) {
				ctx2d.fillStyle = `rgba(0, 0, 0, ${textOpacity})`;
				ctx2d.textAlign = "center";
				ctx2d.textBaseline = "middle";
				ctx2d.font = `${Math.min(12, nucleotideWidth * 0.6)}px ${monoFont}`;
				ctx2d.fillText(nucleotide, x + nucleotideWidth / 2, height / 2);
			}

			// draw grid lines with opacity
			const gridOpacity = Math.min(1, nucleotideWidth / 5);
			ctx2d.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
			ctx2d.beginPath();
			ctx2d.moveTo(x + nucleotideWidth, 0);
			ctx2d.lineTo(x + nucleotideWidth, height);
			ctx2d.stroke();
		}

		// draw ruler
		ctx2d.strokeStyle = "#333333";
		ctx2d.fillStyle = "#333333";
		ctx2d.textAlign = "center";
		ctx2d.font = `10px ${sansFont}`;

		const tickSpacing = zoomLevel < 0.5 ? 100 : zoomLevel < 1 ? 50 : zoomLevel < 3 ? 10 : 5;

		for (let i = Math.floor(startIndex / tickSpacing) * tickSpacing; i < startIndex + visibleRange; i += tickSpacing) {
			if (i >= sequenceString.length || i < 0) continue;
			const x = i * nucleotideWidth - offset;
			ctx2d.beginPath();
			ctx2d.moveTo(x, height);
			ctx2d.lineTo(x, height + rulerHeight * 0.3);
			ctx2d.stroke();
			ctx2d.fillText(i.toString(), x, height + rulerHeight * 0.7);
		}
	}, [nucleotideWidth, offset, sequenceString, visibleWidth, zoomLevel, dpr]);

	// animate rendering
	const animateRender = useCallback(() => {
		drawSequence();
		requestRef.current = requestAnimationFrame(animateRender);
	}, [drawSequence]);

	// set up canvas
	const setupCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const devicePixelRatio = window.devicePixelRatio || 1;
		const width = container.clientWidth;
		const height = container.clientHeight;

		canvas.width = width * devicePixelRatio;
		canvas.height = height * devicePixelRatio;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(devicePixelRatio, devicePixelRatio);
		}

		return { width, height };
	}, []);

	// initial setup and cleanup
	useEffect(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		setupCanvas();
		const initialZoomLevel = calculateMinZoomLevel();
		if (zoomLevel < initialZoomLevel) {
			setZoomLevel(initialZoomLevel);
			setTargetZoomLevel(initialZoomLevel);
		}

		container.addEventListener("wheel", handleWheel, { passive: false });
		container.addEventListener("mouseenter", handleMouseEnter);
		container.addEventListener("mouseleave", handleMouseLeave);
		container.addEventListener("mousedown", handleMouseDown);
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);

		requestRef.current = requestAnimationFrame(animateRender);

		// Capture the current animation reference for cleanup
		const currentAnimation = zoomAnimationRef.current;

		return () => {
			container.removeEventListener("wheel", handleWheel);
			container.removeEventListener("mouseenter", handleMouseEnter);
			container.removeEventListener("mouseleave", handleMouseLeave);
			container.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);

			cancelAnimationFrame(requestRef.current);

			if (currentAnimation) {
				currentAnimation.stop();
			}
		};
	}, [handleWheel, animateRender, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleMouseEnter, calculateMinZoomLevel, zoomLevel, setupCanvas]);

	// handle window resize
	useEffect(() => {
		const handleResize = () => {
			setupCanvas();
			const minZoomLevel = calculateMinZoomLevel();
			if (zoomLevel < minZoomLevel) {
				setZoomLevel(minZoomLevel);
				setTargetZoomLevel(minZoomLevel);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [calculateMinZoomLevel, zoomLevel, setupCanvas]);

	// handle device pixel ratio changes
	useEffect(() => {
		const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);

		const handleDprChange = () => {
			setDpr(window.devicePixelRatio || 1);
			setupCanvas();
		};

		mediaQuery.addEventListener("change", handleDprChange);
		return () => mediaQuery.removeEventListener("change", handleDprChange);
	}, [dpr, setupCanvas]);

	return (
		<div className="vertical w-full gap-5">
			<div className="flex justify-between items-center px-5">
				{/* left content */}
				<div className="horizontal gap-1.5 items-center text-sm">
					<div className="flex horizontal items-center gap-1.5 text-slate-400 ">
						<Dna className="size-5" strokeWidth={1.3} />
						<div className="font-medium text-slate-500">Sequence</div>
					</div>{" "}
					<span className="font-mono text-slate-400">{!sequenceString || sequenceString.length === 0 ? "(No data)" : `(${sequenceString.length} bp)`}</span>
					{/* copy button */}
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => {
							navigator.clipboard.writeText(sequenceString);
							setIsCopied(true);
							setTimeout(() => setIsCopied(false), 2000);
						}}
						className="text-slate-400 relative"
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: isCopied ? 1 : 0, scale: isCopied ? 1 : 0.8 }}
							transition={{ duration: 0.2 }}
							className="absolute inset-0 flex items-center justify-center gap-1"
						>
							<Checkmark size={16} />
						</motion.div>
						<motion.div
							initial={{ opacity: 1, scale: 1 }}
							animate={{ opacity: isCopied ? 0 : 1, scale: isCopied ? 0.8 : 1 }}
							transition={{ duration: 0.2 }}
							className="flex items-center justify-center"
						>
							<Copy size={16} />
						</motion.div>
					</Button>
				</div>

				{/* right content */}
				<motion.div className="horizontal gap-3 text-xs text-slate-400 items-center" animate={{ opacity: 1 }} initial={{ opacity: 0 }} transition={{ duration: 0.3 }}>
					<div>
						Zoom: <span className="font-mono">{zoomLevel.toFixed(1)}</span>x
					</div>
					<div>
						Position: <span className="font-mono">{Math.floor(offset / nucleotideWidth)}</span>
					</div>
					<HelpTooltip>
						<div className="vertical gap-2 items-start">
							<SequenceKey />
							Use mouse or trackpad to zoom and pan
						</div>
					</HelpTooltip>
					{showSequence ? (
						<ChevronDown size={20} className="hover:text-slate-700 cursor-pointer" onClick={() => setShowSequence(!showSequence)} />
					) : (
						<ChevronUp size={20} className="hover:text-slate-700 cursor-pointer" onClick={() => setShowSequence(!showSequence)} />
					)}
				</motion.div>
			</div>

			{/* canvas */}
			<motion.div
				ref={containerRef}
				className="w-full h-14 pb-1 relative"
				style={{
					touchAction: "none",
					cursor: isDragging ? "grabbing" : "grab",
				}}
				whileHover={{ borderColor: "#ddd" }}
				whileTap={{ scale: 0.995 }}
				animate={{ opacity: 1 }}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.3 }}
			>
				<canvas ref={canvasRef} className="w-full h-full" />
				{tooltipOpen && hoveredNucleotide && tooltipPosition && <NucleotideTooltip tooltipPosition={tooltipPosition} hoveredNucleotide={hoveredNucleotide} />}
			</motion.div>
		</div>
	);
};

export default SequenceViewer;
