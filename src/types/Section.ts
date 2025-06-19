// a Section is a part/subset of a Sequence
export interface Section {
	text: string;
	type?: string;
	direction?: "forward" | "reverse";
	start: number;
	end: number;
	color?: string;
}
