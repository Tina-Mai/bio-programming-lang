// a Section is a part/subset of a Sequence
export interface Section {
	id: string;
	label?: string;
	type?: string;
	direction?: "forward" | "reverse";
	start: number;
	end: number;
	color?: string;
}
