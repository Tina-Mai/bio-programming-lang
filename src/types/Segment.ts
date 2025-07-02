// a Segment is a part/subset of a Construct
export interface Segment {
	id: string;
	length: number;
	label?: string;
	type?: string;
}
