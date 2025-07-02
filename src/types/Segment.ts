// a Segment is a part/subset of a Construct
export interface Segment {
	id: string;
	label?: string;
	type?: string;
	direction?: "forward" | "reverse";
	start: number;
	end: number;
	color?: string;
}
