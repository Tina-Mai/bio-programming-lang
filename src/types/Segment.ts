// a Segment is a part/subset of a Construct
export interface Segment {
	id: string;
	length: number;
	label?: string;
	type?: string;
	created_at: string;
	updated_at?: string;
}

// TODO: special segment types
export type SegmentType = "CDS" | "promoter" | "terminator";

// TODO: color for each segment type
export const SEGMENT_COLORS: Record<SegmentType | "default", { fill: string; stroke: string; highlight: string }> = {
	default: {
		fill: "oklch(0.9582 0.0183 269.09)",
		stroke: "oklch(0.6635 0.0982 267.74 / 0.6)",
		highlight: "oklch(0.6635 0.0982 267.74)",
		// fill: "oklch(0.9601 0.0103 261.79)",
		// stroke: "oklch(0.6635 0.0982 267.74 / 0.6)",
		// highlight: "oklch(0.6635 0.0982 267.74)",
	},
	CDS: {
		fill: "rgb(253 224 71 / 0.45)", // yellow
		stroke: "rgb(234 179 8 / 0.8)",
		highlight: "rgb(234 179 8 / 0.8)",
	},
	promoter: {
		fill: "rgb(167 243 208 / 0.45)", // emerald
		stroke: "rgb(52 211 153 / 0.8)",
		highlight: "rgb(52 211 153 / 0.8)",
	},
	terminator: {
		fill: "rgb(196 181 253 / 0.45)", // purple
		stroke: "rgb(147 114 243 / 0.8)",
		highlight: "rgb(147 114 243 / 0.8)",
	},
};

// get colors for a segment
export function getSegmentColors(segment: Segment): { fill: string; stroke: string; highlight: string } {
	const segmentType = segment.type as SegmentType;
	return SEGMENT_COLORS[segmentType] || SEGMENT_COLORS.default;
}

// calculate segment pixel width
export function calculateSegmentPixelWidth(segment: Segment, nucleotideWidth: number): number {
	return segment.length * nucleotideWidth;
}

// default arrow width for segment visualization
export const SEGMENT_ARROW_WIDTH = 12;
