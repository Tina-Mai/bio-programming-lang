export interface Annotation {
	text: string;
	type: string;
	direction: "forward" | "reverse";
	start: number;
	end: number;
	color?: string;
}
