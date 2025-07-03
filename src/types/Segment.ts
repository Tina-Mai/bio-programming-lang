// a Segment is a part/subset of a Construct
export interface Segment {
	id: string;
	length: number;
	label?: string;
	type?: string;
}

// Valid segment types
export type SegmentType = "CDS" | "promoter" | "terminator" | "RBS" | "spacer" | "origin" | "primer" | "misc";

// Color configuration for segment types
export const SEGMENT_COLORS: Record<SegmentType | "default", { fill: string; stroke: string }> = {
	CDS: {
		fill: "rgb(253 224 71 / 0.45)", // yellow
		stroke: "rgb(234 179 8 / 0.8)",
	},
	promoter: {
		fill: "rgb(167 243 208 / 0.45)", // emerald
		stroke: "rgb(52 211 153 / 0.8)",
	},
	terminator: {
		fill: "rgb(196 181 253 / 0.45)", // purple
		stroke: "rgb(147 114 243 / 0.8)",
	},
	RBS: {
		fill: "rgb(254 202 202 / 0.45)", // red
		stroke: "rgb(239 68 68 / 0.8)",
	},
	spacer: {
		fill: "rgb(229 231 235 / 0.45)", // gray
		stroke: "rgb(156 163 175 / 0.8)",
	},
	origin: {
		fill: "rgb(254 215 170 / 0.45)", // orange
		stroke: "rgb(251 146 60 / 0.8)",
	},
	primer: {
		fill: "rgb(219 234 254 / 0.45)", // sky blue
		stroke: "rgb(59 130 246 / 0.8)",
	},
	misc: {
		fill: "rgb(254 240 138 / 0.45)", // amber
		stroke: "rgb(251 191 36 / 0.8)",
	},
	default: {
		fill: "rgb(165 180 252 / 0.45)", // indigo
		stroke: "rgb(129 140 248 / 0.8)",
	},
};

// Utility function to get colors for a segment
export function getSegmentColors(segment: Segment): { fill: string; stroke: string } {
	const segmentType = segment.type as SegmentType;
	return SEGMENT_COLORS[segmentType] || SEGMENT_COLORS.default;
}

// Utility function to calculate segment pixel width
export function calculateSegmentPixelWidth(segment: Segment, nucleotideWidth: number): number {
	return segment.length * nucleotideWidth;
}

// Default arrow width for segment visualization
export const SEGMENT_ARROW_WIDTH = 12;
