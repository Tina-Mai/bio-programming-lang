import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";
import { useProgram } from "@/context/ProjectContext";
import { parseProgram } from "@/lib/utils/parser";

const CompileButton = () => {
	const { constructs, constraints, generators } = useProgram();

	const handleClick = () => {
		try {
			const parsedProgram = parseProgram(constructs, constraints, generators);
			console.log("——— COMPILED PROGRAM ———");
			console.log(JSON.stringify(parsedProgram, null, 2));
		} catch (error) {
			console.error("Error compiling program:", error);
		}
	};

	return (
		<Button onClick={handleClick} size="sm" className="w-min">
			<PlayFilledAlt />
			Compile
		</Button>
	);
};

export default CompileButton;
