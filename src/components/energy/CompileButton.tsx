import { Button } from "@/components/ui/button";
import { PlayFilledAlt } from "@carbon/icons-react";
import { useProgram } from "@/context/ProjectContext";
import { useGlobal } from "@/context/GlobalContext";
import { parseProgram } from "@/lib/utils/parser";
import { toast } from "sonner";

const CompileButton = () => {
	const { constructs, constraints, generators } = useProgram();
	const { currentProject, setProjectOutput } = useGlobal();

	const handleClick = async () => {
		if (!currentProject) {
			console.error("No project selected");
			return;
		}

		// Check for segments without generators
		const segmentsWithoutGenerators = [];
		for (const construct of constructs) {
			for (const segment of construct.segments || []) {
				if (!segment.generator || !segment.generator.key) {
					segmentsWithoutGenerators.push(segment);
				}
			}
		}

		// If any segments don't have generators, show error and return
		if (segmentsWithoutGenerators.length > 0) {
			segmentsWithoutGenerators.forEach((segment) => {
				toast.error(`${segment.label || "Segment " + segment.id} doesn't have a generator selected`);
			});
			return;
		}

		// Filter out constraints that are null or have no key
		const validConstraints = constraints.filter((constraint) => constraint && constraint.key);

		// Check if there are any valid constraints
		if (validConstraints.length === 0) {
			toast.error("At least one constraint is required for compilation");
			return;
		}

		try {
			const projectName = currentProject?.name || "untitled";
			const parsedProgram = parseProgram(constructs, validConstraints, generators, projectName);

			// Log the parsed program JSON
			console.log("——— PARSED PROGRAM ———\n", JSON.stringify(parsedProgram, null, 2));

			// send the parsed program to the FastAPI endpoint
			const response = await fetch("http://localhost:8000/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ gpl_data: parsedProgram }),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`API Error (${response.status}): ${errorText}`);
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log("✅ Program compiled successfully:", data);

			if (data.final_sequences && Array.isArray(data.final_sequences)) {
				const concatenatedSequence = data.final_sequences.join("");
				setProjectOutput(currentProject.id, concatenatedSequence);
			}
		} catch (error) {
			console.error("❌ Error compiling program:", error);
			toast.error("Error compiling program. See console for details.");
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
